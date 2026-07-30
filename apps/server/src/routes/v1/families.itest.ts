import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
    },
  });
}

/** Onboarding as a real client would drive it, so the tests exercise the routes. */
async function onboard(
  app: Awaited<ReturnType<typeof createApp>>,
  clerkId: string,
  options: { name?: string; attest?: boolean } = {},
) {
  if (options.attest !== false) {
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser(clerkId),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: options.name ?? "Test household" },
  });

  return response;
}

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("POST /api/v1/families", () => {
  it("creates a household with the caller as owner", async () => {
    const app = await createApp();

    const response = await onboard(app, "clerk_owner");

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.name, "Test household");
    assert.equal(body.members.length, 1);
    assert.equal(body.members[0].role, "OWNER");
    assert.equal(body.members[0].status, "active");
    assert.deepEqual(body.children, []);
    await app.close();
  });

  it("seeds entitlements so later quota checks have limits to read", async () => {
    const app = await createApp();

    const response = await onboard(app, "clerk_owner");

    const entitlement = await prisma.entitlementCache.findUnique({
      where: { familyId: response.json().id },
    });
    assert.ok(entitlement);
    assert.equal(entitlement.isPremium, false);
    assert.equal(entitlement.maxChildren, 2);
    await app.close();
  });

  it("does not create two households when the same request is retried", async () => {
    const app = await createApp();
    const headers = { ...asUser("clerk_retry"), "idempotency-key": "onboard-1" };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers,
      payload: { name: "Retried household" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers,
      payload: { name: "Retried household" },
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.json().id, first.json().id);
    assert.equal(await prisma.family.count(), 1);
    await app.close();
  });

  it("rejects a reused key carrying different data", async () => {
    const app = await createApp();
    const headers = { ...asUser("clerk_conflict"), "idempotency-key": "onboard-1" };

    await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers,
      payload: { name: "First name" },
    });
    const conflict = await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers,
      payload: { name: "Different name" },
    });

    // A client bug, not a retry: silently returning the first response would hide it.
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error.code, "IDEMPOTENCY_CONFLICT");
    await app.close();
  });
});

describe("GET /api/v1/families/current", () => {
  it("returns 404 before onboarding", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/families/current",
      headers: asUser("clerk_fresh"),
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "FAMILY_NOT_FOUND");
    await app.close();
  });

  it("never exposes member emails", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await prisma.user.update({
      where: { clerkId: "clerk_owner" },
      data: { email: "owner@example.test", name: "Ada" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/families/current",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.body.includes("owner@example.test"), false);
    assert.equal(response.json().members[0].displayName, "Ada");
    await app.close();
  });
});

