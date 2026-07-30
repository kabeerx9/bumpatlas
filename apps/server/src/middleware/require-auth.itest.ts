import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

/**
 * A stand-in product route. Phase 0 has no real ones yet, and the authorization
 * helpers must be proven before any exist — that is the phase's stop condition.
 */
async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.get("/probe", async (request, reply) => {
        const auth = await testRequireAuth(request, reply);
        if (!auth) return;

        return reply.send(auth);
      });
    },
  });
}

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("requireAuth", () => {
  it("returns a structured 401 when no token is present", async () => {
    const app = await createApp();

    const response = await app.inject({ method: "GET", url: "/probe" });

    assert.equal(response.statusCode, 401);
    const body = response.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
    // The request ID in the body must be traceable to the log line.
    assert.equal(typeof body.error.requestId, "string");
    await app.close();
  });

  it("provisions a local user on first authenticated request", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/probe",
      headers: asUser("clerk_new_user"),
    });

    assert.equal(response.statusCode, 200);

    const user = await prisma.user.findUnique({ where: { clerkId: "clerk_new_user" } });
    assert.ok(user, "expected a local user row");
    assert.equal(response.json().userId, user.id);
    // Provisioning does not call Clerk, so profile fields start empty and are
    // filled by /api/me or the webhook.
    assert.equal(user.email, null);
    await app.close();
  });

  it("does not create a second row for a returning user", async () => {
    const app = await createApp();

    const first = await app.inject({
      method: "GET",
      url: "/probe",
      headers: asUser("clerk_repeat"),
    });
    const second = await app.inject({
      method: "GET",
      url: "/probe",
      headers: asUser("clerk_repeat"),
    });

    assert.equal(first.json().userId, second.json().userId);
    assert.equal(await prisma.user.count({ where: { clerkId: "clerk_repeat" } }), 1);
    await app.close();
  });

  it("marks the configured admin and nobody else", async () => {
    const app = await createApp();

    const admin = await app.inject({
      method: "GET",
      url: "/probe",
      headers: asUser("clerk_admin_fixture"),
    });
    const regular = await app.inject({
      method: "GET",
      url: "/probe",
      headers: asUser("clerk_regular_user"),
    });

    assert.equal(admin.json().isAdmin, true);
    assert.equal(regular.json().isAdmin, false);
    await app.close();
  });

  it("persists a valid time zone from X-Time-Zone", async () => {
    const app = await createApp();

    await app.inject({
      method: "GET",
      url: "/probe",
      headers: { ...asUser("clerk_tz"), "x-time-zone": "Asia/Kolkata" },
    });

    // Written outside the response path, so poll briefly rather than assume the
    // fire-and-forget update has landed.
    let stored: string | null = null;
    for (let attempt = 0; attempt < 20 && stored === null; attempt += 1) {
      const user = await prisma.user.findUnique({ where: { clerkId: "clerk_tz" } });
      stored = user?.timeZone ?? null;
      if (stored === null) await new Promise((resolve) => setTimeout(resolve, 50));
    }

    assert.equal(stored, "Asia/Kolkata");
    await app.close();
  });

  it("ignores an invalid time zone instead of failing the request", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/probe",
      headers: { ...asUser("clerk_bad_tz"), "x-time-zone": "Mars/Olympus_Mons" },
    });

    assert.equal(response.statusCode, 200);
    const user = await prisma.user.findUnique({ where: { clerkId: "clerk_bad_tz" } });
    assert.equal(user?.timeZone, null);
    await app.close();
  });
});
