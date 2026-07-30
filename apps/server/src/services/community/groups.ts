import prisma from "@bumpatlas/db";
import type {
  CreateGroupInviteResponse,
  Group,
  GroupInvitePreview,
  GroupMember,
} from "@bumpatlas/contracts/v1";
import type { CommunityGroup, CommunityGroupMember } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";
import { createHash, randomBytes } from "node:crypto";

import { writeAuditEvent, writeAuditEventTx } from "@/services/audit";
import { assertCommunityEligible, scanText } from "@/services/community/safety";
import { table } from "@/services/db-raw";
import { getEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";
import { resolveCurrentFamily } from "@/services/family";
import { trackProductEvent } from "@/services/product-event";

const INVITE_DEFAULT_MAX_USES = 25;
const INVITE_DEFAULT_DAYS = 14;
const INVITE_MAX_DAYS = 30;
const MAX_ACTIVE_INVITES_PER_GROUP = 5;
const MAX_INVITE_CREATIONS_PER_DAY = 10;
/** Seeded cohorts stay in their warm empty state until there is a real conversation. */
export const STAGE_GROUP_POST_THRESHOLD = 10;

export function hashGroupInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Random, never derived from the title, so a group URL cannot be guessed from its name. */
function randomSlug(): string {
  return randomBytes(9).toString("base64url").toLowerCase();
}

/**
 * Feature gates as an overridable object.
 *
 * `env` is parsed once at import, so a test cannot flip these through `process.env`. Keeping
 * the check inside the service — rather than only in the route — means a future route cannot
 * forget it, and the seam lets the suite cover both the on and off paths.
 */
export const communityGates = {
  community: () => env.FEATURE_COMMUNITY,
  userGroups: () => env.FEATURE_USER_GROUPS,
};

export function assertFeatureEnabled(): void {
  if (!communityGates.community()) {
    throw new ServiceError(503, "FEATURE_UNAVAILABLE", "Community is not available yet.");
  }
}

export function assertUserGroupsEnabled(): void {
  assertFeatureEnabled();

  if (!communityGates.userGroups()) {
    throw new ServiceError(503, "FEATURE_UNAVAILABLE", "Member groups are not available yet.");
  }
}

export function serializeGroup(input: {
  group: CommunityGroup & { _count?: { members: number } };
  membership: CommunityGroupMember | null;
  memberCount: number;
}): Group {
  const { group, membership } = input;

  return {
    id: group.id,
    name: group.title,
    stageLabel: group.kind === "STAGE" ? (group.stageKey ?? "Community") : "Member group",
    description: group.description,
    kind: group.kind === "STAGE" ? "stage" : "user",
    role:
      membership?.status === "ACTIVE"
        ? membership.role === "HOST"
          ? "host"
          : "member"
        : null,
    memberCount: input.memberCount,
    memberLimit: group.memberLimit,
    postingEnabled: group.postingEnabled && !group.postingDisabledByAdmin,
    archived: !group.isActive || group.archivedAt !== null,
    joined: membership?.status === "ACTIVE",
  };
}

/**
 * Groups visible to the caller.
 *
 * Two disjoint sets, unioned: discoverable stage cohorts, plus every group the caller is an
 * active member of. A `LINK_ONLY` group the caller does not belong to is unreachable here by
 * construction — there is no branch that could return it.
 */
export async function listVisibleGroups(userId: string): Promise<Group[]> {
  assertFeatureEnabled();

  const memberships = await prisma.communityGroupMember.findMany({
    where: { userId, status: "ACTIVE" },
  });
  const membershipByGroup = new Map(memberships.map((member) => [member.groupId, member]));

  const groups = await prisma.communityGroup.findMany({
    where: {
      isActive: true,
      OR: [
        { kind: "STAGE", visibility: "STAGE_DISCOVERABLE" },
        // Membership is the only way a link-only group appears in a list.
        { id: { in: memberships.map((member) => member.groupId) } },
      ],
    },
    orderBy: [{ kind: "asc" }, { title: "asc" }],
  });

  const counts = await prisma.communityGroupMember.groupBy({
    by: ["groupId"],
    where: { groupId: { in: groups.map((group) => group.id) }, status: "ACTIVE" },
    _count: { _all: true },
  });
  const countByGroup = new Map(counts.map((count) => [count.groupId, count._count._all]));

  return groups.map((group) =>
    serializeGroup({
      group,
      membership: membershipByGroup.get(group.id) ?? null,
      // Real counts only. Never fabricated to make a cold group look busy.
      memberCount: countByGroup.get(group.id) ?? 0,
    }),
  );
}

/**
 * Requires active membership of a group.
 *
 * `404` for a group the caller cannot see, including one they are banned from: a distinct
 * "you are banned" would confirm the group exists and tell a banned user their ban landed,
 * which is an invitation to make a new account.
 */
export async function requireGroupMembership(input: {
  userId: string;
  groupId: string;
}): Promise<{ group: CommunityGroup; membership: CommunityGroupMember }> {
  const group = await prisma.communityGroup.findFirst({
    where: { id: input.groupId, isActive: true },
  });

  if (!group) {
    throw new ServiceError(404, "GROUP_NOT_FOUND", "Group not found.");
  }

  const membership = await prisma.communityGroupMember.findFirst({
    where: { groupId: group.id, userId: input.userId, status: "ACTIVE" },
  });

  if (!membership) {
    throw new ServiceError(404, "GROUP_NOT_FOUND", "Group not found.");
  }

  return { group, membership };
}

export async function requireHost(input: {
  userId: string;
  groupId: string;
}): Promise<{ group: CommunityGroup; membership: CommunityGroupMember }> {
  const context = await requireGroupMembership(input);

  // Verified against this exact group: a host of one group is nobody in another.
  if (context.membership.role !== "HOST") {
    throw new ServiceError(403, "FORBIDDEN", "Only the group host can do that.");
  }

  return context;
}

/** Joining a seeded stage cohort. Never automatic — suggested, then chosen. */
export async function joinStageGroup(input: {
  userId: string;
  groupId: string;
}): Promise<void> {
  assertFeatureEnabled();
  await assertCommunityEligible(input.userId);

  const group = await prisma.communityGroup.findFirst({
    where: { id: input.groupId, isActive: true, kind: "STAGE" },
  });

  if (!group) {
    throw new ServiceError(404, "GROUP_NOT_FOUND", "Group not found.");
  }

  const existing = await prisma.communityGroupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: input.userId } },
  });

  if (existing?.status === "BANNED") {
    // Generic: does not confirm the ban.
    throw new ServiceError(404, "GROUP_NOT_FOUND", "Group not found.");
  }

  await prisma.communityGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: input.userId } },
    create: { groupId: group.id, userId: input.userId, role: "MEMBER", status: "ACTIVE" },
    update: { status: "ACTIVE", removedAt: null },
  });

  await trackProductEvent("GROUP_JOINED", { actorUserId: input.userId });
}

