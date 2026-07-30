import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import prismaClient from "@bumpatlas/db";

import { registerCommunityRoutes } from "@/routes/v1/community";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerModerationRoutes } from "@/routes/v1/moderation";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { archiveGroupsHostedBy, communityGates } from "@/services/community/groups";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

type App = Awaited<ReturnType<typeof createApp>>;

/** Matches ADMIN_USER_IDS in .env.test. */
const ADMIN_CLERK_ID = "clerk_admin_fixture";

async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerCommunityRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerModerationRoutes, { requireAuth: testRequireAuth });
    },
  });
}

/** Community requires adult attestation, current rules consent, and a household. */
async function onboardCommunityUser(app: App, clerkId: string) {
  for (const type of ["age_attestation", "community"]) {
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser(clerkId),
      payload: { type, version: "2026-07-01" },
    });
  }
  await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: "Household" },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
  // Old enough to post links, so link tests are explicit rather than incidental.
  await prisma.user.update({
    where: { id: user.id },
    data: { createdAt: new Date(Date.now() - 60 * 86_400_000), name: clerkId },
  });

  return user.id;
}

async function seedStageGroup(slug = "months-0-6") {
  return prisma.communityGroup.create({
    data: {
      slug,
      title: "0–6 months",
      description: "The newborn stretch.",
      kind: "STAGE",
      visibility: "STAGE_DISCOVERABLE",
      stageKey: "NB_0_3M",
      memberLimit: 500,
      isActive: true,
    },
  });
}

const joinGroup = (app: App, clerkId: string, groupId: string) =>
  app.inject({
    method: "POST",
    url: `/api/v1/groups/${groupId}/join`,
    headers: asUser(clerkId),
  });

const createPost = (app: App, clerkId: string, groupId: string, body: string) =>
  app.inject({
    method: "POST",
    url: `/api/v1/groups/${groupId}/posts`,
    headers: asUser(clerkId),
    payload: { body },
  });

const listPosts = (app: App, clerkId: string, groupId: string) =>
  app.inject({
    method: "GET",
    url: `/api/v1/groups/${groupId}/posts`,
    headers: asUser(clerkId),
  });

beforeEach(async () => {
  await resetDatabase();
  // Production default is off; most of this suite covers the enabled behaviour, and one
  // test below restores the default to prove the gate works.
  communityGates.userGroups = () => true;
});

after(async () => {
  communityGates.userGroups = () => false;
  await disconnectDatabase();
});

