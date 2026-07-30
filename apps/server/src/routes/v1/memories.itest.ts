import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerMemoryRoutes } from "@/routes/v1/memories";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";
import { createFakeSigner } from "@/test/helpers/storage";

type App = Awaited<ReturnType<typeof createApp>>;

let storage = createFakeSigner();

async function createApp() {
  storage = createFakeSigner();

  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerMemoryRoutes, {
        requireAuth: testRequireAuth,
        getSigner: storage.getSigner,
      });
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
  return family.json().id as string;
}

const addChild = (app: App, clerkId: string, displayName: string, dateOfBirth: string) =>
  app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName, dateOfBirth },
  });

const createMemory = (
  app: App,
  clerkId: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
) =>
  app.inject({
    method: "POST",
    url: "/api/v1/memories",
    headers: { ...asUser(clerkId), ...headers },
    payload: { eventDate: "2026-07-29", ...payload },
  });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("POST /api/v1/memories", () => {
  it("derives the title and returns the memory", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await createMemory(app, "clerk_owner", {
      body: "First long eye contact\nHeld my gaze during the morning feed.",
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.title, "First long eye contact");
    assert.equal(body.eventDate, "2026-07-29");
    assert.equal(body.visibility, "HOUSEHOLD");
    await app.close();
  });

  it("attributes to the active child when no target is given", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const child = await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    const response = await createMemory(app, "clerk_owner", { body: "Smiled today" });

    assert.equal(response.json().childId, child.json().id);
    assert.equal(response.json().pregnancyId, null);
    await app.close();
  });

  it("attributes to the pregnancy when there is no child yet", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await app.inject({
      method: "POST",
      url: "/api/v1/pregnancies",
      headers: asUser("clerk_owner"),
      payload: { dueDate: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10) },
    });

    const response = await createMemory(app, "clerk_owner", { body: "Felt a kick" });

    // Without this fallback every pregnancy journal entry would be stored untargeted.
    assert.ok(response.json().pregnancyId);
    assert.equal(response.json().childId, null);
    await app.close();
  });

  it("prefers an explicit child over the active one", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    const response = await createMemory(app, "clerk_owner", {
      body: "Elder's first day of nursery",
      childId: elder.json().id,
    });

    assert.equal(response.json().childId, elder.json().id);
    await app.close();
  });

  it("rejects a memory targeting both a child and a pregnancy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const child = await addChild(app, "clerk_owner", "Ava", "2026-05-01");

    const response = await createMemory(app, "clerk_owner", {
      body: "Confused memory",
      childId: child.json().id,
      pregnancyId: "preg_1",
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("refuses to attribute a memory to another household's child", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const theirChild = await addChild(app, "clerk_b", "Theirs", "2026-05-01");

    const response = await createMemory(app, "clerk_a", {
      body: "Should not be allowed",
      childId: theirChild.json().id,
    });

    assert.equal(response.statusCode, 404);
    assert.equal(await prisma.memoryEntry.count(), 0);
    await app.close();
  });

  it("rejects a future event date", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await createMemory(app, "clerk_owner", {
      body: "From the future",
      eventDate: "2099-01-01",
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("refuses a viewer", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const invite = await app.inject({
      method: "POST",
      url: "/api/v1/families/current/invites",
      headers: asUser("clerk_owner"),
      payload: { role: "VIEWER" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_viewer"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_viewer"),
    });

    const response = await createMemory(app, "clerk_viewer", { body: "Not allowed" });

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("does not duplicate a memory when an offline draft retries", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const payload = { body: "Retried draft", eventDate: "2026-07-29" };

    // The shipped offline flow persists one key per draft and resends it.
    const first = await createMemory(app, "clerk_owner", payload, {
      "idempotency-key": "draft-1",
    });
    const second = await createMemory(app, "clerk_owner", payload, {
      "idempotency-key": "draft-1",
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.json().id, first.json().id);
    assert.equal(await prisma.memoryEntry.count(), 1);
    await app.close();
  });

  it("accepts the idempotency key from the contract body too", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const payload = { body: "Body-keyed draft", eventDate: "2026-07-29", idempotencyKey: "draft-2" };

    await createMemory(app, "clerk_owner", payload);
    await createMemory(app, "clerk_owner", payload);

    assert.equal(await prisma.memoryEntry.count(), 1);
    await app.close();
  });
});

describe("media", () => {
  const requestUploadUrl = (app: App, clerkId: string, byteSize = 1024) =>
    app.inject({
      method: "POST",
      url: "/api/v1/media/upload-url",
      headers: asUser(clerkId),
      payload: { contentType: "image/jpeg", byteSize },
    });

  it("issues a signed upload URL and records a pending asset", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await requestUploadUrl(app, "clerk_owner");

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.ok(body.uploadUrl.startsWith("https://storage.test/upload/"));
    assert.ok(body.expiresAt);

    const asset = await prisma.mediaAsset.findFirstOrThrow();
    assert.equal(asset.status, "PENDING");
    // Family-prefixed and random: never guessable from a memory or child id.
    assert.ok(asset.storageKey.startsWith("families/"));
    await app.close();
  });

  it("rejects an unsupported content type", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-url",
      headers: asUser("clerk_owner"),
      payload: { contentType: "application/x-msdownload", byteSize: 1024 },
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("attaches a claimed upload to a memory and signs a download URL", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const upload = await requestUploadUrl(app, "clerk_owner");

    const memory = await createMemory(app, "clerk_owner", {
      body: "With a photo",
      mediaStorageKey: upload.json().storageKey,
    });

    assert.equal(memory.statusCode, 201);
    assert.equal(memory.json().mediaStorageKey, upload.json().storageKey);
    assert.ok(memory.json().mediaUrl.startsWith("https://storage.test/download/"));

    const asset = await prisma.mediaAsset.findFirstOrThrow();
    assert.equal(asset.status, "ATTACHED");
    await app.close();
  });

  it("refuses to attach another household's storage key", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const theirUpload = await requestUploadUrl(app, "clerk_b");

    const response = await createMemory(app, "clerk_a", {
      body: "Stealing a photo",
      mediaStorageKey: theirUpload.json().storageKey,
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "MEDIA_NOT_FOUND");
    await app.close();
  });

  it("refuses to attach a key belonging to another member of the same household", async () => {
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
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });

    const partnerUpload = await requestUploadUrl(app, "clerk_partner");
    const response = await createMemory(app, "clerk_owner", {
      body: "Someone else's in-flight upload",
      mediaStorageKey: partnerUpload.json().storageKey,
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("cannot reuse one upload for two memories", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const upload = await requestUploadUrl(app, "clerk_owner");

    await createMemory(app, "clerk_owner", {
      body: "First",
      mediaStorageKey: upload.json().storageKey,
    });
    const second = await createMemory(app, "clerk_owner", {
      body: "Second",
      mediaStorageKey: upload.json().storageKey,
    });

    // The asset is no longer PENDING, so it cannot be claimed again.
    assert.equal(second.statusCode, 404);
    await app.close();
  });

  it("enforces the monthly upload quota, counting pending uploads", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await prisma.entitlementCache.update({
      where: { familyId },
      data: { mediaUploadsPerMonth: 2 },
    });

    await requestUploadUrl(app, "clerk_owner");
    await requestUploadUrl(app, "clerk_owner");
    const third = await requestUploadUrl(app, "clerk_owner");

    assert.equal(third.statusCode, 429);
    const error = third.json().error;
    assert.equal(error.code, "QUOTA_EXCEEDED");
    assert.equal(error.details.limit, 2);
    assert.equal(error.details.upgradeAvailable, true);
    assert.ok(error.details.resetsAt);
    await app.close();
  });
});

describe("GET /api/v1/memories", () => {
  it("returns the household timeline newest first", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await createMemory(app, "clerk_owner", { body: "Older", eventDate: "2026-07-01" });
    await createMemory(app, "clerk_owner", { body: "Newer", eventDate: "2026-07-29" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/memories",
      headers: asUser("clerk_owner"),
    });

    assert.deepEqual(
      response.json().items.map((item: { title: string }) => item.title),
      ["Newer", "Older"],
    );
    await app.close();
  });

  it("pages with a cursor without skipping or repeating", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    for (let day = 1; day <= 5; day += 1) {
      await createMemory(app, "clerk_owner", {
        body: `Memory ${day}`,
        eventDate: `2026-07-0${day}`,
      });
    }

    const first = await app.inject({
      method: "GET",
      url: "/api/v1/memories?limit=2",
      headers: asUser("clerk_owner"),
    });
    assert.equal(first.json().items.length, 2);
    assert.ok(first.json().nextCursor);

    const second = await app.inject({
      method: "GET",
      url: `/api/v1/memories?limit=2&cursor=${encodeURIComponent(first.json().nextCursor)}`,
      headers: asUser("clerk_owner"),
    });
    const third = await app.inject({
      method: "GET",
      url: `/api/v1/memories?limit=2&cursor=${encodeURIComponent(second.json().nextCursor)}`,
      headers: asUser("clerk_owner"),
    });

    const seen = [...first.json().items, ...second.json().items, ...third.json().items].map(
      (item: { id: string }) => item.id,
    );

    assert.equal(seen.length, 5);
    assert.equal(new Set(seen).size, 5, "no memory may appear on two pages");
    assert.equal(third.json().nextCursor, null);
    await app.close();
  });

  it("keeps the whole household timeline when no child filter is given", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    const younger = await addChild(app, "clerk_owner", "Younger", "2026-05-01");

    await createMemory(app, "clerk_owner", { body: "About elder", childId: elder.json().id });
    await createMemory(app, "clerk_owner", { body: "About younger", childId: younger.json().id });

    const all = await app.inject({
      method: "GET",
      url: "/api/v1/memories",
      headers: asUser("clerk_owner"),
    });
    const filtered = await app.inject({
      method: "GET",
      url: `/api/v1/memories?childId=${elder.json().id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(all.json().items.length, 2);
    assert.equal(filtered.json().items.length, 1);
    assert.equal(filtered.json().items[0].title, "About elder");
    await app.close();
  });

  it("rejects a limit above the maximum rather than silently clamping", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/memories?limit=500",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("never returns another household's memories", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    await createMemory(app, "clerk_b", { body: "Private to household B" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/memories",
      headers: asUser("clerk_a"),
    });

    assert.deepEqual(response.json().items, []);
    assert.equal(response.body.includes("Private to household B"), false);
    await app.close();
  });
});

describe("memory mutation", () => {
  it("re-attributes a mis-filed memory", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    const younger = await addChild(app, "clerk_owner", "Younger", "2026-05-01");
    const memory = await createMemory(app, "clerk_owner", { body: "Wrong child" });

    assert.equal(memory.json().childId, younger.json().id);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/memories/${memory.json().id}`,
      headers: asUser("clerk_owner"),
      payload: { childId: elder.json().id },
    });

    assert.equal(response.json().childId, elder.json().id);
    await app.close();
  });

  it("does not move a memory when only the body is edited", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const elder = await addChild(app, "clerk_owner", "Elder", "2024-01-01");
    await addChild(app, "clerk_owner", "Younger", "2026-05-01");
    const memory = await createMemory(app, "clerk_owner", {
      body: "About elder",
      childId: elder.json().id,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/memories/${memory.json().id}`,
      headers: asUser("clerk_owner"),
      payload: { body: "About elder, edited" },
    });

    assert.equal(response.json().childId, elder.json().id);
    await app.close();
  });

  it("stops a contributor editing someone else's memory", async () => {
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
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });
    const ownersMemory = await createMemory(app, "clerk_owner", { body: "Owner's memory" });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/memories/${ownersMemory.json().id}`,
      headers: asUser("clerk_partner"),
      payload: { body: "Edited by contributor" },
    });

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("lets a parent moderate a contributor's memory", async () => {
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
      headers: asUser("clerk_partner"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/invites/${invite.json().token}/accept`,
      headers: asUser("clerk_partner"),
    });
    const theirMemory = await createMemory(app, "clerk_partner", { body: "Contributor memory" });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${theirMemory.json().id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 204);
    await app.close();
  });

  it("soft-deletes, revokes media, and removes the object", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const upload = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-url",
      headers: asUser("clerk_owner"),
      payload: { contentType: "image/jpeg", byteSize: 2048 },
    });
    const memory = await createMemory(app, "clerk_owner", {
      body: "To delete",
      mediaStorageKey: upload.json().storageKey,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${memory.json().id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 204);

    const row = await prisma.memoryEntry.findUniqueOrThrow({ where: { id: memory.json().id } });
    // Soft, so a mis-tap is recoverable during the retention window...
    assert.ok(row.deletedAt);

    const asset = await prisma.mediaAsset.findFirstOrThrow();
    assert.equal(asset.status, "DELETED");
    // ...but the object itself is gone.
    assert.deepEqual(storage.deleted, [upload.json().storageKey]);

    const read = await app.inject({
      method: "GET",
      url: `/api/v1/memories/${memory.json().id}`,
      headers: asUser("clerk_owner"),
    });
    assert.equal(read.statusCode, 404);
    await app.close();
  });

  it("refuses to read or delete another household's memory", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const theirs = await createMemory(app, "clerk_b", { body: "Theirs" });

    const read = await app.inject({
      method: "GET",
      url: `/api/v1/memories/${theirs.json().id}`,
      headers: asUser("clerk_a"),
    });
    const destroy = await app.inject({
      method: "DELETE",
      url: `/api/v1/memories/${theirs.json().id}`,
      headers: asUser("clerk_a"),
    });

    assert.equal(read.statusCode, 404);
    assert.equal(destroy.statusCode, 404);
    const row = await prisma.memoryEntry.findUniqueOrThrow({ where: { id: theirs.json().id } });
    assert.equal(row.deletedAt, null);
    await app.close();
  });
});
