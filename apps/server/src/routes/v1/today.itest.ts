import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerContentRoutes } from "@/routes/v1/content";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerMemoryRoutes } from "@/routes/v1/memories";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { registerTodayRoutes } from "@/routes/v1/today";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";
import { createFakeSigner } from "@/test/helpers/storage";

type App = Awaited<ReturnType<typeof createApp>>;

async function createApp() {
  const storage = createFakeSigner();

  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerMemoryRoutes, {
        requireAuth: testRequireAuth,
        getSigner: storage.getSigner,
      });
      fastify.register(registerTodayRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerContentRoutes, { requireAuth: testRequireAuth });
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
  await app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName: "Ava", dateOfBirth: "2026-05-01" },
  });
  return family.json().id as string;
}

/** Published prompts so the plan has something to choose from. */
async function seedPrompts(count = 5) {
  for (let index = 0; index < count; index += 1) {
    await prisma.contentItem.create({
      data: {
        slug: `prompt-${index}`,
        type: "MEMORY_PROMPT",
        title: `Prompt ${index}`,
        summary: `Prompt ${index}`,
        bodyMarkdown: `Prompt ${index}`,
        stageTags: [],
        isPublished: true,
      },
    });
  }
}

async function seedLearnItem(overrides: { isPublished?: boolean; slug?: string } = {}) {
  return prisma.contentItem.create({
    data: {
      slug: overrides.slug ?? "wake-windows",
      type: "PARENTING_TIP",
      title: "Wake windows around 12 weeks",
      summary: "Watch cues, not the clock alone.",
      bodyMarkdown: "## Wake windows\n\nSome text.",
      stageTags: [],
      reviewerName: "Dr Test Reviewer",
      reviewedOn: new Date("2026-03-12T00:00:00.000Z"),
      isPublished: overrides.isPublished ?? true,
    },
  });
}

const getToday = (app: App, clerkId: string) =>
  app.inject({ method: "GET", url: "/api/v1/today", headers: asUser(clerkId) });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("GET /api/v1/today", () => {
  it("returns a plan and freezes it for the day", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    const first = await getToday(app, "clerk_owner");
    const second = await getToday(app, "clerk_owner");

    assert.equal(first.statusCode, 200);
    // Same plan on every read: refetching must not reshuffle the day.
    assert.equal(second.json().prompt, first.json().prompt);
    assert.equal(await prisma.dailyPlan.count(), 1);
    await app.close();
  });

  it("leaves the care card null rather than showing unreviewed content", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();
    // An action exists but has no reviewer, so it is unpublished.
    await prisma.wellnessAction.create({
      data: {
        slug: "unreviewed",
        title: "Unreviewed action",
        detail: "x",
        duration: "2 min",
        durationSeconds: 120,
        stageNote: "x",
        stageTags: [],
        clearanceCopy: "x",
        stopCopy: "x",
        steps: [],
        isPublished: false,
      },
    });

    const response = await getToday(app, "clerk_owner");

    assert.equal(response.json().cards.care, null);
    assert.equal(response.body.includes("Unreviewed action"), false);
    await app.close();
  });

  it("includes a published wellness action with its safety copy", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();
    await prisma.wellnessAction.create({
      data: {
        slug: "breathing",
        title: "Two-minute breathing reset",
        detail: "A quiet pause.",
        duration: "2 min",
        durationSeconds: 120,
        stageNote: "Gentle for most parents.",
        stageTags: [],
        clearanceCopy: "Check with your clinician first if advised to rest.",
        stopCopy: "Stop if you feel dizzy.",
        steps: [{ id: "s1", title: "Sit", body: "Find a steady spot." }],
        reviewerName: "Dr Test Reviewer",
        reviewedOn: new Date("2026-03-12T00:00:00.000Z"),
        isPublished: true,
      },
    });

    const response = await getToday(app, "clerk_owner");
    const care = response.json().cards.care;

    assert.equal(care.title, "Two-minute breathing reset");
    // The Care screen cannot render safely without these.
    assert.ok(care.clearanceCopy);
    assert.ok(care.stopCopy);
    assert.equal(care.reviewerName, "Dr Test Reviewer");
    assert.equal(care.steps.length, 1);
    await app.close();
  });

  it("reports quota counters from the database, not the client", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await seedPrompts();
    await prisma.entitlementCache.update({
      where: { familyId },
      data: { mediaUploadsPerMonth: 30, aiDailyLimit: 10 },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-url",
      headers: asUser("clerk_owner"),
      payload: { familyId, contentType: "image/jpeg", byteSize: 1024 },
    });

    const response = await getToday(app, "clerk_owner");
    const body = response.json();

    assert.equal(body.mediaUploadsUsed, 1);
    assert.equal(body.mediaUploadsLimit, 30);
    assert.equal(body.aiDailyLimit, 10);
    assert.equal(body.isPremium, false);
    await app.close();
  });

  it("does not regenerate the plan when the active child changes", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();
    const other = await app.inject({
      method: "POST",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
      payload: { displayName: "Elder", dateOfBirth: "2023-01-01" },
    });

    const before = await getToday(app, "clerk_owner");
    await app.inject({
      method: "POST",
      url: `/api/v1/children/${other.json().id}/activate`,
      headers: asUser("clerk_owner"),
    });
    const after = await getToday(app, "clerk_owner");

    // Regenerating would erase today's completions and let a user farm progress by
    // toggling siblings.
    assert.equal(after.json().prompt, before.json().prompt);
    assert.equal(await prisma.dailyPlan.count(), 1);
    await app.close();
  });

  it("requires a household", async () => {
    const app = await createApp();

    const response = await getToday(app, "clerk_nobody");

    assert.equal(response.statusCode, 404);
    await app.close();
  });
});

