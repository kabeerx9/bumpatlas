import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerMemoryRoutes } from "@/routes/v1/memories";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { registerPublicRecapRoutes, registerRecapRoutes } from "@/routes/v1/recaps";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";
import { createFakeSigner } from "@/test/helpers/storage";

type App = Awaited<ReturnType<typeof createApp>>;

async function createApp() {
  const storage = createFakeSigner();

  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerMemoryRoutes, {
        requireAuth: testRequireAuth,
        getSigner: storage.getSigner,
      });
      fastify.register(registerRecapRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPublicRecapRoutes);
    },
  });
}

async function onboard(app: App, clerkId: string, childName = "Ava") {
  await app.inject({
    method: "POST",
    url: "/api/v1/consents",
    headers: asUser(clerkId),
    payload: { type: "age_attestation", version: "2026-07-01" },
  });
  const family = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: `${childName}'s household` },
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName: childName, dateOfBirth: "2026-05-01" },
  });
  return family.json().id as string;
}

/** Event dates inside the current week, so the recap picks them up. */
function thisWeekDates(count: number): string[] {
  const now = new Date();
  const day = now.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - offset);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + Math.min(index, offset));
    return date.toISOString().slice(0, 10);
  });
}

async function addMemories(app: App, clerkId: string, familyId: string, titles: string[]) {
  const dates = thisWeekDates(titles.length);

  for (const [index, title] of titles.entries()) {
    await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: asUser(clerkId),
      payload: { familyId, body: title, eventDate: dates[index] },
    });
  }
}

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("GET /api/v1/recaps/current", () => {
  it("generates on demand when cron has not run", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await addMemories(app, "clerk_owner", familyId, ["First smile", "Park stroll", "Funny hiccups"]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.eligible, true);
    assert.equal(body.highlights.length, 3);
    assert.equal(body.childDisplayName, "Ava");
    await app.close();
  });

  it("is idempotent — repeated reads reuse one row", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await addMemories(app, "clerk_owner", familyId, ["One", "Two", "Three"]);

    const first = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_owner"),
    });
    const second = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_owner"),
    });

    assert.equal(second.json().id, first.json().id);
    assert.equal(await prisma.weeklyRecap.count(), 1);
    await app.close();
  });

  it("reports ineligible for a quiet week without failing", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await addMemories(app, "clerk_owner", familyId, ["Only one"]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().eligible, false);
    await app.close();
  });

  it("draws from every child's memories without ranking siblings", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    const elder = await app.inject({
      method: "POST",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
      payload: { displayName: "Elder", dateOfBirth: "2023-01-01" },
    });
    const dates = thisWeekDates(3);

    await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: asUser("clerk_owner"),
      payload: {
        familyId,
        body: "About elder",
        eventDate: dates[0],
        childId: elder.json().id,
      },
    });
    await addMemories(app, "clerk_owner", familyId, ["About baby", "Household moment"]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_owner"),
    });

    const highlights = response.json().highlights;

    // One household recap covering both children.
    assert.equal(highlights.length, 3);
    assert.ok(highlights.includes("About elder"));
    assert.ok(highlights.includes("About baby"));
    await app.close();
  });

  it("refuses a caller with no household", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_nobody"),
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("never returns another household's recap", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a", "Ada");
    const otherFamilyId = await onboard(app, "clerk_b", "Bea");
    await addMemories(app, "clerk_b", otherFamilyId, [
      "Their first smile",
      "Their walk",
      "Their bath",
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recaps/current",
      headers: asUser("clerk_a"),
    });

    assert.equal(response.json().highlights.length, 0);
    assert.equal(response.body.includes("Their first smile"), false);
    await app.close();
  });
});

describe("recap sharing", () => {
  async function shareable(app: App) {
    const familyId = await onboard(app, "clerk_owner");
    await addMemories(app, "clerk_owner", familyId, [
      "First smile",
      "Park stroll",
      "Funny hiccups",
    ]);

    const link = await app.inject({
      method: "POST",
      url: "/api/v1/recaps/current/share-link",
      headers: asUser("clerk_owner"),
    });

    return link;
  }

  it("returns a link and stores only the token hash", async () => {
    const app = await createApp();

    const link = await shareable(app);

    assert.equal(link.statusCode, 201);
    const token = link.json().token;
    const stored = await prisma.recapShareToken.findFirstOrThrow();

    assert.notEqual(stored.tokenHash, token);
    assert.equal(stored.tokenHash.length, 64);
    await app.close();
  });

  it("serves a privacy-allowlisted public payload", async () => {
    const app = await createApp();
    const link = await shareable(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/public/recaps/${link.json().token}`,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.ok(body.weekLabel);
    assert.equal(body.highlights.length, 3);
    // The shared payload never carries a child's name.
    assert.equal(body.childDisplayName, null);
    assert.equal(response.body.includes("Ava"), false);
    // Nor identifiers, dates of birth, or member detail. The household is named
    // "Ava's household" on purpose here: a family name would leak the child's name.
    assert.equal("id" in body, false);
    assert.equal("childId" in body, false);
    assert.equal("familyName" in body, false);
    assert.equal(response.body.includes("2026-05-01"), false);
    await app.close();
  });

  it("needs no authentication, and is not proxy-cacheable", async () => {
    const app = await createApp();
    const link = await shareable(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/public/recaps/${link.json().token}`,
    });

    assert.equal(response.statusCode, 200);
    // The URL is the credential, so a shared cache must not keep it.
    assert.equal(response.headers["cache-control"], "private, no-store");
    await app.close();
  });

  it("rejects an unknown token", async () => {
    const app = await createApp();
    await shareable(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/public/recaps/not-a-real-token",
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("rejects an expired link", async () => {
    const app = await createApp();
    const link = await shareable(app);
    await prisma.recapShareToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/public/recaps/${link.json().token}`,
    });

    assert.equal(response.statusCode, 410);
    assert.equal(response.json().error.code, "RECAP_LINK_EXPIRED");
    await app.close();
  });

  it("rejects a revoked link", async () => {
    const app = await createApp();
    const link = await shareable(app);

    await app.inject({
      method: "DELETE",
      url: "/api/v1/recaps/current/share-link",
      headers: asUser("clerk_owner"),
    });
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/public/recaps/${link.json().token}`,
    });

    assert.equal(response.statusCode, 410);
    assert.equal(response.json().error.code, "RECAP_LINK_REVOKED");
    await app.close();
  });

  it("counts views without recording who viewed", async () => {
    const app = await createApp();
    const link = await shareable(app);

    await app.inject({ method: "GET", url: `/api/v1/public/recaps/${link.json().token}` });
    await app.inject({ method: "GET", url: `/api/v1/public/recaps/${link.json().token}` });

    const stored = await prisma.recapShareToken.findFirstOrThrow();
    assert.equal(stored.viewCount, 2);
    await app.close();
  });
});
