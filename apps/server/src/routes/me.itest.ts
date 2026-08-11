import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { registerMeRoutes, type MeRouteDeps } from "@/routes/me";
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
async function createApp(
  getClerkUser?: MeRouteDeps["getClerkUser"],
) {
  const defaultGetClerkUser: MeRouteDeps["getClerkUser"] = async (clerkId) => ({
    id: clerkId,
    firstName: null,
    lastName: null,
    imageUrl: "",
    emailAddresses: [
      {
        id: "email_default",
        emailAddress: `${clerkId}@example.test`,
        verification: { status: "verified" },
      },
    ],
    primaryEmailAddressId: "email_default",
  });

  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerMeRoutes, {
        getAuth: testGetAuth,
        getClerkUser: getClerkUser ?? defaultGetClerkUser,
      });
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

  it("hydrates a JIT-provisioned row before an email-bound invite check", async () => {
    await resetDatabase();
    const app = await createApp(async (clerkId) => ({
      id: clerkId,
      firstName: "Grace",
      lastName: "Hopper",
      imageUrl: "https://example.test/grace.png",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "grace@example.test",
          verification: { status: "verified" },
        },
      ],
      primaryEmailAddressId: "email_1",
    }));
    await prisma.user.create({ data: { clerkId: "clerk_jit_blank" } });

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: asUser("clerk_jit_blank"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().email, "grace@example.test");
    assert.equal(response.json().name, "Grace Hopper");
    const stored = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_jit_blank" },
    });
    assert.equal(stored.email, "grace@example.test");
    assert.equal(stored.name, "Grace Hopper");
    await app.close();
  });

  it("refreshes a stale mirrored email from Clerk", async () => {
    await resetDatabase();
    const app = await createApp(async (clerkId) => ({
      id: clerkId,
      firstName: "Grace",
      lastName: "Hopper",
      imageUrl: "https://example.test/grace.png",
      emailAddresses: [
        {
          id: "email_current",
          emailAddress: "current@example.test",
          verification: { status: "verified" as const },
        },
      ],
      primaryEmailAddressId: "email_current",
    }));
    await prisma.user.create({
      data: { clerkId: "clerk_stale_mirror", email: "stale@example.test" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: asUser("clerk_stale_mirror"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().email, "current@example.test");
    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_stale_mirror" } })).email,
      "current@example.test",
    );
    await app.close();
  });
});