describe("invites", () => {
  async function ownerWithInvite(app: Awaited<ReturnType<typeof createApp>>, role = "CONTRIBUTOR") {
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role },
    });

    return response;
  }

  it("returns the plaintext token exactly once and stores only a hash", async () => {
    const app = await createApp();

    const response = await ownerWithInvite(app);

    assert.equal(response.statusCode, 201);
    const token = response.json().token;
    assert.ok(token.length > 20);

    const stored = await prisma.familyInvite.findFirstOrThrow();
    // The plaintext must not be recoverable from the database.
    assert.notEqual(stored.tokenHash, token);
    assert.equal(stored.tokenHash.length, 64);
    await app.close();
  });

  it("refuses a contributor trying to invite", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_contributor"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_contributor"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_contributor"),
      payload: { role: "VIEWER" },
    });

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("enforces the free seat quota, counting outstanding invites", async () => {
    const app = await createApp();
    await ownerWithInvite(app);

    // Owner + one pending invite already fills the 2 free seats.
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "VIEWER" },
    });

    assert.equal(response.statusCode, 422);
    const body = response.json();
    assert.equal(body.error.code, "SEAT_LIMIT_REACHED");
    assert.equal(body.error.details.upgradeAvailable, true);
    await app.close();
  });

  it("previews without leaking household detail", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    await prisma.user.update({ where: { clerkId: "clerk_owner" }, data: { name: "Ada" } });
    const family = await prisma.family.findFirstOrThrow();
    await prisma.childProfile.create({
      data: { familyId: family.id, displayName: "Ava", dateOfBirth: new Date("2026-05-01") },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${invite.json().token}/preview`,
      headers: asUser("clerk_recipient"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().inviterDisplayName, "Ada");
    // A link holder is not a member: no child names, no birth dates, no emails.
    assert.equal(response.body.includes("Ava"), false);
    assert.equal(response.body.includes("2026-05-01"), false);
    await app.close();
  });

  it("accepts an invite and adds the member", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().members.length, 2);
    await app.close();
  });

  it("requires adult attestation before joining a household", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_unattested"),
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "ADULT_ATTESTATION_REQUIRED");
    await app.close();
  });

  it("refuses a reused invite", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const token = invite.json().token;

    for (const clerkId of ["clerk_first", "clerk_second"]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/consents",
        headers: asUser(clerkId),
        payload: { type: "age_attestation", version: "2026-07-01" },
      });
    }

    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_first"),
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_second"),
    });

    assert.equal(second.statusCode, 410);
    assert.equal(second.json().error.code, "INVITE_EXPIRED");
    await app.close();
  });

  it("refuses an expired invite", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    await prisma.familyInvite.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_late"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_late"),
    });

    assert.equal(response.statusCode, 410);
    await app.close();
  });

  it("refuses an email-bound invite accepted by a different address", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const invite = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "CONTRIBUTOR", email: "Partner@Example.test" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_other"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await prisma.user.update({
      where: { clerkId: "clerk_other" },
      data: { email: "someone.else@example.test" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_other"),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "INVITE_EMAIL_MISMATCH");
    // Must not disclose which address the invite was issued to.
    assert.equal(response.body.toLowerCase().includes("partner@example.test"), false);
    await app.close();
  });

  it("matches an email-bound invite case-insensitively", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const invite = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "CONTRIBUTOR", email: "Partner@Example.test" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await prisma.user.update({
      where: { clerkId: "clerk_partner" },
      data: { email: "partner@example.TEST" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });

    assert.equal(response.statusCode, 200);
    await app.close();
  });
});

describe("membership changes", () => {
  async function householdWithPartner(app: Awaited<ReturnType<typeof createApp>>) {
    await onboard(app, "clerk_owner");
    const invite = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "CONTRIBUTOR" },
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

    const partner = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_partner" } });
    const membership = await prisma.familyMember.findFirstOrThrow({
      where: { userId: partner.id },
    });

    return { partner, membership };
  }

  it("promotes a contributor to parent", async () => {
    const app = await createApp();
    const { membership } = await householdWithPartner(app);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/families/current/members/${membership.id}`,
      headers: asUser("clerk_owner"),
      payload: { role: "PARENT" },
    });

    assert.equal(response.statusCode, 200);
    const updated = await prisma.familyMember.findUniqueOrThrow({ where: { id: membership.id } });
    assert.equal(updated.role, "PARENT");
    await app.close();
  });

  it("refuses to demote or reassign the owner", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const ownerMembership = await prisma.familyMember.findFirstOrThrow();

    const demote = await app.inject({
      method: "PATCH",
      url: `/api/v1/families/current/members/${ownerMembership.id}`,
      headers: asUser("clerk_owner"),
      payload: { role: "VIEWER" },
    });

    assert.equal(demote.statusCode, 422);
    assert.equal(demote.json().error.code, "OWNER_CANNOT_BE_CHANGED");
    await app.close();
  });

  it("refuses to remove the owner", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const ownerMembership = await prisma.familyMember.findFirstOrThrow();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/families/current/members/${ownerMembership.id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 422);
    await app.close();
  });

  it("clears household pointers when a member is removed", async () => {
    const app = await createApp();
    const { partner, membership } = await householdWithPartner(app);
    const family = await prisma.family.findFirstOrThrow();
    const child = await prisma.childProfile.create({
      data: { familyId: family.id, displayName: "Ava", dateOfBirth: new Date("2026-05-01") },
    });
    await prisma.user.update({
      where: { id: partner.id },
      data: { activeChildId: child.id, defaultFamilyId: family.id },
    });

    await app.inject({
      method: "DELETE",
      url: `/api/v1/families/current/members/${membership.id}`,
      headers: asUser("clerk_owner"),
    });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: partner.id } });
    // A pointer at a child in a household they can no longer read is a leak waiting
    // for the next request that trusts it.
    assert.equal(after.activeChildId, null);
    assert.equal(after.defaultFamilyId, null);
    await app.close();
  });

  it("lets a contributor leave and clears their pointers", async () => {
    const app = await createApp();
    const { partner } = await householdWithPartner(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/leave",
      headers: asUser("clerk_partner"),
      payload: { confirmation: "LEAVE" },
    });

    assert.equal(response.statusCode, 204);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: partner.id } });
    assert.equal(after.defaultFamilyId, null);
    await app.close();
  });

  it("refuses to leave without the confirmation", async () => {
    const app = await createApp();
    await householdWithPartner(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/leave",
      headers: asUser("clerk_partner"),
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("tells the owner to delete the household instead of leaving", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/leave",
      headers: asUser("clerk_owner"),
      payload: { confirmation: "LEAVE" },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "OWNER_CANNOT_LEAVE");
    await app.close();
  });
});
