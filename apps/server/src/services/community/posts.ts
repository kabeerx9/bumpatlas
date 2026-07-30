import prisma from "@bumpatlas/db";
import type { Comment, GroupPost, PostDetail } from "@bumpatlas/contracts/v1";
import type { CommunityPost, Prisma } from "@bumpatlas/db/types";

import { writeAuditEvent } from "@/services/audit";
import {
  requireGroupMembership,
  STAGE_GROUP_POST_THRESHOLD,
} from "@/services/community/groups";
import {
  assertCommunityEligible,
  assertDailyQuota,
  canPostLinks,
  isWithinModerationCoverage,
  scanText,
} from "@/services/community/safety";
import { ServiceError } from "@/services/errors";
import { trackProductEvent } from "@/services/product-event";

/**
 * Every user this caller cannot see, in either direction.
 *
 * Both directions from one query: A blocking B must hide A from B as well, or the blocked
 * user simply keeps replying and the block achieves nothing.
 */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
    select: { blockerUserId: true, blockedUserId: true },
  });

  return [
    ...new Set(
      blocks.flatMap((block) =>
        block.blockerUserId === userId ? [block.blockedUserId] : [block.blockerUserId],
      ),
    ),
  ];
}

/**
 * The single visibility filter for community content.
 *
 * Deleted, hidden, blocked-in-either-direction, and non-member authorship are excluded in
 * *one* query rather than filtered afterwards. Post-filtering is how a hidden post ends up
 * on page two when page one was full of it.
 */
function visiblePostWhere(input: {
  groupId: string;
  blockedIds: string[];
}): Prisma.CommunityPostWhereInput {
  return {
    groupId: input.groupId,
    deletedAt: null,
    hiddenAt: null,
    ...(input.blockedIds.length > 0 ? { authorUserId: { notIn: input.blockedIds } } : {}),
    // Authors who were removed or banned from the group stop being visible in it.
    author: {
      groupMemberships: { some: { groupId: input.groupId, status: "ACTIVE" } },
    },
  };
}

async function serializePost(input: {
  post: CommunityPost & {
    author: { name: string | null };
    _count?: { comments: number; reactions: number };
  };
  reactedByMe: boolean;
}): Promise<GroupPost> {
  return {
    id: input.post.id,
    groupId: input.post.groupId,
    authorId: input.post.authorUserId,
    authorName: input.post.author.name ?? "Parent",
    body: input.post.body,
    reactionCount: input.post._count?.reactions ?? 0,
    reactedByMe: input.reactedByMe,
    commentCount: input.post._count?.comments ?? 0,
    createdAt: input.post.createdAt.toISOString(),
  };
}

