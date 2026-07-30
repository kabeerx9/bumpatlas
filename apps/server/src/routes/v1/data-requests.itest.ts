import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { processDataRequests, purgeExpiredRecords } from "@/jobs/process-data-requests";
import { registerCronRoutes } from "@/routes/cron/index";
import { registerDataRequestRoutes } from "@/routes/v1/data-requests";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerMemoryRoutes } from "@/routes/v1/memories";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";
import { createFakeSigner } from "@/test/helpers/storage";

type App = Awaited<ReturnType<typeof createApp>>;

const CRON_SECRET = "cron_test_secret";
let storage = createFakeSigner();
/** Captures what the job actually uploaded, so the export body can be inspected. */
let uploadedExports: Record<string, unknown>[] = [];

async function createApp() {
  storage = createFakeSigner();
  uploadedExports = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    if (String(url).includes("storage.test")) {
      uploadedExports.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 200 });
    }
    return originalFetch(url as never, init);
  }) as typeof fetch;

  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerMemoryRoutes, {
        requireAuth: testRequireAuth,
        getSigner: storage.getSigner,
      });
      fastify.register(registerDataRequestRoutes, {
        requireAuth: testRequireAuth,
        getSigner: storage.getSigner,
      });
      fastify.register(registerCronRoutes, {
        cronSecret: () => CRON_SECRET,
        getSigner: storage.getSigner,
      });
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
    payload: { name: "Household" },
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName: childName, dateOfBirth: "2026-05-01" },
  });
  return family.json().id as string;
}

const requestExport = (app: App, clerkId: string) =>
  app.inject({
    method: "POST",
    url: "/api/v1/data-requests",
    headers: asUser(clerkId),
    payload: { type: "export" },
  });