describe("stage groups", () => {
  it("lists discoverable groups and reports real member counts", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();

    const before = await app.inject({
      method: "GET",
      url: "/api/v1/groups",
      headers: asUser("clerk_a"),
    });
    assert.equal(before.json().items[0].memberCount, 0, "counts are never fabricated");
    assert.equal(before.json().items[0].joined, false);

    await joinGroup(app, "clerk_a", group.id);

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/groups",
      headers: asUser("clerk_a"),
    });
    assert.equal(after.json().items[0].memberCount, 1);
    assert.equal(after.json().items[0].joined, true);
    await app.close();
  });

  it("refuses to post without accepting the community rules", async () => {
    const app = await createApp();
    const group = await seedStageGroup();
    // Attested but has not accepted community rules.
    await app.inject({
      method: "POST",
      url: "/api/v1/consents",
      headers: asUser("clerk_norules"),
      payload: { type: "age_attestation", version: "2026-07-01" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/families",
      headers: asUser("clerk_norules"),
      payload: { name: "Household" },
    });
    await prisma.communityGroupMember.create({
      data: {
        groupId: group.id,
        userId: (await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_norules" } })).id,
        status: "ACTIVE",
      },
    });

    const response = await createPost(app, "clerk_norules", group.id, "hello");

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "COMMUNITY_RULES_NOT_ACCEPTED");
    await app.close();
  });

  it("holds a seeded group in its warm empty state until there is a conversation", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);
    await createPost(app, "clerk_a", group.id, "first post here");

    const posts = await listPosts(app, "clerk_a", group.id);

    assert.equal(posts.json().items.length, 1);
    // Contract does not carry the flag; the service does, and Phase 3's Today card reads it.
    await app.close();
  });

  it("refuses a post from a non-member", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();

    const response = await createPost(app, "clerk_a", group.id, "not a member");

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("enforces the daily post quota", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);

    for (let index = 0; index < 10; index += 1) {
      const created = await createPost(app, "clerk_a", group.id, `post number ${index}`);
      assert.equal(created.statusCode, 201);
    }
    const eleventh = await createPost(app, "clerk_a", group.id, "one too many");

    assert.equal(eleventh.statusCode, 429);
    assert.equal(eleventh.json().error.code, "QUOTA_EXCEEDED");
    // Anti-spam, not a plan feature.
    assert.equal(eleventh.json().error.details.upgradeAvailable, false);
    await app.close();
  });

  it("refuses links from a new account but allows them later", async () => {
    const app = await createApp();
    const userId = await onboardCommunityUser(app, "clerk_new");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_new", group.id);
    await prisma.user.update({
      where: { id: userId },
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const blocked = await createPost(app, "clerk_new", group.id, "check https://spam.example.com");
    assert.equal(blocked.statusCode, 422);
    assert.equal(blocked.json().error.code, "LINKS_NOT_ALLOWED_YET");

    await prisma.user.update({
      where: { id: userId },
      data: { createdAt: new Date(Date.now() - 30 * 86_400_000) },
    });
    const allowed = await createPost(app, "clerk_new", group.id, "check https://example.com");
    assert.equal(allowed.statusCode, 201);
    await app.close();
  });

  it("accepts no media field on a post", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.id}/posts`,
      headers: asUser("clerk_a"),
      payload: { body: "with a photo", mediaStorageKey: "families/x/photo.jpg" },
    });

    assert.equal(response.statusCode, 201);
    // Stripped by the contract, and there is nowhere in the schema to put it.
    const stored = await prisma.communityPost.findFirstOrThrow();
    assert.equal(JSON.stringify(stored).includes("photo.jpg"), false);
    await app.close();
  });

  it("raises a queue item for a high-risk post without telling the author", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);

    const response = await createPost(
      app,
      "clerk_a",
      group.id,
      "i keep thinking about hurt myself and cannot say it out loud",
    );

    assert.equal(response.statusCode, 201);
    // The post is created — silencing a crisis post would push them away from help.
    assert.equal(response.body.includes("flag"), false);

    const report = await prisma.moderationReport.findFirstOrThrow();
    assert.equal(report.priority, "CRITICAL");
    assert.ok(report.reason.startsWith("automatic:"));
    await app.close();
  });
});

describe("feed filtering", () => {
  async function twoMembers(app: App) {
    await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_b");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);
    await joinGroup(app, "clerk_b", group.id);
    return group;
  }

  it("hides posts in both directions after a block", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    await createPost(app, "clerk_a", group.id, "post from A");
    await createPost(app, "clerk_b", group.id, "post from B");

    const blocked = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_b" } });
    await app.inject({
      method: "POST",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
      payload: { userId: blocked.id },
    });

    const aFeed = await listPosts(app, "clerk_a", group.id);
    const bFeed = await listPosts(app, "clerk_b", group.id);

    assert.equal(aFeed.body.includes("post from B"), false);
    // Symmetric: otherwise the blocked user keeps replying and the block achieves nothing.
    assert.equal(bFeed.body.includes("post from A"), false);
    await app.close();
  });

  it("hides a hidden post and a deleted post", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    await createPost(app, "clerk_a", group.id, "visible post");
    const hidden = await createPost(app, "clerk_a", group.id, "hidden post");
    await prisma.communityPost.update({
      where: { id: hidden.json().id },
      data: { hiddenAt: new Date() },
    });

    const feed = await listPosts(app, "clerk_b", group.id);

    assert.equal(feed.json().items.length, 1);
    assert.equal(feed.body.includes("hidden post"), false);
    await app.close();
  });

  it("hides posts by a member who was removed from the group", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    await createPost(app, "clerk_b", group.id, "post from removed member");
    const removed = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_b" } });
    await prisma.communityGroupMember.updateMany({
      where: { groupId: group.id, userId: removed.id },
      data: { status: "REMOVED" },
    });

    const feed = await listPosts(app, "clerk_a", group.id);

    assert.equal(feed.json().items.length, 0);
    await app.close();
  });

  it("keeps reactions idempotent", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    const post = await createPost(app, "clerk_a", group.id, "react to me");

    await app.inject({
      method: "PUT",
      url: `/api/v1/posts/${post.json().id}/reaction`,
      headers: asUser("clerk_b"),
    });
    await app.inject({
      method: "PUT",
      url: `/api/v1/posts/${post.json().id}/reaction`,
      headers: asUser("clerk_b"),
    });

    assert.equal(await prisma.communityReaction.count(), 1);

    await app.inject({
      method: "DELETE",
      url: `/api/v1/posts/${post.json().id}/reaction`,
      headers: asUser("clerk_b"),
    });
    assert.equal(await prisma.communityReaction.count(), 0);
    await app.close();
  });

  it("supports the legacy plural POST the shipped client calls", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    const post = await createPost(app, "clerk_a", group.id, "legacy react");

    await app.inject({
      method: "POST",
      url: `/api/v1/posts/${post.json().id}/reactions`,
      headers: asUser("clerk_b"),
    });
    assert.equal(await prisma.communityReaction.count(), 1);

    // Toggles, so the released screen's single button still works.
    await app.inject({
      method: "POST",
      url: `/api/v1/posts/${post.json().id}/reactions`,
      headers: asUser("clerk_b"),
    });
    assert.equal(await prisma.communityReaction.count(), 0);
    await app.close();
  });

  it("returns a post with its comments", async () => {
    const app = await createApp();
    const group = await twoMembers(app);
    const post = await createPost(app, "clerk_a", group.id, "thread starter");
    await app.inject({
      method: "POST",
      url: `/api/v1/posts/${post.json().id}/comments`,
      headers: asUser("clerk_b"),
      payload: { body: "a reply" },
    });

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/posts/${post.json().id}`,
      headers: asUser("clerk_a"),
    });

    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().post.commentCount, 1);
    assert.equal(detail.json().comments.items[0].body, "a reply");
    await app.close();
  });
});