describe("POST /api/v1/challenges/complete", () => {
  it("marks the capture loop complete and counts one story day", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "capture" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.loopCompletion.capture, true);
    assert.equal(body.weekProgress.storyDays, 1);
    assert.equal(body.weekProgress.activeDays, 1);
    await app.close();
  });

  it("does not double-count a repeated completion", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "capture" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "capture" },
    });

    assert.equal(second.json().weekProgress.storyDays, 1);
    assert.equal(await prisma.challengeCompletion.count(), 1);
    await app.close();
  });

  it("counts story and wellness on one day as a single active day", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "capture" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "care" },
    });

    const progress = response.json().weekProgress;

    assert.equal(progress.storyDays, 1);
    assert.equal(progress.wellnessDays, 1);
    // The union, not the sum: otherwise a 4-of-7 goal is reachable in two days.
    assert.equal(progress.activeDays, 1);
    await app.close();
  });

  it("awards the wellness badge once", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "care" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "care" },
    });

    assert.equal(await prisma.badgeAward.count({ where: { badgeKey: "care_pause" } }), 1);

    const badges = await app.inject({
      method: "GET",
      url: "/api/v1/badges",
      headers: asUser("clerk_owner"),
    });
    const earned = badges.json().items.filter((badge: { earnedAt: string | null }) => badge.earnedAt);
    assert.equal(earned.length, 1);
    await app.close();
  });

  it("rejects a challenge that is not part of the plan", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "content_from_another_day" },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "CHALLENGE_NOT_IN_PLAN");
    await app.close();
  });

  it("refuses a viewer", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();
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

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_viewer"),
      payload: { challengeId: "capture" },
    });

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("keeps completions separate per user in one household", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts();
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
      url: "/api/v1/challenges/complete",
      headers: asUser("clerk_owner"),
      payload: { challengeId: "capture" },
    });

    const partnerToday = await getToday(app, "clerk_partner");

    // Completions are per user: one parent's capture is not the other's.
    assert.equal(partnerToday.json().loopCompletion.capture, false);
    await app.close();
  });
});

