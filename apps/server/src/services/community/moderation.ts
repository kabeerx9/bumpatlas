import prisma from "@bumpatlas/db";
import type { BlockedUser, ModerationItem } from "@bumpatlas/contracts/v1";
import type { ModerationPriority, ModerationStatus } from "@bumpatlas/db/types";

import { writeAuditEventTx } from "@/services/audit";
import { requireHost } from "@/services/community/groups";
import { classifyReportPriority, scanText } from "@/services/community/safety";
import { ServiceError } from "@/services/errors";
import { trackProductEvent } from "@/services/product-event";

const PREVIEW_MAX = 160;

/**
 * Files a report.
 *
 * The queue item is created in the same request, not queued for later: a report that depends
 * on a background job is a report that silently disappears when the job breaks.
 *
 * The reported user is never notified, and never learns who reported them.
 */
export async function createReport(input: {
  reporterUserId: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const target = await resolveReportTarget(input);

  const priority = classifyReportPriority({
    reason: input.reason,
    details: input.details,
    // An automatic flag on the content escalates even a mildly worded report.
    targetFlags: target.body ? scanText(target.body).flags : [],
  });

  await prisma.$transaction(async (tx) => {
    await tx.moderationReport.create({
      data: {
        reporterUserId: input.reporterUserId,
        targetType: input.targetType.toUpperCase() as "POST" | "COMMENT" | "USER",
        targetId: input.targetId,
        targetAuthorUserId: target.authorUserId,
        groupId: target.groupId,
        reason: input.reason,
        details: input.details ?? null,
        priority,
      },
    });

    await writeAuditEventTx(tx, {
      action: "community.report_created",
      actorUserId: input.reporterUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      // Priority and target type only; the reason text stays out of the audit trail.
      metadata: { priority },
    });
  });

  await trackProductEvent("REPORT_CREATED", {
    actorUserId: input.reporterUserId,
    metadata: { critical: priority === "CRITICAL" },
  });
}

/**
 * Validates that the target exists and is visible to the reporter.
 *
 * Without this, the report endpoint would be an oracle: submit IDs until one succeeds and you
 * have enumerated other groups' posts.
 */
async function resolveReportTarget(input: {
  reporterUserId: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
}): Promise<{ authorUserId: string | null; groupId: string | null; body: string | null }> {
  if (input.targetType === "post") {
    const { requireVisiblePost } = await import("@/services/community/posts");
    const post = await requireVisiblePost({
      userId: input.reporterUserId,
      postId: input.targetId,
    });

    return { authorUserId: post.authorUserId, groupId: post.groupId, body: post.body };
  }

  if (input.targetType === "comment") {
    const comment = await prisma.communityComment.findFirst({
      where: { id: input.targetId, deletedAt: null },
      include: { post: { select: { groupId: true } } },
    });

    if (!comment) {
      throw new ServiceError(404, "COMMENT_NOT_FOUND", "Comment not found.");
    }

    const { requireGroupMembership } = await import("@/services/community/groups");
    await requireGroupMembership({
      userId: input.reporterUserId,
      groupId: comment.post.groupId,
    });

    return {
      authorUserId: comment.authorUserId,
      groupId: comment.post.groupId,
      body: comment.body,
    };
  }

  // Reporting a user requires having seen them somewhere the reporter belongs.
  const shared = await prisma.communityGroupMember.findFirst({
    where: {
      userId: input.targetId,
      status: "ACTIVE",
      group: {
        members: { some: { userId: input.reporterUserId, status: "ACTIVE" } },
      },
    },
    select: { groupId: true },
  });

  if (!shared) {
    throw new ServiceError(404, "USER_NOT_FOUND", "User not found.");
  }

  return { authorUserId: input.targetId, groupId: shared.groupId, body: null };
}

/** Idempotent, symmetric in effect, and cannot target oneself. */
export async function blockUser(input: {
  blockerUserId: string;
  blockedUserId: string;
}): Promise<void> {
  if (input.blockerUserId === input.blockedUserId) {
    throw new ServiceError(422, "CANNOT_BLOCK_SELF", "You cannot block yourself.");
  }

  const exists = await prisma.user.count({ where: { id: input.blockedUserId } });
  if (exists === 0) {
    throw new ServiceError(404, "USER_NOT_FOUND", "User not found.");
  }

  await prisma.userBlock.upsert({
    where: {
      blockerUserId_blockedUserId: {
        blockerUserId: input.blockerUserId,
        blockedUserId: input.blockedUserId,
      },
    },
    create: { blockerUserId: input.blockerUserId, blockedUserId: input.blockedUserId },
    update: {},
  });
}

export async function unblockUser(input: {
  blockerUserId: string;
  blockedUserId: string;
}): Promise<void> {
  await prisma.userBlock.deleteMany({
    where: { blockerUserId: input.blockerUserId, blockedUserId: input.blockedUserId },
  });
}

export async function listBlocks(userId: string): Promise<BlockedUser[]> {
  const blocks = await prisma.userBlock.findMany({
    where: { blockerUserId: userId },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Only blocks the caller made. Who blocked *them* is not theirs to see.
  return blocks.map((block) => ({
    userId: block.blocked.id,
    displayName: block.blocked.name ?? "Parent",
    blockedAt: block.createdAt.toISOString(),
  }));
}

const TO_CONTRACT_PRIORITY: Record<ModerationPriority, ModerationItem["priority"]> = {
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * The founder's queue.
 *
 * Ordered by priority then queue age so the oldest critical item is always first, and
 * `queuedAt` is returned so SLA age is measurable rather than guessed.
 */
export async function listModerationQueue(): Promise<ModerationItem[]> {
  const reports = await prisma.moderationReport.findMany({
    where: { status: { in: ["OPEN", "REVIEWING", "ESCALATED"] } },
    include: { group: { select: { id: true, kind: true } } },
    orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
    take: 200,
  });

  const previews = await loadPreviews(reports);

  // Repeat critical reports against the same author, so a founder can act on the person or
  // the group rather than playing whack-a-mole with individual posts.
  const repeatCounts = await prisma.moderationReport.groupBy({
    by: ["targetAuthorUserId"],
    where: {
      priority: "CRITICAL",
      targetAuthorUserId: {
        in: reports.map((report) => report.targetAuthorUserId).filter((id): id is string => Boolean(id)),
      },
    },
    _count: { _all: true },
  });
  const repeatByAuthor = new Map(
    repeatCounts.map((row) => [row.targetAuthorUserId, row._count._all]),
  );

  return reports.map((report) => ({
    id: report.id,
    type: report.reason.startsWith("automatic:") ? "Automatic flag" : "Report",
    summary: report.reason,
    postPreview: previews.get(`${report.targetType}:${report.targetId}`) ?? "",
    // Never the reporter's identity.
    reporter: "Anonymous",
    priority: TO_CONTRACT_PRIORITY[report.priority],
    status: report.status,
    groupId: report.group?.id ?? null,
    groupKind: report.group ? (report.group.kind === "STAGE" ? "stage" : "user") : null,
    repeatCriticalReports: report.targetAuthorUserId
      ? (repeatByAuthor.get(report.targetAuthorUserId) ?? 0)
      : 0,
    createdAt: report.queuedAt.toISOString(),
  }));
}

async function loadPreviews(
  reports: { targetType: string; targetId: string }[],
): Promise<Map<string, string>> {
  const postIds = reports.filter((r) => r.targetType === "POST").map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === "COMMENT").map((r) => r.targetId);

  const [posts, comments] = await Promise.all([
    postIds.length
      ? prisma.communityPost.findMany({
          where: { id: { in: postIds } },
          select: { id: true, body: true },
        })
      : [],
    commentIds.length
      ? prisma.communityComment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, body: true },
        })
      : [],
  ]);

  const previews = new Map<string, string>();
  for (const post of posts) previews.set(`POST:${post.id}`, truncate(post.body));
  for (const comment of comments) previews.set(`COMMENT:${comment.id}`, truncate(comment.body));

  return previews;
}