const runProcessor = (app: App) =>
  app.inject({
    method: "POST",
    url: "/api/cron/process-data-requests",
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("POST /api/v1/data-requests", () => {
  it("queues an export for an owner", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await requestExport(app, "clerk_owner");

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().status, "queued");
    assert.equal(response.json().downloadUrl, null);
    await app.close();
  });

  it("returns the existing request instead of queueing a second", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const first = await requestExport(app, "clerk_owner");
    const second = await requestExport(app, "clerk_owner");

    assert.equal(second.json().id, first.json().id);
    assert.equal(await prisma.dataRequest.count(), 1);
    await app.close();
  });

  it("refuses an export from a contributor", async () => {
    const app = await createApp();
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
      headers: asUser("clerk_contributor"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_contributor"),
    });

    const response = await requestExport(app, "clerk_contributor");

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("accepts a deletion request from someone with no household", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/data-requests",
      headers: asUser("clerk_never_onboarded"),
      payload: { type: "delete" },
    });

    // A right to deletion cannot depend on having finished onboarding.
    assert.equal(response.statusCode, 201);
    await app.close();
  });

  it("returns only the requester's own request", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const theirs = await requestExport(app, "clerk_b");

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/data-requests/${theirs.json().id}`,
      headers: asUser("clerk_a"),
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });
});

describe("export processor", () => {
  it("produces a download URL the requester can poll for", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const queued = await requestExport(app, "clerk_owner");

    const job = await runProcessor(app);
    assert.equal(job.json().succeeded, 1);

    const polled = await app.inject({
      method: "GET",
      url: `/api/v1/data-requests/${queued.json().id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(polled.json().status, "ready");
    assert.ok(polled.json().downloadUrl.startsWith("https://storage.test/download/"));
    await app.close();
  });

  it("stops offering the download once it has expired", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const queued = await requestExport(app, "clerk_owner");
    await runProcessor(app);

    await prisma.dataRequest.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const polled = await app.inject({
      method: "GET",
      url: `/api/v1/data-requests/${queued.json().id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(polled.json().downloadUrl, null);
    assert.equal(polled.json().status, "failed");
    await app.close();
  });

  it("includes household content the requester can already read", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: asUser("clerk_owner"),
      payload: { body: "First long eye contact", eventDate: "2026-07-29" },
    });
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    const payload = uploadedExports[0] as {
      household: { memories: { body: string }[]; children: unknown[] };
    };

    assert.equal(payload.household.memories.length, 1);
    assert.equal(payload.household.memories[0]!.body, "First long eye contact");
    assert.equal(payload.household.children.length, 1);
    await app.close();
  });

  it("includes a co-parent's memories, since they are shared family content", async () => {
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
    await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: asUser("clerk_partner"),
      payload: { body: "Partner's memory", eventDate: "2026-07-29" },
    });
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    const payload = uploadedExports[0] as { household: { memories: { body: string }[] } };

    assert.ok(payload.household.memories.some((memory) => memory.body === "Partner's memory"));
    await app.close();
  });

  it("excludes other members' email addresses", async () => {
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
    await prisma.user.update({
      where: { clerkId: "clerk_partner" },
      data: { email: "partner-private@example.test", name: "Jordan" },
    });
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    const serialized = JSON.stringify(uploadedExports[0]);

    // Display name yes, address no: an export must not become a contact scraper.
    assert.equal(serialized.includes("partner-private@example.test"), false);
    assert.ok(serialized.includes("Jordan"));
    await app.close();
  });

  it("excludes another member's assistant conversations", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const partner = await prisma.user.create({ data: { clerkId: "clerk_other_user" } });
    const conversation = await prisma.aiConversation.create({
      data: { userId: partner.id },
    });
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        body: "Their private assistant question",
        citationSlugs: [],
      },
    });
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    assert.equal(
      JSON.stringify(uploadedExports[0]).includes("Their private assistant question"),
      false,
    );
    await app.close();
  });

  it("includes the requester's own assistant messages", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const owner = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_owner" } });
    const conversation = await prisma.aiConversation.create({ data: { userId: owner.id } });
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        body: "My own question",
        citationSlugs: [],
      },
    });
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    const payload = uploadedExports[0] as { personal: { assistantMessages: unknown[] } };
    assert.equal(payload.personal.assistantMessages.length, 1);
    await app.close();
  });

  it("states its own scope so the file matches the privacy policy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await requestExport(app, "clerk_owner");

    await runProcessor(app);

    const payload = uploadedExports[0] as { scope: { includes: string[]; excludes: string[] } };
    assert.ok(payload.scope.includes.length > 0);
    assert.ok(payload.scope.excludes.length > 0);
    await app.close();
  });

  it("retries a failed export rather than losing it", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const queued = await requestExport(app, "clerk_owner");

    // Storage rejects the upload.
    const failing = {
      ...storage.signer,
      createUploadUrl: async () => ({ url: "https://storage.test/fail" }),
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;

    const first = await processDataRequests({ signer: failing, batchSize: 5 });
    globalThis.fetch = originalFetch;

    assert.equal(first.failed, 1);

    const row = await prisma.dataRequest.findUniqueOrThrow({ where: { id: queued.json().id } });
    // Back to PENDING with the attempt recorded, so the next run picks it up.
    assert.equal(row.status, "PENDING");
    assert.equal(row.attempts, 1);
    assert.equal(row.failureCode, "EXPORT_UPLOAD_FAILED");
    await app.close();
  });

  it("gives up after the attempt cap so a broken item stops consuming batches", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const queued = await requestExport(app, "clerk_owner");
    await prisma.dataRequest.update({
      where: { id: queued.json().id },
      data: { attempts: 3 },
    });

    const result = await processDataRequests({ signer: storage.signer });

    assert.equal(result.claimed, 0);
    await app.close();
  });
});

describe("deletion processor", () => {
  it("removes devices and memberships but keeps household memories", async () => {
    const app = await createApp();
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
      headers: asUser("clerk_leaver"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_leaver"),
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: asUser("clerk_leaver"),
      payload: { body: "Their contribution to the household", eventDate: "2026-07-29" },
    });

    const leaver = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_leaver" } });
    await prisma.pushDevice.create({
      data: { userId: leaver.id, token: "leaver-device", platform: "IOS" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/data-requests",
      headers: asUser("clerk_leaver"),
      payload: { type: "delete" },
    });
    await runProcessor(app);

    assert.equal(await prisma.pushDevice.count({ where: { userId: leaver.id } }), 0);
    const membership = await prisma.familyMember.findFirstOrThrow({
      where: { userId: leaver.id },
    });
    assert.equal(membership.status, "REMOVED");

    // Their memory stays: it is family content the household can still read.
    assert.equal(await prisma.memoryEntry.count({ where: { deletedAt: null } }), 1);
    await app.close();
  });

  it("scrubs the user's own identifying fields", async () => {
    const app = await createApp();
    await onboard(app, "clerk_solo");
    const solo = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_solo" } });
    // Solo user owns their household, so hand ownership scenario aside: test the scrub via
    // a non-owner.
    await prisma.family.updateMany({ where: { ownerUserId: solo.id }, data: { ownerUserId: (await prisma.user.create({ data: { clerkId: "clerk_new_owner" } })).id } });
    await prisma.user.update({
      where: { id: solo.id },
      data: { email: "solo@example.test", name: "Solo Parent" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/data-requests",
      headers: asUser("clerk_solo"),
      payload: { type: "delete" },
    });
    await runProcessor(app);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: solo.id } });
    assert.equal(after.email, null);
    assert.equal(after.name, null);
    assert.equal(after.defaultFamilyId, null);
    await app.close();
  });

  it("refuses to delete a household owner and records why", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    await app.inject({
      method: "POST",
      url: "/api/v1/data-requests",
      headers: asUser("clerk_owner"),
      payload: { type: "delete" },
    });
    const job = await runProcessor(app);

    assert.equal(job.json().failed, 1);
    const row = await prisma.dataRequest.findFirstOrThrow();
    // Deleting them would strand the household; they must delete the family first.
    assert.equal(row.failureCode, "OWNER_MUST_DELETE_FAMILY");
    await app.close();
  });
});

describe("cron authentication", () => {
  it("rejects a missing secret", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/cron/process-data-requests",
    });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("rejects a wrong secret", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/cron/purge-expired",
      headers: { authorization: "Bearer nope_nope_nope_nope" },
    });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("purges expired invites and stale pending uploads", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "VIEWER" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-url",
      headers: asUser("clerk_owner"),
      payload: { contentType: "image/jpeg", byteSize: 1024 },
    });

    await prisma.familyInvite.updateMany({
      data: { expiresAt: new Date(Date.now() - 40 * 86_400_000) },
    });
    await prisma.mediaAsset.updateMany({
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const result = await purgeExpiredRecords();

    assert.equal(result.invites, 1);
    // A pending upload that is never cleaned up counts against the quota forever.
    assert.equal(result.pendingUploads, 1);
    await app.close();
  });

  it("generates weekly recaps for every family", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");

    const response = await app.inject({
      method: "POST",
      url: "/api/cron/weekly-recaps",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    assert.equal(response.json().families, 2);
    assert.equal(response.json().generated, 2);
    assert.equal(response.json().failed, 0);
    assert.equal(await prisma.weeklyRecap.count(), 2);
    await app.close();
  });

  it("is safe to fire twice", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");

    await app.inject({
      method: "POST",
      url: "/api/cron/weekly-recaps",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    await app.inject({
      method: "POST",
      url: "/api/cron/weekly-recaps",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    assert.equal(await prisma.weeklyRecap.count(), 1);
    await app.close();
  });
});