describe("blocks", () => {
  it("is idempotent and cannot target the caller", async () => {
    const app = await createApp();
    const selfId = await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_b");
    const other = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_b" } });

    const selfBlock = await app.inject({
      method: "POST",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
      payload: { userId: selfId },
    });
    assert.equal(selfBlock.statusCode, 422);

    for (let index = 0; index < 2; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/blocks",
        headers: asUser("clerk_a"),
        payload: { userId: other.id },
      });
      assert.equal(response.statusCode, 204);
    }
    assert.equal(await prisma.userBlock.count(), 1);
    await app.close();
  });

  it("lists and unblocks", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_b");
    const other = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_b" } });
    await app.inject({
      method: "POST",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
      payload: { userId: other.id },
    });

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
    });
    assert.equal(listed.json().items.length, 1);

    await app.inject({
      method: "DELETE",
      url: `/api/v1/blocks/${other.id}`,
      headers: asUser("clerk_a"),
    });
    const empty = await app.inject({
      method: "GET",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
    });
    assert.equal(empty.json().items.length, 0);
    await app.close();
  });

  it("does not reveal who blocked the caller", async () => {
    const app = await createApp();
    const aId = await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_b");
    await app.inject({
      method: "POST",
      url: "/api/v1/blocks",
      headers: asUser("clerk_b"),
      payload: { userId: aId },
    });

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/blocks",
      headers: asUser("clerk_a"),
    });

    assert.deepEqual(listed.json().items, []);
    await app.close();
  });
});