function truncate(text: string): string {
  return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX - 1)}…` : text;
}

const ADMIN_ACTIONS = ["review", "hide", "escalate", "resolve", "reject"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const STATUS_FOR_ACTION: Record<AdminAction, ModerationStatus> = {
  review: "REVIEWING",
  hide: "RESOLVED",
  escalate: "ESCALATED",
  resolve: "RESOLVED",
  reject: "REJECTED",
};

/**
 * Applies a founder decision.
 *
 * One transaction for the immutable action record, the report state, and the content state,
 * so a hide can never be recorded without taking effect — or take effect without a record.
 * Nothing is hard-deleted: evidence outlives the decision.
 */
export async function applyModerationAction(input: {
  adminUserId: string;
  reportId: string;
  action: AdminAction;
  note?: string;
}): Promise<ModerationItem> {
  const report = await prisma.moderationReport.findUnique({ where: { id: input.reportId } });

  if (!report) {
    throw new ServiceError(404, "REPORT_NOT_FOUND", "Report not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.moderationAction.create({
      data: {
        reportId: report.id,
        actorUserId: input.adminUserId,
        actorScope: "ADMIN",
        action: input.action,
        note: input.note ?? null,
        targetType: report.targetType,
        targetId: report.targetId,
        groupId: report.groupId,
      },
    });

    await tx.moderationReport.update({
      where: { id: report.id },
      data: { status: STATUS_FOR_ACTION[input.action], reviewedAt: new Date() },
    });

    if (input.action === "hide") {
      // `hiddenByAdmin` is what makes the hide immutable to a group host.
      if (report.targetType === "POST") {
        await tx.communityPost.updateMany({
          where: { id: report.targetId },
          data: { hiddenAt: new Date(), hiddenByAdmin: true },
        });
      }
      if (report.targetType === "COMMENT") {
        await tx.communityComment.updateMany({
          where: { id: report.targetId },
          data: { hiddenAt: new Date(), hiddenByAdmin: true },
        });
      }
    }

    await writeAuditEventTx(tx, {
      action: `moderation.${input.action}`,
      actorUserId: input.adminUserId,
      targetType: report.targetType.toLowerCase(),
      targetId: report.targetId,
      metadata: { priority: report.priority },
    });
  });

  const updated = await prisma.moderationReport.findUniqueOrThrow({
    where: { id: report.id },
    include: { group: { select: { id: true, kind: true } } },
  });

  return {
    id: updated.id,
    type: "Report",
    summary: updated.reason,
    postPreview: "",
    reporter: "Anonymous",
    priority: TO_CONTRACT_PRIORITY[updated.priority],
    status: updated.status,
    groupId: updated.group?.id ?? null,
    groupKind: updated.group ? (updated.group.kind === "STAGE" ? "stage" : "user") : null,
    createdAt: updated.queuedAt.toISOString(),
  };
}

export type HostAction =
  | "hide_post"
  | "unhide_own_hide"
  | "disable_posting"
  | "enable_posting";

/**
 * A host acting inside their own group.
 *
 * Deliberately narrow. A host never sees reports, reporter identities, or another group, and
 * cannot reverse an admin's decision — otherwise "make yourself a host" becomes a way to
 * undo moderation.
 */
export async function applyHostAction(input: {
  hostUserId: string;
  groupId: string;
  action: HostAction;
  targetId?: string;
  note?: string;
}): Promise<void> {
  const { group } = await requireHost({ userId: input.hostUserId, groupId: input.groupId });

  if (input.action === "hide_post" || input.action === "unhide_own_hide") {
    if (!input.targetId) {
      throw new ServiceError(400, "INVALID_INPUT", "targetId is required for that action.");
    }

    const post = await prisma.communityPost.findFirst({
      where: { id: input.targetId, groupId: group.id },
    });

    if (!post) {
      throw new ServiceError(404, "POST_NOT_FOUND", "Post not found.");
    }

    if (input.action === "hide_post") {
      await recordHostAction(input, group.id, async (tx) => {
        await tx.communityPost.update({
          where: { id: post.id },
          data: { hiddenAt: new Date(), hiddenByAdmin: false },
        });
      });
      return;
    }

    if (post.hiddenByAdmin) {
      throw new ServiceError(
        403,
        "ADMIN_HIDE_IMMUTABLE",
        "A moderator hid this post. It cannot be restored here.",
      );
    }

    await recordHostAction(input, group.id, async (tx) => {
      await tx.communityPost.update({ where: { id: post.id }, data: { hiddenAt: null } });
    });
    return;
  }

  if (input.action === "enable_posting" && group.postingDisabledByAdmin) {
    throw new ServiceError(
      403,
      "POSTING_DISABLED_BY_ADMIN",
      "Posting was disabled by a moderator.",
    );
  }

  await recordHostAction(input, group.id, async (tx) => {
    await tx.communityGroup.update({
      where: { id: group.id },
      data: { postingEnabled: input.action === "enable_posting" },
    });
  });
}

async function recordHostAction(
  input: { hostUserId: string; action: HostAction; targetId?: string; note?: string },
  groupId: string,
  apply: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await apply(tx);

    await tx.moderationAction.create({
      data: {
        actorUserId: input.hostUserId,
        // HOST scope, so an admin reviewing the trail can tell who did what.
        actorScope: "HOST",
        action: input.action,
        note: input.note ?? null,
        targetType: input.targetId ? "POST" : null,
        targetId: input.targetId ?? null,
        groupId,
      },
    });

    await writeAuditEventTx(tx, {
      action: `group.host_${input.action}`,
      actorUserId: input.hostUserId,
      targetType: "group",
      targetId: groupId,
    });
  });
}