export async function leaveGroup(input: { userId: string; groupId: string }): Promise<void> {
  const { membership } = await requireGroupMembership(input);

  if (membership.role === "HOST") {
    throw new ServiceError(
      422,
      "HOST_CANNOT_LEAVE",
      "Archive the group instead of leaving it.",
    );
  }

  await prisma.communityGroupMember.update({
    where: { id: membership.id },
    data: { status: "LEFT", removedAt: new Date() },
  });
}

/* ------------------------------------------------------------------ *
 * Phase 8b — member-created groups
 * ------------------------------------------------------------------ */

export async function createUserGroup(input: {
  userId: string;
  title: string;
  description?: string;
}): Promise<CommunityGroup> {
  assertUserGroupsEnabled();
  await assertCommunityEligible(input.userId);

  // Same scan as posts: a group title is public text to everyone holding the link.
  const scan = scanText(`${input.title} ${input.description ?? ""}`);
  if (scan.containsContact) {
    throw new ServiceError(
      422,
      "CONTACT_DETAILS_NOT_ALLOWED",
      "Please leave contact details out of the group name.",
    );
  }

  const familyId = await resolveCurrentFamily(input.userId);
  const entitlement = familyId ? await getEntitlements(familyId) : null;
  const limit = entitlement?.userGroupsCreatedLimit ?? env.USER_GROUPS_CREATED_LIMIT_FREE;

  const hosted = await prisma.communityGroupMember.count({
    where: {
      userId: input.userId,
      role: "HOST",
      status: "ACTIVE",
      group: { kind: "USER", isActive: true },
    },
  });

  if (hosted >= limit) {
    throw new ServiceError(422, "GROUP_LIMIT_REACHED", "You have reached your group limit.", {
      limitKey: "user_groups_created",
      used: hosted,
      limit,
      upgradeAvailable: !entitlement?.isPremium,
    });
  }

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.communityGroup.create({
      data: {
        slug: randomSlug(),
        title: input.title,
        description: input.description ?? null,
        kind: "USER",
        // All member-created groups are link-only. There is no browse or search.
        visibility: "LINK_ONLY",
        createdByUserId: input.userId,
        memberLimit: env.USER_GROUP_MEMBER_LIMIT,
        isActive: true,
      },
    });

    await tx.communityGroupMember.create({
      data: { groupId: created.id, userId: input.userId, role: "HOST", status: "ACTIVE" },
    });

    await writeAuditEventTx(tx, {
      action: "group.created",
      actorUserId: input.userId,
      targetType: "group",
      targetId: created.id,
      metadata: { kind: "USER", flagged: scan.flagged },
    });

    return created;
  });

  await trackProductEvent("GROUP_CREATED", { actorUserId: input.userId });

  return group;
}

