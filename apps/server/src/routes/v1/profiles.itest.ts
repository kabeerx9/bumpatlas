import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

type App = Awaited<ReturnType<typeof createApp>>;

async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
    },
  });
}

async function onboard(app: App, clerkId: string) {
  await app.inject({
    method: "POST",
    url: "/api/v1/consents",
    headers: asUser(clerkId),
    payload: { type: "age_attestation", version: "2026-07-01" },
  });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: "Household" },
  });
  return response.json().id as string;
}

const addChild = (app: App, clerkId: string, displayName: string, dateOfBirth: string) =>
  app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName, dateOfBirth },
  });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("children", () => {
  it("creates a child and returns it as the active one", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.displayName, "Ava");
    assert.equal(body.dateOfBirth, "2026-05-01");
    assert.equal(body.isActive, true);
    assert.equal(body.archivedAt, null);
    await app.close();
  });

  it("rejects a future date of birth", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await addChild(app, "clerk_owner", "Ava", "2099-01-01");

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("rejects an absurdly old date of birth", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await addChild(app, "clerk_owner", "Ava", "1823-01-01");

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("lists children youngest first", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.json().map((child: { displayName: string }) => child.displayName),
      ["Younger", "Elder"],
    );
    await app.close();
  });

  it("enforces the free child limit on creation but never on reads", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await addChild(app, "clerk_owner", "One", "2024-01-01");
    await addChild(app, "clerk_owner", "Two", "2026-05-01");

    const third = await addChild(app, "clerk_owner", "Three", "2026-06-01");

    assert.equal(third.statusCode, 422);
    assert.equal(third.json().error.code, "CHILD_LIMIT_REACHED");
    assert.equal(third.json().error.details.upgradeAvailable, true);

    // Reading existing children must keep working at the limit.
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });
    assert.equal(list.json().length, 2);
    await app.close();
  });

  it("switches active child for the caller only", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const invite = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "PARENT" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });

    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    const activate = await app.inject({
      method: "POST",
      url: `/api/v1/children/${elder.json().id}/activate`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(activate.statusCode, 200);

    const ownerStage = await app.inject({
      method: "GET",
      url: "/api/v1/stage",
      headers: asUser("clerk_owner"),
    });
    const partnerStage = await app.inject({
      method: "GET",
      url: "/api/v1/stage",
      headers: asUser("clerk_partner"),
    });

    // Co-parents legitimately hold different child context.
    assert.equal(ownerStage.json().childDisplayName, "Elder");
    assert.equal(partnerStage.json().childDisplayName, "Younger");
    await app.close();
  });

  it("refuses to activate an archived child", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    await app.inject({
      method: "PATCH",
      url: `/api/v1/children/${elder.json().id}/archive`,
      headers: asUser("clerk_owner"),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/children/${elder.json().id}/activate`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "CHILD_ARCHIVED");
    await app.close();
  });

  it("clears every member's pointer when a child is archived", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    const younger = await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    await app.inject({
      method: "POST",
      url: `/api/v1/children/${elder.json().id}/activate`,
      headers: asUser("clerk_owner"),
    });
    await app.inject({
      method: "PATCH",
      url: `/api/v1/children/${elder.json().id}/archive`,
      headers: asUser("clerk_owner"),
    });

    const stage = await app.inject({
      method: "GET",
      url: "/api/v1/stage",
      headers: asUser("clerk_owner"),
    });

    assert.equal(stage.json().activeChildId, younger.json().id);
    await app.close();
  });

  it("refuses to archive the last child when there is no pregnancy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const only = await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/children/${only.json().id}/archive`,
      headers: asUser("clerk_owner"),
    });

    // Otherwise the household is left with no stage context at all.
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "LAST_CHILD_CANNOT_BE_ARCHIVED");
    await app.close();
  });

  it("excludes archived children from the default list", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");
    await app.inject({
      method: "PATCH",
      url: `/api/v1/children/${elder.json().id}/archive`,
      headers: asUser("clerk_owner"),
    });

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });
    const withArchived = await app.inject({
      method: "GET",
      url: "/api/v1/children?includeArchived=true",
      headers: asUser("clerk_owner"),
    });

    assert.equal(listed.json().length, 1);
    assert.equal(withArchived.json().length, 2);
    await app.close();
  });

  it("refuses to read or edit another household's child", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const theirChild = await addChild(app, "clerk_b", "Theirs", "2026-05-01");

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/children/${theirChild.json().id}`,
      headers: asUser("clerk_a"),
      payload: { displayName: "Renamed" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "CHILD_NOT_FOUND");
    await app.close();
  });
});

describe("pregnancy", () => {
  const createPregnancy = (app: App, clerkId: string, dueDate: string) =>
    app.inject({
      method: "POST",
      url: "/api/v1/pregnancies",
      headers: asUser(clerkId),
      payload: { dueDate },
    });

  it("creates a pregnancy and reports the gestational week", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const dueDate = new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10);
    const response = await createPregnancy(app, "clerk_owner", dueDate);

    assert.equal(response.statusCode, 201);
    // 70 days out means 210 days elapsed — 30 completed weeks.
    assert.equal(response.json().gestationalWeek, 30);
    await app.close();
  });

  it("refuses a second active pregnancy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const dueDate = new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10);
    await createPregnancy(app, "clerk_owner", dueDate);

    const second = await createPregnancy(app, "clerk_owner", dueDate);

    assert.equal(second.statusCode, 409);
    assert.equal(second.json().error.code, "PREGNANCY_ALREADY_ACTIVE");
    await app.close();
  });

  it("puts pregnancy ahead of an existing child in the stage", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await addChild(app, "clerk_owner", "Toddler", "2024-01-01");
    const dueDate = new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10);
    await createPregnancy(app, "clerk_owner", dueDate);

    const stage = await app.inject({
      method: "GET",
      url: "/api/v1/stage",
      headers: asUser("clerk_owner"),
    });

    assert.equal(stage.json().stageMode, "pregnancy");
    assert.equal(stage.json().gestationalWeek, 30);
    await app.close();
  });

  it("converts a single baby and keeps the released response shape", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies/current/convert",
      headers: asUser("clerk_owner"),
      payload: { childName: "Ava", birthDate: "2026-07-29" },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    // Top-level child fields are what the shipped convert screen parses.
    assert.equal(body.displayName, "Ava");
    assert.equal(body.birthOrder, 0);
    assert.equal(body.children.length, 1);
    await app.close();
  });

  it("converts twins from one pregnancy without hitting the child limit", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    // Household already at the free limit of 2.
    await addChild(app, "clerk_owner", "One", "2023-01-01");
    await addChild(app, "clerk_owner", "Two", "2024-01-01");
    await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies/current/convert",
      headers: asUser("clerk_owner"),
      payload: {
        birthDate: "2026-07-29",
        babies: [{ displayName: "Twin A" }, { displayName: "Twin B" }],
      },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.children.length, 2);
    // Deterministic sibling ordering for a shared birth date.
    assert.deepEqual(
      body.children.map((child: { birthOrder: number }) => child.birthOrder),
      [0, 1],
    );
    assert.equal(body.displayName, "Twin A");
    await app.close();
  });

  it("keeps twin resolution stable across repeated stage reads", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );
    await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies/current/convert",
      headers: asUser("clerk_owner"),
      payload: {
        birthDate: "2026-07-29",
        babies: [{ displayName: "Twin A" }, { displayName: "Twin B" }],
      },
    });

    const first = await app.inject({ method: "GET", url: "/api/v1/stage", headers: asUser("clerk_owner") });
    const second = await app.inject({ method: "GET", url: "/api/v1/stage", headers: asUser("clerk_owner") });

    assert.equal(first.json().activeChildId, second.json().activeChildId);
    assert.equal(first.json().childDisplayName, "Twin A");
    await app.close();
  });

  it("refuses to convert the same pregnancy twice", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );
    const pregnancy = await prisma.pregnancyProfile.findFirstOrThrow();

    await app.inject({
      method: "POST",
      url: `/api/v1/pregnancies/${pregnancy.id}/convert`,
      headers: asUser("clerk_owner"),
      payload: { childName: "Ava", birthDate: "2026-07-29" },
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/pregnancies/${pregnancy.id}/convert`,
      headers: asUser("clerk_owner"),
      payload: { childName: "Ava", birthDate: "2026-07-29" },
    });

    assert.equal(second.statusCode, 409);
    assert.equal(second.json().error.code, "PREGNANCY_ALREADY_CONVERTED");
    assert.equal(await prisma.childProfile.count(), 1);
    await app.close();
  });

  it("frees the active slot so a later pregnancy can be recorded", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );
    await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies/current/convert",
      headers: asUser("clerk_owner"),
      payload: { childName: "Ava", birthDate: "2026-07-29" },
    });

    const next = await createPregnancy(
      app,
      "clerk_owner",
      new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10),
    );

    assert.equal(next.statusCode, 201);
    await app.close();
  });

  it("refuses to convert another household's pregnancy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    await createPregnancy(
      app,
      "clerk_b",
      new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    );
    const theirs = await prisma.pregnancyProfile.findFirstOrThrow();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/pregnancies/${theirs.id}/convert`,
      headers: asUser("clerk_a"),
      payload: { childName: "Stolen", birthDate: "2026-07-29" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(await prisma.childProfile.count(), 0);
    await app.close();
  });
});

describe("preferences", () => {
  it("persists goal and time zone", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/preferences",
      headers: asUser("clerk_owner"),
      payload: { primaryGoal: "MEMORIES", timeZone: "Asia/Kolkata" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().primaryGoal, "MEMORIES");
    assert.equal(response.json().timeZone, "Asia/Kolkata");
    await app.close();
  });

  it("rejects an invalid time zone", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/preferences",
      headers: asUser("clerk_owner"),
      payload: { timeZone: "Mars/Olympus_Mons" },
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("rejects activeChildId here instead of ignoring it", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const child = await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/preferences",
      headers: asUser("clerk_owner"),
      payload: { activeChildId: child.json().id },
    });

    // Silently stripping it would leave the client believing it switched context.
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "UNSUPPORTED_FIELD");
    assert.equal(response.json().error.details.useInstead, "POST /api/v1/children/:id/activate");
    await app.close();
  });

  it("marks onboarding complete only once the account is usable", async () => {
    const app = await createApp();

    // Attestation + family exist, but no policy consents and no child yet.
    await onboard(app, "clerk_owner");
    let user = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_owner" } });
    assert.equal(user.onboardingCompletedAt, null);

    for (const type of ["terms", "privacy"]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/consents",
        headers: asUser("clerk_owner"),
        payload: { type, version: "2026-07-01" },
      });
    }
    user = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_owner" } });
    assert.equal(user.onboardingCompletedAt, null, "still needs a child or pregnancy");

    await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    user = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_owner" } });
    assert.ok(user.onboardingCompletedAt);

    const events = await prisma.productEvent.count({ where: { name: "ONBOARDING_COMPLETED" } });
    assert.equal(events, 1, "the funnel event must fire exactly once");
    await app.close();
  });
});
