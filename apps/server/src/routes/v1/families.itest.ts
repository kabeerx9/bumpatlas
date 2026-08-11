import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerFamilyRoutes, type FamilyRouteDeps } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { hashInviteToken } from "@/services/invite";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

async function createApp(deps: Partial<FamilyRouteDeps> = {}) {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, {
        requireAuth: testRequireAuth,
        // Integration tests have no Clerk connection. Treat the seeded local
        // address as verified unless a security case injects a different view.
        getVerifiedEmails: async (clerkUserId: string) => {
          const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
            select: { email: true },
          });
          return user?.email ? [user.email] : [];
        },
        ...deps,
      });
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
  async function createInviteForCurrentFamily(
    app: Awaited<ReturnType<typeof createApp>>,
    role = "CONTRIBUTOR",
    email?: string,
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role, ...(email ? { email } : {}) },
    });
  }

  async function ownerWithInvite(
    app: Awaited<ReturnType<typeof createApp>>,
    role = "CONTRIBUTOR",
    email?: string,
  ) {
    await onboard(app, "clerk_owner");
    return createInviteForCurrentFamily(app, role, email);
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

  it("publicly previews the exact allowlist without provisioning a recipient", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app, "CONTRIBUTOR", "recipient@example.test");
    await prisma.user.update({ where: { clerkId: "clerk_owner" }, data: { name: "Ada" } });
    const family = await prisma.family.findFirstOrThrow();
    await prisma.childProfile.create({
      data: { familyId: family.id, displayName: "Ava", dateOfBirth: new Date("2026-05-01") },
    });
    const usersBefore = await prisma.user.count();

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${invite.json().token}/preview`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      familyName: "Test household",
      inviterDisplayName: "Ada",
      role: "CONTRIBUTOR",
      expiresAt: invite.json().expiresAt,
    });
    // A link holder is not a member: no token, child names, birth dates, or emails.
    assert.equal(response.body.includes(invite.json().token), false);
    assert.equal(response.body.includes("Ava"), false);
    assert.equal(response.body.includes("2026-05-01"), false);
    assert.equal(response.body.includes("recipient@example.test"), false);
    assert.equal(await prisma.user.count(), usersBefore);
    await app.close();
  });

  it("keeps invite acceptance authenticated", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHENTICATED");
    assert.equal((await prisma.familyInvite.findFirstOrThrow()).acceptedAt, null);
    await app.close();
  });

  it("accepts an invite and adds the member", async () => {
    const app = await createApp({
      getVerifiedEmails: async () => {
        throw new Error("unbound invites must not call the identity provider");
      },
    });
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

  it("completes invite-first onboarding from the target household profile", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const family = await prisma.family.findFirstOrThrow();
    await prisma.childProfile.create({
      data: {
        familyId: family.id,
        displayName: "Ava",
        dateOfBirth: new Date("2026-05-01"),
      },
    });

    for (const type of ["age_attestation", "terms", "privacy"] as const) {
      await app.inject({
        method: "POST",
        url: "/api/v1/consents",
        headers: asUser("clerk_invite_first"),
        payload: { type, version: "2026-07-01" },
      });
    }

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_invite_first"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().id, family.id);
    const recipient = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_invite_first" },
    });
    assert.equal(recipient.defaultFamilyId, family.id);
    assert.ok(recipient.onboardingCompletedAt);
    assert.equal(
      await prisma.familyMember.count({
        where: { userId: recipient.id, familyId: family.id, status: "ACTIVE" },
      }),
      1,
    );
    assert.equal(
      await prisma.familyMember.count({ where: { userId: recipient.id, role: "OWNER" } }),
      0,
    );
    assert.equal(
      await prisma.productEvent.count({
        where: { actorUserId: recipient.id, name: "ONBOARDING_COMPLETED" },
      }),
      1,
    );
    assert.ok(await prisma.notificationPreference.findUnique({ where: { userId: recipient.id } }));
    await app.close();
  });

  it("replays a response-loss retry using the token hash as the operation key", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const token = invite.json().token as string;

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_retry_recipient"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_retry_recipient"),
    });
    const retry = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_retry_recipient"),
    });

    assert.equal(first.statusCode, 200);
    assert.equal(retry.statusCode, 200);
    assert.deepEqual(retry.json(), first.json());
    const recipient = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_retry_recipient" },
    });
    const record = await prisma.idempotencyRecord.findUnique({
      where: {
        userId_routeKey_idempotencyKey: {
          userId: recipient.id,
          routeKey: "POST /api/v1/invites/:token/accept",
          idempotencyKey: hashInviteToken(token),
        },
      },
    });
    assert.equal(record?.responseJson, first.json().id);
    assert.equal(await prisma.familyMember.count(), 2);
    await app.close();
  });

  it("finishes post-accept onboarding work when a response-loss retry replays", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const token = invite.json().token as string;
    const family = await prisma.family.findFirstOrThrow();
    await prisma.childProfile.create({
      data: {
        familyId: family.id,
        displayName: "Ava",
        dateOfBirth: new Date("2026-05-01"),
      },
    });

    for (const type of ["age_attestation", "terms", "privacy"] as const) {
      await app.inject({
        method: "POST",
        url: "/api/v1/consents",
        headers: asUser("clerk_replay_completion"),
        payload: { type, version: "2026-07-01" },
      });
    }

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_replay_completion"),
    });
    assert.equal(first.statusCode, 200);

    const recipient = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_replay_completion" },
    });
    // Model a process loss after the acceptance/idempotency transaction but
    // before the route's post-transaction onboarding projection completed.
    await prisma.user.update({
      where: { id: recipient.id },
      data: { onboardingCompletedAt: null },
    });
    await prisma.productEvent.deleteMany({
      where: { actorUserId: recipient.id, name: "ONBOARDING_COMPLETED" },
    });

    const replay = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_replay_completion"),
    });

    assert.equal(replay.statusCode, 200);
    const recovered = await prisma.user.findUniqueOrThrow({ where: { id: recipient.id } });
    assert.ok(recovered.onboardingCompletedAt);
    assert.equal(
      await prisma.productEvent.count({
        where: { actorUserId: recipient.id, name: "ONBOARDING_COMPLETED" },
      }),
      1,
    );
    await app.close();
  });

  it("recovers the winning response when the same invite is accepted concurrently", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const token = invite.json().token as string;

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_concurrent_recipient"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/invites/${token}/accept`,
        headers: asUser("clerk_concurrent_recipient"),
      }),
      app.inject({
        method: "POST",
        url: `/api/v1/invites/${token}/accept`,
        headers: asUser("clerk_concurrent_recipient"),
      }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.statusCode),
      [200, 200],
    );
    assert.equal(responses[0].json().id, responses[1].json().id);
    await app.close();
  });

  it("serializes different invite tokens competing for the same membership", async () => {
    const app = await createApp();
    const contributorInvite = await ownerWithInvite(app, "CONTRIBUTOR");
    await prisma.entitlementCache.updateMany({ data: { maxMembers: 3 } });
    const parentInvite = await createInviteForCurrentFamily(app, "PARENT");

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_competing_invites"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/invites/${contributorInvite.json().token}/accept`,
        headers: asUser("clerk_competing_invites"),
      }),
      app.inject({
        method: "POST",
        url: `/api/v1/invites/${parentInvite.json().token}/accept`,
        headers: asUser("clerk_competing_invites"),
      }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.statusCode).sort(),
      [200, 409],
    );
    assert.equal(
      responses.find((response) => response.statusCode === 409)?.json().error.code,
      "ALREADY_FAMILY_MEMBER",
    );
    const recipient = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_competing_invites" },
    });
    const consumed = await prisma.familyInvite.findMany({
      where: { acceptedByUserId: recipient.id },
      select: { role: true },
    });
    assert.equal(consumed.length, 1);
    const membership = await prisma.familyMember.findFirstOrThrow({
      where: { userId: recipient.id },
    });
    assert.equal(membership.role, consumed[0]?.role);
    await app.close();
  });

  it("uses the invite token rather than a caller-provided operation key", async () => {
    const app = await createApp();
    const firstInvite = await ownerWithInvite(app, "CONTRIBUTOR");
    await prisma.entitlementCache.updateMany({ data: { maxMembers: 3 } });
    const secondInvite = await createInviteForCurrentFamily(app, "PARENT");
    const headers = {
      ...asUser("clerk_key_conflict_recipient"),
      "idempotency-key": "accept-invite-once",
    };

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers,
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    const first = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${firstInvite.json().token}/accept`,
      headers,
    });
    const conflict = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${secondInvite.json().token}/accept`,
      headers,
    });

    assert.equal(first.statusCode, 200);
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error.code, "ALREADY_FAMILY_MEMBER");
    const untouched = await prisma.familyInvite.findUniqueOrThrow({
      where: { tokenHash: hashInviteToken(secondInvite.json().token) },
    });
    assert.equal(untouched.acceptedAt, null);
    const recipient = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_key_conflict_recipient" },
    });
    assert.equal(
      await prisma.idempotencyRecord.count({
        where: { userId: recipient.id, idempotencyKey: "accept-invite-once" },
      }),
      0,
    );
    await app.close();
  });

  it("does not let an active member promote themselves with a fresh invite", async () => {
    const app = await createApp();
    const contributorInvite = await ownerWithInvite(app, "CONTRIBUTOR");
    await prisma.entitlementCache.updateMany({ data: { maxMembers: 3 } });
    const parentInvite = await createInviteForCurrentFamily(app, "PARENT");

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_active_member"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${contributorInvite.json().token}/accept`,
      headers: asUser("clerk_active_member"),
    });
    const rejected = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${parentInvite.json().token}/accept`,
      headers: asUser("clerk_active_member"),
    });

    assert.equal(rejected.statusCode, 409);
    assert.equal(rejected.json().error.code, "ALREADY_FAMILY_MEMBER");
    const user = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_active_member" } });
    const membership = await prisma.familyMember.findFirstOrThrow({ where: { userId: user.id } });
    assert.equal(membership.role, "CONTRIBUTOR");
    const unusedInvite = await prisma.familyInvite.findUniqueOrThrow({
      where: { tokenHash: hashInviteToken(parentInvite.json().token) },
    });
    assert.equal(unusedInvite.acceptedAt, null);
    assert.equal(
      await prisma.idempotencyRecord.count({
        where: { userId: user.id, idempotencyKey: hashInviteToken(parentInvite.json().token) },
      }),
      0,
    );
    await app.close();
  });

  it("does not let the owner demote themselves with an invite", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app, "VIEWER");

    const rejected = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(rejected.statusCode, 409);
    assert.equal(rejected.json().error.code, "ALREADY_FAMILY_MEMBER");
    const owner = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_owner" } });
    const membership = await prisma.familyMember.findFirstOrThrow({ where: { userId: owner.id } });
    assert.equal(membership.role, "OWNER");
    assert.equal((await prisma.familyInvite.findFirstOrThrow()).acceptedAt, null);
    await app.close();
  });

  it("reactivates a removed member through a fresh invite", async () => {
    const app = await createApp();
    const firstInvite = await ownerWithInvite(app, "CONTRIBUTOR");

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_removed_member"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${firstInvite.json().token}/accept`,
      headers: asUser("clerk_removed_member"),
    });
    const removedUser = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_removed_member" },
    });
    const originalMembership = await prisma.familyMember.findFirstOrThrow({
      where: { userId: removedUser.id },
    });
    await app.inject({
      method: "DELETE",
      url: `/api/v1/families/current/members/${originalMembership.id}`,
      headers: asUser("clerk_owner"),
    });
    const freshInvite = await createInviteForCurrentFamily(app, "PARENT");

    const reactivated = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${freshInvite.json().token}/accept`,
      headers: asUser("clerk_removed_member"),
    });

    assert.equal(reactivated.statusCode, 200);
    const membership = await prisma.familyMember.findFirstOrThrow({
      where: { userId: removedUser.id },
    });
    assert.equal(membership.id, originalMembership.id);
    assert.equal(membership.status, "ACTIVE");
    assert.equal(membership.role, "PARENT");
    assert.equal(membership.removedAt, null);
    assert.equal(await prisma.familyMember.count({ where: { userId: removedUser.id } }), 1);
    await app.close();
  });

  it("re-proves active membership before serving an acceptance replay", async () => {
    const app = await createApp();
    const invite = await ownerWithInvite(app);
    const token = invite.json().token as string;

    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_removed_after_accept"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_removed_after_accept"),
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { clerkId: "clerk_removed_after_accept" },
    });
    await prisma.familyMember.updateMany({
      where: { userId: user.id },
      data: { status: "REMOVED", removedAt: new Date() },
    });

    const replay = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${token}/accept`,
      headers: asUser("clerk_removed_after_accept"),
    });

    assert.equal(replay.statusCode, 404);
    assert.equal(replay.json().error.code, "FAMILY_NOT_FOUND");
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

  it("does not reveal whether a public preview was consumed or merely expired", async () => {
    const app = await createApp();
    const consumedInvite = await ownerWithInvite(app);
    await prisma.entitlementCache.updateMany({ data: { maxMembers: 3 } });
    const expiredInvite = await createInviteForCurrentFamily(app);
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_preview_nondisclosure"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${consumedInvite.json().token}/accept`,
      headers: asUser("clerk_preview_nondisclosure"),
    });
    await prisma.familyInvite.update({
      where: { tokenHash: hashInviteToken(expiredInvite.json().token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const consumedPreview = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${consumedInvite.json().token}/preview`,
    });
    const expiredPreview = await app.inject({
      method: "GET",
      url: `/api/v1/invites/${expiredInvite.json().token}/preview`,
    });

    assert.equal(consumedPreview.statusCode, 410);
    assert.equal(expiredPreview.statusCode, 410);
    assert.equal(consumedPreview.json().error.code, expiredPreview.json().error.code);
    assert.equal(consumedPreview.json().error.message, expiredPreview.json().error.message);
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

  it("authorizes an email-bound invite from Clerk's current verified addresses", async () => {
    const app = await createApp({
      getVerifiedEmails: async () => ["current@example.test"],
    });
    const invite = await ownerWithInvite(app, "CONTRIBUTOR", "stale@example.test");
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_stale_email"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await prisma.user.update({
      where: { clerkId: "clerk_stale_email" },
      data: { email: "stale@example.test" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_stale_email"),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "INVITE_EMAIL_MISMATCH");
    assert.equal((await prisma.familyInvite.findFirstOrThrow()).acceptedAt, null);
    await app.close();
  });

  it("does not authorize an email-bound invite with no verified Clerk address", async () => {
    const app = await createApp({ getVerifiedEmails: async () => [] });
    const invite = await ownerWithInvite(app, "CONTRIBUTOR", "unverified@example.test");
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_unverified_email"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await prisma.user.update({
      where: { clerkId: "clerk_unverified_email" },
      data: { email: "unverified@example.test" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_unverified_email"),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "INVITE_EMAIL_MISMATCH");
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