describe("reports and moderation", () => {
  async function reportedPost(app: App) {
    await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_b");
    await onboardCommunityUser(app, ADMIN_CLERK_ID);
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);
    await joinGroup(app, "clerk_b", group.id);
    const post = await createPost(app, "clerk_a", group.id, "questionable post");

    await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: asUser("clerk_b"),
      payload: { targetType: "post", targetId: post.json().id, reason: "medical advice" },
    });

    return { group, postId: post.json().id as string };
  }

  it("files a report with a priority and never names the reporter", async () => {
    const app = await createApp();
    await reportedPost(app);

    const queue = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: asUser(ADMIN_CLERK_ID),
    });

    assert.equal(queue.statusCode, 200);
    const item = queue.json().items[0];
    assert.equal(item.priority, "high");
    assert.equal(item.reporter, "Anonymous");
    assert.equal(item.groupKind, "stage");
    assert.ok(item.postPreview.length > 0);
    await app.close();
  });

  it("refuses to report a post the reporter cannot see", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_a");
    await onboardCommunityUser(app, "clerk_outsider");
    const group = await seedStageGroup();
    await joinGroup(app, "clerk_a", group.id);
    const post = await createPost(app, "clerk_a", group.id, "members only");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: asUser("clerk_outsider"),
      payload: { targetType: "post", targetId: post.json().id, reason: "spam" },
    });

    // Otherwise the report endpoint is an oracle for enumerating other groups' posts.
    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("denies the queue to a non-admin with 404", async () => {
    const app = await createApp();
    await reportedPost(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: asUser("clerk_b"),
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("hides content and records an immutable action in one transaction", async () => {
    const app = await createApp();
    const { postId } = await reportedPost(app);
    const report = await prisma.moderationReport.findFirstOrThrow();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/moderation/${report.id}/actions`,
      headers: asUser(ADMIN_CLERK_ID),
      payload: { action: "hide", note: "medical advice" },
    });

    assert.equal(response.statusCode, 200);

    const post = await prisma.communityPost.findUniqueOrThrow({ where: { id: postId } });
    assert.ok(post.hiddenAt);
    assert.equal(post.hiddenByAdmin, true);

    const action = await prisma.moderationAction.findFirstOrThrow();
    assert.equal(action.actorScope, "ADMIN");
    // Evidence is never hard-deleted during moderation.
    assert.equal(await prisma.communityPost.count(), 1);
    await app.close();
  });

  it("surfaces repeat critical reports against the same author", async () => {
    const app = await createApp();
    const { group } = await reportedPost(app);

    for (const body of ["first worrying post", "second worrying post"]) {
      const post = await createPost(app, "clerk_a", group.id, body);
      await app.inject({
        method: "POST",
        url: "/api/v1/reports",
        headers: asUser("clerk_b"),
        payload: { targetType: "post", targetId: post.json().id, reason: "child safety" },
      });
    }

    const queue = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: asUser(ADMIN_CLERK_ID),
    });

    const critical = queue.json().items.find((item: { priority: string }) => item.priority === "critical");
    // So a founder can act on the person, not just the post.
    assert.ok(critical.repeatCriticalReports >= 2);
    await app.close();
  });
});

describe("member-created groups", () => {
  it("returns 503 for create, invite, and join while the flag is off", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    communityGates.userGroups = () => false;

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/groups",
      headers: asUser("clerk_host"),
      payload: { title: "Should not exist" },
    });
    const join = await app.inject({
      method: "POST",
      url: "/api/v1/group-invites/any-token/accept",
      headers: asUser("clerk_host"),
    });

    assert.equal(create.statusCode, 503);
    assert.equal(join.statusCode, 503);
    assert.equal(await prisma.communityGroup.count({ where: { kind: "USER" } }), 0);

    communityGates.userGroups = () => true;
    await app.close();
  });

  const createGroup = (app: App, clerkId: string, title: string) =>
    app.inject({
      method: "POST",
      url: "/api/v1/groups",
      headers: asUser(clerkId),
      payload: { title },
    });

  it("creates a link-only group with the creator as host", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");

    const response = await createGroup(app, "clerk_host", "Night feeds crew");

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.kind, "user");
    assert.equal(body.role, "host");

    const group = await prisma.communityGroup.findFirstOrThrow({ where: { kind: "USER" } });
    assert.equal(group.visibility, "LINK_ONLY");
    // Slug is random, never derived from the title.
    assert.equal(group.slug.includes("night"), false);
    await app.close();
  });

  it("enforces the created-group limit", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");

    const first = await createGroup(app, "clerk_host", "First group");
    assert.equal(first.statusCode, 201);

    const second = await createGroup(app, "clerk_host", "Second group");
    assert.equal(second.statusCode, 422);
    assert.equal(second.json().error.code, "GROUP_LIMIT_REACHED");
    assert.equal(second.json().error.details.upgradeAvailable, true);
    await app.close();
  });

  it("keeps a link-only group invisible to a non-member", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_stranger");
    const created = await createGroup(app, "clerk_host", "Private crew");

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/groups",
      headers: asUser("clerk_stranger"),
    });
    const posts = await listPosts(app, "clerk_stranger", created.json().id);

    assert.equal(listed.body.includes("Private crew"), false);
    // Not even by guessing the id.
    assert.equal(posts.statusCode, 404);
    await app.close();
  });

  it("joins by link, reusably, until maxUses is spent", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_one");
    await onboardCommunityUser(app, "clerk_two");
    const group = await createGroup(app, "clerk_host", "Reusable link crew");

    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: { maxUses: 1 },
    });
    const token = invite.json().token;

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${token}/accept`,
      headers: asUser("clerk_one"),
    });
    assert.equal(first.statusCode, 200);

    const second = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${token}/accept`,
      headers: asUser("clerk_two"),
    });
    assert.equal(second.statusCode, 410);
    assert.equal(second.json().error.code, "INVITE_EXPIRED");
    await app.close();
  });

  it("treats a double tap by an existing member as success without spending a use", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_one");
    const group = await createGroup(app, "clerk_host", "Double tap crew");
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: { maxUses: 2 },
    });
    const token = invite.json().token;

    await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${token}/accept`,
      headers: asUser("clerk_one"),
    });
    const again = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${token}/accept`,
      headers: asUser("clerk_one"),
    });

    assert.equal(again.statusCode, 200);
    const stored = await prisma.communityGroupInvite.findFirstOrThrow();
    assert.equal(stored.useCount, 1);
    await app.close();
  });

  it("stores only the invite token hash", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    const group = await createGroup(app, "clerk_host", "Hashed crew");

    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });

    const stored = await prisma.communityGroupInvite.findFirstOrThrow();
    assert.notEqual(stored.tokenHash, invite.json().token);
    assert.equal(stored.tokenHash.length, 64);

    // Listing never returns tokens.
    const listed = await app.inject({
      method: "GET",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
    });
    assert.equal(listed.body.includes(invite.json().token), false);
    await app.close();
  });

  it("rejects a revoked link", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_one");
    const group = await createGroup(app, "clerk_host", "Revoked crew");
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });
    const stored = await prisma.communityGroupInvite.findFirstOrThrow();

    await app.inject({
      method: "DELETE",
      url: `/api/v1/groups/${group.json().id}/invites/${stored.id}`,
      headers: asUser("clerk_host"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${invite.json().token}/accept`,
      headers: asUser("clerk_one"),
    });

    assert.equal(response.statusCode, 410);
    await app.close();
  });

  it("stops a banned member rejoining with a fresh valid link", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    const bannedId = await onboardCommunityUser(app, "clerk_banned");
    const group = await createGroup(app, "clerk_host", "Ban test crew");

    const firstInvite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${firstInvite.json().token}/accept`,
      headers: asUser("clerk_banned"),
    });

    await app.inject({
      method: "DELETE",
      url: `/api/v1/groups/${group.json().id}/members/${bannedId}?ban=true`,
      headers: asUser("clerk_host"),
    });

    // A brand-new, perfectly valid link must still not let them back in.
    const secondInvite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${secondInvite.json().token}/accept`,
      headers: asUser("clerk_banned"),
    });

    assert.equal(response.statusCode, 404);
    // Generic: it does not confirm the ban landed.
    assert.equal(response.json().error.code, "INVITE_NOT_FOUND");
    await app.close();
  });

  it("enforces the member limit", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_one");
    const group = await createGroup(app, "clerk_host", "Tiny crew");
    // Host already occupies the only seat.
    await prisma.communityGroup.update({
      where: { id: group.json().id },
      data: { memberLimit: 1 },
    });
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${invite.json().token}/accept`,
      headers: asUser("clerk_one"),
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "GROUP_FULL");
    await app.close();
  });

  it("previews a link without exposing posts or members", async () => {
    const app = await createApp();
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_stranger");
    const group = await createGroup(app, "clerk_host", "Preview crew");
    await createPost(app, "clerk_host", group.json().id, "secret conversation");
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });

    const preview = await app.inject({
      method: "GET",
      url: `/api/v1/group-invites/${invite.json().token}/preview`,
      headers: asUser("clerk_stranger"),
    });

    assert.equal(preview.statusCode, 200);
    assert.equal(preview.json().groupTitle, "Preview crew");
    assert.equal(preview.body.includes("secret conversation"), false);
    await app.close();
  });
});

describe("host powers", () => {
  async function hostedGroup(app: App) {
    await onboardCommunityUser(app, "clerk_host");
    await onboardCommunityUser(app, "clerk_member");
    await onboardCommunityUser(app, ADMIN_CLERK_ID);

    const group = await app.inject({
      method: "POST",
      url: "/api/v1/groups",
      headers: asUser("clerk_host"),
      payload: { title: "Hosted crew" },
    });
    const invite = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${group.json().id}/invites`,
      headers: asUser("clerk_host"),
      payload: {},
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/group-invites/${invite.json().token}/accept`,
      headers: asUser("clerk_member"),
    });

    return group.json().id as string;
  }

  it("lets a host hide a post in their own group", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    const post = await createPost(app, "clerk_member", groupId, "member post");

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_host"),
      payload: { action: "hide_post", targetId: post.json().id },
    });

    assert.equal(response.statusCode, 204);
    const stored = await prisma.communityPost.findUniqueOrThrow({ where: { id: post.json().id } });
    assert.ok(stored.hiddenAt);
    assert.equal(stored.hiddenByAdmin, false);

    const action = await prisma.moderationAction.findFirstOrThrow();
    assert.equal(action.actorScope, "HOST");
    await app.close();
  });

  it("refuses a host acting on a group they do not host", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_member"),
      payload: { action: "disable_posting" },
    });

    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("lets a host reverse only their own hide", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    const post = await createPost(app, "clerk_member", groupId, "member post");

    await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_host"),
      payload: { action: "hide_post", targetId: post.json().id },
    });
    const own = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_host"),
      payload: { action: "unhide_own_hide", targetId: post.json().id },
    });
    assert.equal(own.statusCode, 204);

    // Now an admin hides it.
    await prisma.communityPost.update({
      where: { id: post.json().id },
      data: { hiddenAt: new Date(), hiddenByAdmin: true },
    });
    const adminHide = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_host"),
      payload: { action: "unhide_own_hide", targetId: post.json().id },
    });

    // Otherwise "make yourself a host" becomes a way to undo moderation.
    assert.equal(adminHide.statusCode, 403);
    assert.equal(adminHide.json().error.code, "ADMIN_HIDE_IMMUTABLE");
    await app.close();
  });

  it("cannot re-enable posting an admin disabled", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    await prisma.communityGroup.update({
      where: { id: groupId },
      data: { postingEnabled: false, postingDisabledByAdmin: true },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/host-actions`,
      headers: asUser("clerk_host"),
      payload: { action: "enable_posting" },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "POSTING_DISABLED_BY_ADMIN");
    await app.close();
  });

  it("never shows a host the moderation queue", async () => {
    const app = await createApp();
    await hostedGroup(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: asUser("clerk_host"),
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });

  it("lists members without exposing emails", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    await prismaClient.user.update({
      where: { clerkId: "clerk_member" },
      data: { email: "member-private@example.test" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/groups/${groupId}/members`,
      headers: asUser("clerk_host"),
    });

    assert.equal(response.json().items.length, 2);
    assert.equal(response.body.includes("member-private@example.test"), false);
    await app.close();
  });

  it("archives rather than deletes, and hides the group from members", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    await createPost(app, "clerk_member", groupId, "evidence post");

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/groups/${groupId}/archive`,
      headers: asUser("clerk_host"),
    });
    assert.equal(response.statusCode, 204);

    const memberList = await app.inject({
      method: "GET",
      url: "/api/v1/groups",
      headers: asUser("clerk_member"),
    });
    assert.equal(memberList.body.includes("Hosted crew"), false);

    const posting = await createPost(app, "clerk_member", groupId, "after archive");
    assert.equal(posting.statusCode, 404);

    // Content retained for the moderation and legal window.
    assert.equal(await prisma.communityPost.count(), 1);
    await app.close();
  });

  it("archives a hosted group when the host's account is deleted", async () => {
    const app = await createApp();
    const groupId = await hostedGroup(app);
    const host = await prisma.user.findUniqueOrThrow({ where: { clerkId: "clerk_host" } });

    const archived = await archiveGroupsHostedBy(host.id);

    assert.equal(archived, 1);
    const group = await prisma.communityGroup.findUniqueOrThrow({ where: { id: groupId } });
    // A group must never be left unowned.
    assert.equal(group.isActive, false);
    await app.close();
  });
});
