import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
  requireFamilyMember,
} from "@/middleware/require-family-member";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, resetDatabase } from "@/test/helpers/db";
import { addMember, createChild, createFamilyWithOwner } from "@/test/helpers/factories";

/**
 * The cross-family regression suite (§13.4), stood up on probe routes because Phase
 * 0 has no product routes yet. Every family endpoint added later must extend this
 * pattern: two households, then attempt access from the wrong one.
 *
 * This suite is a release gate, not a nice-to-have — it is the only thing standing
 * between a role or query mistake and one family reading another's memories.
 */
async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      // Reads the caller's own household.
      fastify.get("/probe/current", async (request, reply) => {
        const auth = await testRequireAuth(request, reply);
        if (!auth) return;

        const family = await requireCurrentFamily(auth);
        return reply.send({ familyId: family.familyId, role: family.role });
      });

      // Reads a household named in the URL — the shape that leaks if membership is
      // proven against the caller's default family instead of the requested one.
      fastify.get<{ Params: { familyId: string } }>(
        "/probe/families/:familyId",
        async (request, reply) => {
          const auth = await testRequireAuth(request, reply);
          if (!auth) return;

          const family = await requireFamilyMember(auth, request.params.familyId);
          return reply.send({ familyId: family.familyId, role: family.role });
        },
      );

      // Write-shaped: requires a contributor-or-better role.
      fastify.post("/probe/contribute", async (request, reply) => {
        const auth = await testRequireAuth(request, reply);
        if (!auth) return;

        const family = await requireCurrentFamilyWithPermission(auth, "canContribute");
        return reply.code(201).send({ familyId: family.familyId });
      });

      // Owner-only.
      fastify.post("/probe/billing", async (request, reply) => {
        const auth = await testRequireAuth(request, reply);
        if (!auth) return;

        const family = await requireCurrentFamilyWithPermission(auth, "canManageBilling");
        return reply.send({ familyId: family.familyId });
      });
    },
  });
}

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("family isolation", () => {
  it("returns 401 before touching any household data", async () => {
    const app = await createApp();

    const response = await app.inject({ method: "GET", url: "/probe/current" });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("returns 404 FAMILY_NOT_FOUND when onboarding has not created a household", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/probe/current",
      headers: asUser("clerk_no_family"),
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "FAMILY_NOT_FOUND");
    await app.close();
  });

  it("serves a member their own household", async () => {
    const app = await createApp();
    const { family, ownerUserId } = await createFamilyWithOwner();
    const owner = await ownerClerkId(ownerUserId);

    const response = await app.inject({
      method: "GET",
      url: `/probe/families/${family.id}`,
      headers: asUser(owner),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().familyId, family.id);
    await app.close();
  });

  it("denies reading another household by id, without confirming it exists", async () => {
    const app = await createApp();
    const familyA = await createFamilyWithOwner({ name: "A" });
    const familyB = await createFamilyWithOwner({ name: "B" });
    const ownerA = await ownerClerkId(familyA.ownerUserId);

    const response = await app.inject({
      method: "GET",
      url: `/probe/families/${familyB.family.id}`,
      headers: asUser(ownerA),
    });

    assert.equal(response.statusCode, 404);
    const body = response.json();
    assert.equal(body.error.code, "FAMILY_NOT_FOUND");
    // Nothing about household B may appear in the response.
    assert.equal(response.body.includes(familyB.family.id), false);
    assert.equal(response.body.includes("B"), false);
    await app.close();
  });

  it("denies a household that does not exist with the same answer", async () => {
    const app = await createApp();
    const familyA = await createFamilyWithOwner();
    const ownerA = await ownerClerkId(familyA.ownerUserId);

    const real = await app.inject({
      method: "GET",
      url: `/probe/families/${(await createFamilyWithOwner()).family.id}`,
      headers: asUser(ownerA),
    });
    const fake = await app.inject({
      method: "GET",
      url: "/probe/families/fam_does_not_exist",
      headers: asUser(ownerA),
    });

    // Identical responses: otherwise the difference is an existence oracle.
    assert.equal(real.statusCode, fake.statusCode);
    assert.equal(real.json().error.code, fake.json().error.code);
    await app.close();
  });

  it("denies a removed member who still has a stale default household", async () => {
    const app = await createApp();
    const { family } = await createFamilyWithOwner();
    const { userId } = await addMember(family.id, { status: "REMOVED" });
    const clerkId = await ownerClerkId(userId);

    const response = await app.inject({
      method: "GET",
      url: `/probe/families/${family.id}`,
      headers: asUser(clerkId),
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("carries a request id on every isolation failure", async () => {
    const app = await createApp();
    const familyA = await createFamilyWithOwner();
    const familyB = await createFamilyWithOwner();
    const ownerA = await ownerClerkId(familyA.ownerUserId);

    const response = await app.inject({
      method: "GET",
      url: `/probe/families/${familyB.family.id}`,
      headers: asUser(ownerA),
    });

    assert.equal(typeof response.json().error.requestId, "string");
    await app.close();
  });
});

describe("role permissions", () => {
  it("lets a contributor write household content", async () => {
    const app = await createApp();
    const { family } = await createFamilyWithOwner();
    const { userId } = await addMember(family.id, { role: "CONTRIBUTOR" });
    const clerkId = await ownerClerkId(userId);

    const response = await app.inject({
      method: "POST",
      url: "/probe/contribute",
      headers: asUser(clerkId),
    });

    assert.equal(response.statusCode, 201);
    await app.close();
  });

  it("refuses a viewer with 403, since membership itself is not in doubt", async () => {
    const app = await createApp();
    const { family } = await createFamilyWithOwner();
    const { userId } = await addMember(family.id, { role: "VIEWER" });
    const clerkId = await ownerClerkId(userId);

    const response = await app.inject({
      method: "POST",
      url: "/probe/contribute",
      headers: asUser(clerkId),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "FORBIDDEN");
    await app.close();
  });

  it("restricts billing to the owner", async () => {
    const app = await createApp();
    const { family, ownerUserId } = await createFamilyWithOwner();
    const { userId: parentUserId } = await addMember(family.id, { role: "PARENT" });

    const ownerResponse = await app.inject({
      method: "POST",
      url: "/probe/billing",
      headers: asUser(await ownerClerkId(ownerUserId)),
    });
    const parentResponse = await app.inject({
      method: "POST",
      url: "/probe/billing",
      headers: asUser(await ownerClerkId(parentUserId)),
    });

    assert.equal(ownerResponse.statusCode, 200);
    // PARENT is high in the role order but still not the billing owner: the matrix
    // is not purely hierarchical.
    assert.equal(parentResponse.statusCode, 403);
    await app.close();
  });

  it("keeps a child invisible to another household's members", async () => {
    const app = await createApp();
    const familyA = await createFamilyWithOwner();
    const familyB = await createFamilyWithOwner();
    await createChild(familyB.family.id, { displayName: "Their child" });

    const response = await app.inject({
      method: "GET",
      url: `/probe/families/${familyB.family.id}`,
      headers: asUser(await ownerClerkId(familyA.ownerUserId)),
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.includes("Their child"), false);
    await app.close();
  });
});

/** Factories create the local user first, so look up the Clerk ID to authenticate as them. */
async function ownerClerkId(userId: string): Promise<string> {
  const { prisma } = await import("@/test/helpers/db");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.clerkId;
}
