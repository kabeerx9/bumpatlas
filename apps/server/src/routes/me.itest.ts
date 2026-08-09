import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { registerMeRoutes } from "@/routes/me";
import { asUser, testGetAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

/** Matches ADMIN_USER_IDS in .env.test. */
const ADMIN_CLERK_ID = "clerk_admin_fixture";
const NON_ADMIN_CLERK_ID = "clerk_regular_user";

/**
 * `/api/me` talks to Clerk directly rather than through `requireAuth`, so this
 * stubs only `getAuth` and `clerkClient.users.getUser` (via a fresh row seeded
 * ahead of the request) — everything else, including the `ADMIN_USER_IDS`
 * match, runs for real.
 */
async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerMeRoutes, { getAuth: testGetAuth });
    },
  });
}

describe("GET /api/me", () => {
  after(async () => {
    await disconnectDatabase();
  });

  it("reports isAdmin: false for a caller outside ADMIN_USER_IDS", async () => {
    await resetDatabase();
    const app = await createApp();
    await prisma.user.create({
      data: { clerkId: NON_ADMIN_CLERK_ID, email: "regular@example.com" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: asUser(NON_ADMIN_CLERK_ID),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().isAdmin, false);
  });

  it("reports isAdmin: true for a caller matching ADMIN_USER_IDS", async () => {
    await resetDatabase();
    const app = await createApp();
    await prisma.user.create({
      data: { clerkId: ADMIN_CLERK_ID, email: "admin@example.com" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: asUser(ADMIN_CLERK_ID),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().isAdmin, true);
  });

  it("returns 401 with no authenticated caller", async () => {
    await resetDatabase();
    const app = await createApp();

    const response = await app.inject({ method: "GET", url: "/api/me" });

    assert.equal(response.statusCode, 401);
  });
});