export async function updateUserGroup(input: {
  userId: string;
  groupId: string;
  title?: string;
  description?: string;
  postingEnabled?: boolean;
}): Promise<CommunityGroup> {
  assertUserGroupsEnabled();
  const { group } = await requireHost({ userId: input.userId, groupId: input.groupId });

  // A host may not re-enable posting an admin switched off.
  if (input.postingEnabled === true && group.postingDisabledByAdmin) {
    throw new ServiceError(
      403,
      "POSTING_DISABLED_BY_ADMIN",
      "Posting was disabled by a moderator.",
    );
  }

  return prisma.communityGroup.update({
    where: { id: group.id },
    data: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.postingEnabled === undefined ? {} : { postingEnabled: input.postingEnabled }),
    },
  });
}

/**
 * Archive, never hard delete.
 *
 * Posts are retained for the moderation and legal window while the group disappears from
 * members' lists. Hard deletion here would destroy exactly the evidence a report needs.
 */
export async function archiveUserGroup(input: {
  userId: string;
  groupId: string;
  actorScope?: "ADMIN" | "HOST";
}): Promise<void> {
  const group =
    input.actorScope === "ADMIN"
      ? await prisma.communityGroup.findFirstOrThrow({ where: { id: input.groupId } })
      : (await requireHost({ userId: input.userId, groupId: input.groupId })).group;

  await prisma.$transaction(async (tx) => {
    await tx.communityGroup.update({
      where: { id: group.id },
      data: { isActive: false, archivedAt: new Date(), postingEnabled: false },
    });

    await tx.communityGroupInvite.updateMany({
      where: { groupId: group.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await writeAuditEventTx(tx, {
      action: "group.archived",
      actorUserId: input.userId,
      targetType: "group",
      targetId: group.id,
      metadata: { byAdmin: input.actorScope === "ADMIN" },
    });
  });
}

/** Called when a host's account is deleted: a group must never be left unowned. */
export async function archiveGroupsHostedBy(userId: string): Promise<number> {
  const hosted = await prisma.communityGroupMember.findMany({
    where: { userId, role: "HOST", status: "ACTIVE", group: { kind: "USER", isActive: true } },
    select: { groupId: true },
  });

  for (const membership of hosted) {
    await archiveUserGroup({ userId, groupId: membership.groupId, actorScope: "ADMIN" });
  }

  return hosted.length;
}

export async function listGroupMembers(input: {
  userId: string;
  groupId: string;
}): Promise<GroupMember[]> {
  const { group } = await requireGroupMembership(input);

  const members = await prisma.communityGroupMember.findMany({
    where: { groupId: group.id, status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  // Display name, role, join date. Never emails.
  return members.map((member) => ({
    userId: member.userId,
    displayName: member.user.name ?? "Member",
    role: member.role === "HOST" ? "host" : "member",
    joinedAt: member.joinedAt.toISOString(),
  }));
}

export async function removeGroupMember(input: {
  hostUserId: string;
  groupId: string;
  targetUserId: string;
  ban: boolean;
}): Promise<void> {
  assertUserGroupsEnabled();
  const { group } = await requireHost({ userId: input.hostUserId, groupId: input.groupId });

  if (input.targetUserId === input.hostUserId) {
    throw new ServiceError(422, "HOST_CANNOT_REMOVE_SELF", "You cannot remove yourself.");
  }

  const membership = await prisma.communityGroupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: input.targetUserId } },
  });

  if (!membership) {
    throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.communityGroupMember.update({
      where: { id: membership.id },
      data: { status: input.ban ? "BANNED" : "REMOVED", removedAt: new Date() },
    });

    await tx.moderationAction.create({
      data: {
        actorUserId: input.hostUserId,
        // Scoped as HOST so an admin can tell host decisions from their own.
        actorScope: "HOST",
        action: input.ban ? "ban_member" : "remove_member",
        targetType: "USER",
        targetId: input.targetUserId,
        groupId: group.id,
      },
    });

    await writeAuditEventTx(tx, {
      action: input.ban ? "group.member_banned" : "group.member_removed",
      actorUserId: input.hostUserId,
      targetType: "user",
      targetId: input.targetUserId,
      metadata: { groupId: group.id },
    });
  });
}

export async function createGroupInvite(input: {
  userId: string;
  groupId: string;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<CreateGroupInviteResponse> {
  assertUserGroupsEnabled();
  const { group } = await requireHost({ userId: input.userId, groupId: input.groupId });

  const activeInvites = await prisma.communityGroupInvite.count({
    where: { groupId: group.id, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  if (activeInvites >= MAX_ACTIVE_INVITES_PER_GROUP) {
    throw new ServiceError(
      422,
      "TOO_MANY_ACTIVE_INVITES",
      "Revoke an existing link before creating another.",
    );
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const createdToday = await prisma.communityGroupInvite.count({
    where: { createdByUserId: input.userId, createdAt: { gte: dayStart } },
  });

  if (createdToday >= MAX_INVITE_CREATIONS_PER_DAY) {
    throw new ServiceError(429, "RATE_LIMITED", "Too many invite links today.");
  }

  const token = randomBytes(32).toString("base64url");
  const days = Math.min(input.expiresInDays ?? INVITE_DEFAULT_DAYS, INVITE_MAX_DAYS);
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const maxUses = input.maxUses ?? INVITE_DEFAULT_MAX_USES;

  await prisma.communityGroupInvite.create({
    data: {
      groupId: group.id,
      createdByUserId: input.userId,
      tokenHash: hashGroupInviteToken(token),
      maxUses,
      expiresAt,
    },
  });

  await writeAuditEvent({
    action: "group.invite_created",
    actorUserId: input.userId,
    targetType: "group",
    targetId: group.id,
    // Never the token or the URL.
    metadata: { maxUses, days },
  });

  await trackProductEvent("GROUP_INVITE_CREATED", { actorUserId: input.userId });

  return {
    token,
    inviteUrl: `${env.WEB_BASE_URL}/groups/join/${token}`,
    expiresAt: expiresAt.toISOString(),
    maxUses,
  };
}

export async function revokeGroupInvite(input: {
  userId: string;
  groupId: string;
  inviteId: string;
}): Promise<void> {
  assertUserGroupsEnabled();
  const { group } = await requireHost({ userId: input.userId, groupId: input.groupId });

  await prisma.communityGroupInvite.updateMany({
    where: { id: input.inviteId, groupId: group.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listGroupInvites(input: { userId: string; groupId: string }) {
  assertUserGroupsEnabled();
  const { group } = await requireHost({ userId: input.userId, groupId: input.groupId });

  const invites = await prisma.communityGroupInvite.findMany({
    where: { groupId: group.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  // Metadata only — the tokens are unrecoverable by design.
  return invites.map((invite) => ({
    id: invite.id,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  }));
}

/** Preview for a link holder. No post content, no member list. */
export async function previewGroupInvite(token: string): Promise<GroupInvitePreview> {
  assertUserGroupsEnabled();

  const invite = await prisma.communityGroupInvite.findUnique({
    where: { tokenHash: hashGroupInviteToken(token) },
    include: { group: true },
  });

  if (!invite || !invite.group.isActive) {
    throw new ServiceError(404, "INVITE_NOT_FOUND", "This link is not valid.");
  }

  assertInviteUsable(invite);

  const [memberCount, host] = await Promise.all([
    prisma.communityGroupMember.count({ where: { groupId: invite.groupId, status: "ACTIVE" } }),
    prisma.communityGroupMember.findFirst({
      where: { groupId: invite.groupId, role: "HOST", status: "ACTIVE" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return {
    groupTitle: invite.group.title,
    hostDisplayName: host?.user.name ?? "The host",
    memberCount,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

function assertInviteUsable(invite: {
  revokedAt: Date | null;
  expiresAt: Date;
  useCount: number;
  maxUses: number;
}): void {
  // One code for revoked, expired, and exhausted: none can be made to work again, and
  // distinguishing them tells a stranger how the link was disabled.
  if (
    invite.revokedAt ||
    invite.expiresAt.getTime() <= Date.now() ||
    invite.useCount >= invite.maxUses
  ) {
    throw new ServiceError(410, "INVITE_EXPIRED", "This link is no longer active.");
  }
}

/**
 * Joins a group by invite link.
 *
 * The row lock is what makes the last remaining seat safe: two people tapping the same link
 * at the same moment would both pass an unlocked `useCount < maxUses` check, and the group
 * would end up over its member limit.
 */
export async function acceptGroupInvite(input: {
  userId: string;
  token: string;
}): Promise<CommunityGroup> {
  assertUserGroupsEnabled();
  await assertCommunityEligible(input.userId);

  const tokenHash = hashGroupInviteToken(input.token);

  const joinedCount = await prisma.communityGroupMember.count({
    where: { userId: input.userId, status: "ACTIVE", group: { kind: "USER" } },
  });

  const group = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRawUnsafe<
      {
        id: string;
        groupId: string;
        useCount: number;
        maxUses: number;
        expiresAt: Date;
        revokedAt: Date | null;
      }[]
    >(
      `SELECT id, "groupId", "useCount", "maxUses", "expiresAt", "revokedAt"
       FROM ${table("CommunityGroupInvite")} WHERE "tokenHash" = $1 FOR UPDATE`,
      tokenHash,
    );

    const invite = locked[0];

    if (!invite) {
      throw new ServiceError(404, "INVITE_NOT_FOUND", "This link is not valid.");
    }

    assertInviteUsable(invite);

    const target = await tx.communityGroup.findFirst({
      where: { id: invite.groupId, isActive: true },
    });

    if (!target) {
      throw new ServiceError(404, "GROUP_NOT_FOUND", "Group not found.");
    }

    const existing = await tx.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId: target.id, userId: input.userId } },
    });

    if (existing?.status === "BANNED") {
      // Generic, and identical to a missing group: a banned user must not learn that a
      // fresh link would have worked.
      throw new ServiceError(404, "INVITE_NOT_FOUND", "This link is not valid.");
    }

    // Already a member: a double tap succeeds without consuming another use.
    if (existing?.status === "ACTIVE") return target;

    if (joinedCount >= env.USER_GROUP_JOINED_LIMIT) {
      throw new ServiceError(422, "JOINED_GROUP_LIMIT_REACHED", "You are in too many groups.", {
        limitKey: "user_groups_joined",
        used: joinedCount,
        limit: env.USER_GROUP_JOINED_LIMIT,
        upgradeAvailable: false,
      });
    }

    const memberCount = await tx.communityGroupMember.count({
      where: { groupId: target.id, status: "ACTIVE" },
    });

    if (memberCount >= target.memberLimit) {
      throw new ServiceError(422, "GROUP_FULL", "This group is full.");
    }

    await tx.communityGroupMember.upsert({
      where: { groupId_userId: { groupId: target.id, userId: input.userId } },
      create: { groupId: target.id, userId: input.userId, role: "MEMBER", status: "ACTIVE" },
      update: { status: "ACTIVE", removedAt: null },
    });

    await tx.communityGroupInvite.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });

    await writeAuditEventTx(tx, {
      action: "group.joined_by_link",
      actorUserId: input.userId,
      targetType: "group",
      targetId: target.id,
    });

    return target;
  });

  await trackProductEvent("GROUP_JOINED", { actorUserId: input.userId });

  return group;
}