export async function listGroupPosts(input: {
  userId: string;
  groupId: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: GroupPost[]; nextCursor: string | null; warmEmptyState: boolean }> {
  const { group } = await requireGroupMembership(input);
  const blockedIds = await blockedUserIds(input.userId);

  const where = visiblePostWhere({ groupId: group.id, blockedIds });

  const posts = await prisma.communityPost.findMany({
    where: {
      ...where,
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
  });

  const hasMore = posts.length > input.limit;
  const page = hasMore ? posts.slice(0, input.limit) : posts;

  const myReactions = await prisma.communityReaction.findMany({
    where: { userId: input.userId, postId: { in: page.map((post) => post.id) } },
    select: { postId: true },
  });
  const reacted = new Set(myReactions.map((reaction) => reaction.postId));

  const total = await prisma.communityPost.count({ where });

  return {
    items: await Promise.all(
      page.map((post) => serializePost({ post, reactedByMe: reacted.has(post.id) })),
    ),
    nextCursor: hasMore ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
    /**
     * Seeded cohorts stay in their warm empty state until there is a real conversation.
     * Member-created groups show their content from the first post — a group of five friends
     * would otherwise look broken.
     */
    warmEmptyState: group.kind === "STAGE" && total < STAGE_GROUP_POST_THRESHOLD,
  };
}

export async function createPost(input: {
  userId: string;
  groupId: string;
  body: string;
}): Promise<GroupPost> {
  const { group } = await requireGroupMembership(input);
  await assertCommunityEligible(input.userId);

  if (!group.postingEnabled || group.postingDisabledByAdmin) {
    throw new ServiceError(403, "POSTING_DISABLED", "Posting is turned off in this group.");
  }

  /**
   * Outside moderation coverage, posting closes while reading, reporting, and blocking stay
   * open. Accepting new posts with nobody watching is how a crisis post sits unanswered —
   * and how abuse sits unremoved — for hours.
   */
  if (!isWithinModerationCoverage()) {
    throw new ServiceError(
      503,
      "POSTING_PAUSED",
      "Posting is paused overnight while moderators are offline. You can still read, report, and block.",
    );
  }

  await assertDailyQuota({ userId: input.userId, kind: "post" });

  const author = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { createdAt: true },
  });

  const scan = scanText(input.body);

  if (scan.containsLink && !canPostLinks(author.createdAt)) {
    throw new ServiceError(
      422,
      "LINKS_NOT_ALLOWED_YET",
      "New accounts cannot post links yet.",
    );
  }

  const post = await prisma.communityPost.create({
    data: { groupId: group.id, authorUserId: input.userId, body: input.body },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  /**
   * An automatic flag raises a queue item but is never surfaced to other users, and never to
   * the author: telling someone their post was flagged for "high risk" would either shame
   * them or teach them how to word around it.
   */
  if (scan.flagged) {
    await raiseAutomaticFlag({
      groupId: group.id,
      targetId: post.id,
      targetAuthorUserId: input.userId,
      flags: scan.flags,
    });
  }

  await trackProductEvent("POST_CREATED", {
    actorUserId: input.userId,
    metadata: { flagged: scan.flagged, isUserGroup: group.kind === "USER" },
  });

  return serializePost({ post, reactedByMe: false });
}

async function raiseAutomaticFlag(input: {
  groupId: string;
  targetId: string;
  targetAuthorUserId: string;
  flags: string[];
}): Promise<void> {
  await prisma.moderationReport.create({
    data: {
      // Self-reported by the system: the author is used as reporter so the column stays
      // non-null, and the reason marks it as automatic.
      reporterUserId: input.targetAuthorUserId,
      targetType: "POST",
      targetId: input.targetId,
      targetAuthorUserId: input.targetAuthorUserId,
      groupId: input.groupId,
      reason: `automatic:${input.flags.join(",")}`,
      priority: input.flags.includes("high_risk") ? "CRITICAL" : "HIGH",
    },
  });

  await writeAuditEvent({
    action: "community.auto_flagged",
    targetType: "post",
    targetId: input.targetId,
    // Flag categories only, never the post text.
    metadata: { flags: input.flags.length },
  });
}

/** A post and its first page of comments — the released detail screen needs both. */
export async function getPostDetail(input: {
  userId: string;
  postId: string;
  limit: number;
}): Promise<PostDetail> {
  const post = await requireVisiblePost(input);

  const blockedIds = await blockedUserIds(input.userId);

  const comments = await prisma.communityComment.findMany({
    where: {
      postId: post.id,
      deletedAt: null,
      hiddenAt: null,
      ...(blockedIds.length > 0 ? { authorUserId: { notIn: blockedIds } } : {}),
    },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: input.limit + 1,
  });

  const hasMore = comments.length > input.limit;
  const page = hasMore ? comments.slice(0, input.limit) : comments;

  const [reactionCount, commentCount, myReaction] = await Promise.all([
    prisma.communityReaction.count({ where: { postId: post.id } }),
    prisma.communityComment.count({ where: { postId: post.id, deletedAt: null, hiddenAt: null } }),
    prisma.communityReaction.findFirst({ where: { postId: post.id, userId: input.userId } }),
  ]);

  return {
    post: {
      id: post.id,
      groupId: post.groupId,
      authorId: post.authorUserId,
      authorName: post.author.name ?? "Parent",
      body: post.body,
      reactionCount,
      reactedByMe: Boolean(myReaction),
      commentCount,
      createdAt: post.createdAt.toISOString(),
    },
    comments: {
      items: page.map(serializeComment),
      nextCursor: hasMore ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
    },
  };
}

function serializeComment(comment: {
  id: string;
  authorUserId: string;
  author: { name: string | null };
  body: string;
  createdAt: Date;
}): Comment {
  return {
    id: comment.id,
    authorId: comment.authorUserId,
    authorName: comment.author.name ?? "Parent",
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * Resolves a post the caller may see.
 *
 * Membership, visibility, and blocks are all checked here, so no caller can reach a post by
 * knowing its ID.
 */
export async function requireVisiblePost(input: { userId: string; postId: string }) {
  const post = await prisma.communityPost.findFirst({
    where: { id: input.postId, deletedAt: null, hiddenAt: null },
    include: { author: { select: { name: true } } },
  });

  if (!post) {
    throw new ServiceError(404, "POST_NOT_FOUND", "Post not found.");
  }

  await requireGroupMembership({ userId: input.userId, groupId: post.groupId });

  const blockedIds = await blockedUserIds(input.userId);
  if (blockedIds.includes(post.authorUserId)) {
    throw new ServiceError(404, "POST_NOT_FOUND", "Post not found.");
  }

  return post;
}

export async function createComment(input: {
  userId: string;
  postId: string;
  body: string;
}): Promise<Comment> {
  const post = await requireVisiblePost(input);
  await assertCommunityEligible(input.userId);

  const group = await prisma.communityGroup.findUniqueOrThrow({ where: { id: post.groupId } });

  if (!group.postingEnabled || group.postingDisabledByAdmin) {
    throw new ServiceError(403, "POSTING_DISABLED", "Posting is turned off in this group.");
  }

  if (!isWithinModerationCoverage()) {
    throw new ServiceError(503, "POSTING_PAUSED", "Commenting is paused overnight.");
  }

  await assertDailyQuota({ userId: input.userId, kind: "comment" });

  const author = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { createdAt: true },
  });

  const scan = scanText(input.body);

  if (scan.containsLink && !canPostLinks(author.createdAt)) {
    throw new ServiceError(422, "LINKS_NOT_ALLOWED_YET", "New accounts cannot post links yet.");
  }

  const comment = await prisma.communityComment.create({
    data: { postId: post.id, authorUserId: input.userId, body: input.body },
    include: { author: { select: { name: true } } },
  });

  if (scan.flagged) {
    await prisma.moderationReport.create({
      data: {
        reporterUserId: input.userId,
        targetType: "COMMENT",
        targetId: comment.id,
        targetAuthorUserId: input.userId,
        groupId: post.groupId,
        reason: `automatic:${scan.flags.join(",")}`,
        priority: scan.flags.includes("high_risk") ? "CRITICAL" : "HIGH",
      },
    });
  }

  return serializeComment(comment);
}

/** Idempotent: the unique constraint means a double tap cannot double-count. */
export async function setReaction(input: {
  userId: string;
  postId: string;
  emoji?: string;
}): Promise<void> {
  const post = await requireVisiblePost(input);
  const emoji = input.emoji ?? "❤️";

  await prisma.communityReaction.upsert({
    where: { postId_userId_emoji: { postId: post.id, userId: input.userId, emoji } },
    create: { postId: post.id, userId: input.userId, emoji },
    update: {},
  });
}

export async function removeReaction(input: {
  userId: string;
  postId: string;
  emoji?: string;
}): Promise<void> {
  const post = await requireVisiblePost(input);

  await prisma.communityReaction.deleteMany({
    where: { postId: post.id, userId: input.userId, emoji: input.emoji ?? "❤️" },
  });
}

/** The legacy plural POST the shipped client calls. Toggles. */
export async function toggleReaction(input: {
  userId: string;
  postId: string;
}): Promise<void> {
  const post = await requireVisiblePost(input);

  const existing = await prisma.communityReaction.findFirst({
    where: { postId: post.id, userId: input.userId },
  });

  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return;
  }

  await prisma.communityReaction.create({
    data: { postId: post.id, userId: input.userId },
  });
}
