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

const getMetrics = (app: App, clerkId: string, range?: "30d" | "90d") =>
  app.inject({
    method: "GET",
    url: range ? `/api/v1/admin/metrics?range=${range}` : "/api/v1/admin/metrics",
    headers: asUser(clerkId),
  });

/** ISO calendar date for a point `daysAgo` days before now, matching the
 * service's UTC bucketing. */
function isoDateDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

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

describe("GET /api/v1/admin/metrics — timeseries (slice 2)", () => {
  it("zero-fills days with no signups and buckets a backdated signup on its own day", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");

    // Distinct from "today", where the admin's own JIT-provisioned signup lands.
    const fiveDaysAgo = new Date(Date.now() - 5 * DAY_MS);
    await prisma.user.update({
      where: { id: a.userId },
      data: { createdAt: fiveDaysAgo },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID, "30d");
    assert.equal(response.statusCode, 200);
    const { signupsByDay } = response.json() as {
      signupsByDay: { date: string; count: number }[];
    };

    const today = isoDateDaysAgo(0);
    const fiveDaysAgoIso = isoDateDaysAgo(5);
    const threeDaysAgoIso = isoDateDaysAgo(3);

    const byDate = new Map(signupsByDay.map((d) => [d.date, d.count]));
    assert.equal(byDate.get(fiveDaysAgoIso), 1);
    // A day with no signups still appears in the series, zero-filled.
    assert.equal(byDate.get(threeDaysAgoIso), 0);
    // The admin's own JIT-provisioned account signed up "today".
    assert.equal(byDate.get(today), 1);
    // Full 31-day inclusive series for a 30d range.
    assert.equal(signupsByDay.length, 31);
    await app.close();
  });

  it("respects the range param: a 40-day-old signup is in 90d but not 30d", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");

    const fortyDaysAgo = new Date(Date.now() - 40 * DAY_MS);
    await prisma.user.update({
      where: { id: a.userId },
      data: { createdAt: fortyDaysAgo },
    });

    const fortyDaysAgoIso = isoDateDaysAgo(40);

    const response30 = await getMetrics(app, ADMIN_CLERK_ID, "30d");
    const dates30 = (
      response30.json().signupsByDay as { date: string; count: number }[]
    ).map((d) => d.date);
    assert.equal(dates30.includes(fortyDaysAgoIso), false);

    const response90 = await getMetrics(app, ADMIN_CLERK_ID, "90d");
    const byDate90 = new Map(
      (response90.json().signupsByDay as { date: string; count: number }[]).map((d) => [
        d.date,
        d.count,
      ]),
    );
    assert.equal(byDate90.get(fortyDaysAgoIso), 1);
    await app.close();
  });

  it("defaults to 30d when range is omitted", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");

    const response = await getMetrics(app, ADMIN_CLERK_ID);
    assert.equal(response.statusCode, 200);
    const { signupsByDay } = response.json() as {
      signupsByDay: { date: string; count: number }[];
    };
    assert.equal(signupsByDay.length, 31);
    await app.close();
  });

  it("buckets memories and challenge completions per day, zero-filling gaps", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");

    const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
    await prisma.memoryEntry.create({
      data: {
        familyId: a.familyId,
        authorUserId: a.userId,
        title: "First smile",
        body: "First smile",
        eventDate: twoDaysAgo,
        createdAt: twoDaysAgo,
      },
    });
    await prisma.challengeCompletion.create({
      data: {
        userId: a.userId,
        familyId: a.familyId,
        planDate: twoDaysAgo,
        kind: "STORY",
        createdAt: twoDaysAgo,
      },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID, "30d");
    assert.equal(response.statusCode, 200);
    const { engagementByDay } = response.json() as {
      engagementByDay: { date: string; memories: number; challengeCompletions: number }[];
    };

    const twoDaysAgoIso = isoDateDaysAgo(2);
    const oneDayAgoIso = isoDateDaysAgo(1);
    const byDate = new Map(engagementByDay.map((d) => [d.date, d]));

    assert.deepEqual(byDate.get(twoDaysAgoIso), {
      date: twoDaysAgoIso,
      memories: 1,
      challengeCompletions: 1,
    });
    // A day with no engagement still appears, zero-filled on both counters.
    assert.deepEqual(byDate.get(oneDayAgoIso), {
      date: oneDayAgoIso,
      memories: 0,
      challengeCompletions: 0,
    });
    await app.close();
  });

  it("counts invites sent and redeemed within the range", async () => {
    const app = await createApp();
    const a = await onboard(app, "clerk_a");

    const inRange = new Date(Date.now() - 5 * DAY_MS);
    const outOfRange = new Date(Date.now() - 40 * DAY_MS);

    // Sent within range, not yet redeemed.
    await prisma.familyInvite.create({
      data: {
        familyId: a.familyId,
        tokenHash: "hash-sent-in-range",
        role: "PARENT",
        expiresAt: new Date(Date.now() + DAY_MS),
        createdByUserId: a.userId,
        createdAt: inRange,
      },
    });
    // Sent within range and redeemed within range.
    await prisma.familyInvite.create({
      data: {
        familyId: a.familyId,
        tokenHash: "hash-sent-and-redeemed",
        role: "PARENT",
        expiresAt: new Date(Date.now() + DAY_MS),
        createdByUserId: a.userId,
        createdAt: inRange,
        acceptedAt: inRange,
        acceptedByUserId: a.userId,
      },
    });
    // Sent outside the 30d range — must not be counted for a 30d query.
    await prisma.familyInvite.create({
      data: {
        familyId: a.familyId,
        tokenHash: "hash-sent-out-of-range",
        role: "PARENT",
        expiresAt: new Date(Date.now() + DAY_MS),
        createdByUserId: a.userId,
        createdAt: outOfRange,
      },
    });

    const response = await getMetrics(app, ADMIN_CLERK_ID, "30d");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().invites, { sent: 2, redeemed: 1 });
    await app.close();
  });
});