describe("content", () => {
  it("lists published content and hides drafts", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedLearnItem({ slug: "published-tip" });
    await seedLearnItem({ slug: "draft-tip", isPublished: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/content",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.json().items.length, 1);
    assert.equal(response.body.includes("draft-tip"), false);
    await app.close();
  });

  it("hides withdrawn content on the next read", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const item = await seedLearnItem();
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { withdrawnAt: new Date() },
    });

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/content",
      headers: asUser("clerk_owner"),
    });
    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/content/${item.slug}`,
      headers: asUser("clerk_owner"),
    });

    // Withdrawal is how a safety issue is pulled, so it must take effect immediately.
    assert.equal(list.json().items.length, 0);
    assert.equal(detail.statusCode, 404);
    await app.close();
  });

  it("returns reviewer provenance on the detail response", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const item = await seedLearnItem();

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/content/${item.slug}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.json().reviewerName, "Dr Test Reviewer");
    assert.equal(response.json().reviewedOn, "2026-03-12");
    await app.close();
  });

  it("excludes memory prompts from the library", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedPrompts(3);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/content",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.json().items.length, 0);
    await app.close();
  });

  it("toggles a bookmark without creating duplicates", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const item = await seedLearnItem();

    const on = await app.inject({
      method: "POST",
      url: `/api/v1/content/${item.id}/bookmark`,
      headers: asUser("clerk_owner"),
    });
    assert.equal(on.statusCode, 204);
    assert.equal(await prisma.contentBookmark.count(), 1);

    await app.inject({
      method: "POST",
      url: `/api/v1/content/${item.id}/bookmark`,
      headers: asUser("clerk_owner"),
    });
    assert.equal(await prisma.contentBookmark.count(), 0);
    await app.close();
  });

  it("keeps bookmarks private to each user", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const item = await seedLearnItem();

    await app.inject({
      method: "POST",
      url: `/api/v1/content/${item.id}/bookmark`,
      headers: asUser("clerk_a"),
    });

    const theirs = await app.inject({
      method: "GET",
      url: "/api/v1/content",
      headers: asUser("clerk_b"),
    });

    assert.equal(theirs.json().items[0].bookmarked, false);
    await app.close();
  });
});

describe("milestones", () => {
  async function seedDefinition(slug = "social-smile") {
    return prisma.milestoneDefinition.create({
      data: {
        slug,
        title: "Social smile",
        guidance: "A smile that answers your face. Babies find this at their own pace.",
        domain: "social",
        stageTags: [],
        reviewerName: "Dr Test Reviewer",
        reviewedOn: new Date("2026-03-12T00:00:00.000Z"),
        isPublished: true,
      },
    });
  }

  it("lists definitions with the resolved child", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await seedDefinition();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/milestones",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.ok(body.childId, "the resolved child must be echoed back");
    assert.equal(body.definitions.length, 1);
    assert.deepEqual(body.observations, []);
    await app.close();
  });

  it("returns an empty set during pregnancy instead of failing", async () => {
    const app = await createApp();
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_expecting"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers: asUser("clerk_expecting"),
      payload: { name: "Expecting" },
    });
    await seedDefinition();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/milestones",
      headers: asUser("clerk_expecting"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().childId, null);
    assert.deepEqual(response.json().definitions, []);
    await app.close();
  });

  it("upserts one observation per child and definition", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const definition = await seedDefinition();
    const children = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });
    const childId = children.json()[0].id;

    const first = await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_owner"),
      payload: { childId, status: "emerging" },
    });
    const second = await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_owner"),
      payload: { childId, status: "observed" },
    });

    assert.equal(first.json().status, "emerging");
    assert.equal(first.json().observedAt, null);
    assert.equal(second.json().status, "observed");
    // Timestamped only once actually observed.
    assert.ok(second.json().observedAt);
    assert.equal(await prisma.milestoneObservation.count(), 1);
    await app.close();
  });

  it("tracks siblings independently", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const definition = await seedDefinition();
    const elder = await app.inject({
      method: "POST",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
      payload: { displayName: "Elder", dateOfBirth: "2023-01-01" },
    });
    const children = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });
    const younger = children.json().find((child: { displayName: string }) => child.displayName === "Ava");

    await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_owner"),
      payload: { childId: elder.json().id, status: "observed" },
    });
    await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_owner"),
      payload: { childId: younger.id, status: "not_observed" },
    });

    assert.equal(await prisma.milestoneObservation.count(), 2);

    const forYounger = await app.inject({
      method: "GET",
      url: `/api/v1/milestones?childId=${younger.id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(forYounger.json().observations.length, 1);
    assert.equal(forYounger.json().observations[0].status, "not_observed");
    await app.close();
  });

  it("refuses an observation against another household's child", async () => {
    const app = await createApp();
    await onboard(app, "clerk_a");
    await onboard(app, "clerk_b");
    const definition = await seedDefinition();
    const theirChildren = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_b"),
    });

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_a"),
      payload: { childId: theirChildren.json()[0].id, status: "observed" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(await prisma.milestoneObservation.count(), 0);
    await app.close();
  });

  it("rejects a status outside the four allowed values", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const definition = await seedDefinition();
    const children = await app.inject({
      method: "GET",
      url: "/api/v1/children",
      headers: asUser("clerk_owner"),
    });

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/milestones/${definition.id}/observation`,
      headers: asUser("clerk_owner"),
      payload: { childId: children.json()[0].id, status: "delayed" },
    });

    // "delayed" is diagnostic language the product never accepts.
    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("hides unpublished definitions", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await prisma.milestoneDefinition.create({
      data: {
        slug: "unreviewed",
        title: "Unreviewed milestone",
        guidance: "x",
        domain: "motor",
        stageTags: [],
        isPublished: false,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/milestones",
      headers: asUser("clerk_owner"),
    });

    assert.deepEqual(response.json().definitions, []);
    await app.close();
  });
});
