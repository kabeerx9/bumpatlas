import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerAdminRoutes } from "@/routes/v1/admin";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

type App = Awaited<ReturnType<typeof createApp>>;

/** Matches ADMIN_USER_IDS in .env.test. */
const ADMIN_CLERK_ID = "clerk_admin_fixture";

const DAY_MS = 86_400_000;

async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerAdminRoutes, { requireAuth: testRequireAuth });
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
  const family = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: "Household" },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { clerkId } });

  return { userId: user.id, familyId: family.json().id as string };
}

const getMetrics = (app: App, clerkId: string) =>
  app.inject({ method: "GET", url: "/api/v1/admin/metrics", headers: asUser(clerkId) });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("GET /api/v1/admin/metrics", () => {
  it("is cloaked: non-admin gets the ROUTE_NOT_FOUND envelope", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");

    const response = await getMetrics(app, "clerk_a");

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "ROUTE_NOT_FOUND");
    await app.close();
  });

  it("requires authentication", async () => {
    const app = await createApp();

    const response = await app.inject({ method: "GET", url: "/api/v1/admin/metrics" });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("returns totals matching the seeded fixtures", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");

    await app.inject({
      method: "POST",
      url: "/api/v1/children",
      headers: asUser("clerk_a"),
      payload: { displayName: "Ava", dateOfBirth: "2026-05-01" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies",
      headers: asUser("clerk_b"),
      payload: { dueDate: "2026-12-01" },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID);

    assert.equal(response.statusCode, 200);
    // Three users: the two onboarded plus the admin caller, provisioned
    // just-in-time by requireAuth on this very request.
    assert.deepEqual(response.json().totals, {
      users: 3,
      families: 2,
      children: 1,
      pregnancies: 1,
    });
    // Nobody created anything yet — the admin's own read is not activity.
    assert.deepEqual(response.json().activeUsers, { last1d: 0, last7d: 0, last30d: 0 });
    await app.close();
  });

  it("counts distinct creators per window, not events", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");
    const b = await onboard(app, "clerk_b");

    // User A: two creations inside the last day — must count once per window.
    await prisma.memoryEntry.createMany({
      data: [
        {
          familyId: a.familyId,
          authorUserId: a.userId,
          title: "First smile",
          body: "First smile",
          eventDate: new Date(),
        },
        {
          familyId: a.familyId,
          authorUserId: a.userId,
          title: "Park stroll",
          body: "Park stroll",
          eventDate: new Date(),
        },
      ],
    });
    // User B: one challenge completion 10 days ago — only the 30d window.
    await prisma.challengeCompletion.create({
      data: {
        userId: b.userId,
        familyId: b.familyId,
        planDate: new Date(Date.now() - 10 * DAY_MS),
        kind: "STORY",
        createdAt: new Date(Date.now() - 10 * DAY_MS),
      },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().activeUsers, { last1d: 1, last7d: 1, last30d: 2 });
    await app.close();
  });

  it("ignores activity older than 30 days", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");

    await prisma.challengeCompletion.create({
      data: {
        userId: a.userId,
        familyId: a.familyId,
        planDate: new Date(Date.now() - 40 * DAY_MS),
        kind: "STORY",
        createdAt: new Date(Date.now() - 40 * DAY_MS),
      },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID);

    assert.deepEqual(response.json().activeUsers, { last1d: 0, last7d: 0, last30d: 0 });
    await app.close();
  });

  it("returns counts and dates only — never names or content", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");
    await prisma.user.update({
      where: { id: a.userId },
      data: { name: "Very Private Name", email: "private@example.com" },
    });
    await prisma.memoryEntry.create({
      data: {
        familyId: a.familyId,
        authorUserId: a.userId,
        title: "Secret memory title",
        body: "Secret memory body",
        eventDate: new Date(),
      },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.includes("Very Private Name"), false);
    assert.equal(response.body.includes("private@example.com"), false);
    assert.equal(response.body.includes("Secret memory"), false);
    assert.equal(response.body.includes(a.userId), false);
    await app.close();
  });
});
