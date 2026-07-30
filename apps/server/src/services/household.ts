import prisma from "@bumpatlas/db";
import type { FamilyMember as FamilyMemberContract, FamilySummary } from "@bumpatlas/contracts/v1";
import type { FamilyMemberRole, Prisma } from "@bumpatlas/db/types";

import { writeAuditEventTx } from "@/services/audit";
import { createFreeEntitlementTx } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import { listChildren, resolveStageForUser, serializeChild } from "@/services/profile";

/**
 * Household creation, membership changes, and the current-family summary.
 *
 * Split from `family.ts` on purpose: that file holds the isolation primitives every
 * route depends on, and mixing mutation logic into it makes the security-critical
 * part harder to audit.
 */

const DEFAULT_FAMILY_NAME = "My household";

/**
 * Creates a household with everything a family needs to function.
 *
 * All six writes are one transaction because a family without an owner membership is
 * unreachable, and a family without an entitlement row fails every later quota check.
 * Partial success here would strand a user outside their own household.
 */
export async function createFamily(input: {
  userId: string;
  name: string;
  idempotency?: (tx: Prisma.TransactionClient, response: unknown) => Promise<unknown>;
}): Promise<string> {
  const name = input.name.trim() || DEFAULT_FAMILY_NAME;

  return prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        name,
        ownerUserId: input.userId,
        members: { create: { userId: input.userId, role: "OWNER", status: "ACTIVE" } },
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { defaultFamilyId: family.id },
    });

    await createFreeEntitlementTx(tx, family.id);

    await tx.notificationPreference.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId },
      update: {},
    });

    await writeAuditEventTx(tx, {
      action: "family.created",
      actorUserId: input.userId,
      familyId: family.id,
      targetType: "family",
      targetId: family.id,
    });

    if (input.idempotency) {
      // Written last, inside the same transaction: a stored key must never claim
      // success for a family that was rolled back.
      await input.idempotency(tx, family.id);
    }

    return family.id;
  });
}

function serializeMember(member: {
  id: string;
  role: FamilyMemberRole;
  status: string;
  user: { name: string | null };
}): FamilyMemberContract {
  return {
    id: member.id,
    // Never the email: a co-parent's address is not the other members' business.
    displayName: member.user.name ?? "Family member",
    role: member.role,
    // Contract casing (correction 12): Prisma ACTIVE maps to "active".
    status: member.status.toLowerCase() as FamilyMemberContract["status"],
  };
}

/**
 * The current-household summary.
 *
 * `childDisplayName` stays populated with the caller's active child so shipped
 * screens keep working, while `children` carries the full set for new UI
 * (correction 31).
 */
export async function getFamilySummary(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
}): Promise<FamilySummary> {
  const [family, members, children, { stage, activeChildId }] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: input.familyId } }),
    prisma.familyMember.findMany({
      where: { familyId: input.familyId, status: { in: ["ACTIVE", "INVITED"] } },
      include: { user: { select: { name: true } } },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    }),
    listChildren(input.familyId, false),
    resolveStageForUser({
      userId: input.userId,
      familyId: input.familyId,
      timeZone: input.timeZone,
    }),
  ]);

  const activeChild = children.find((child) => child.id === activeChildId) ?? null;

  return {
    id: family.id,
    name: family.name,
    stageMode: stage.stageMode,
    childDisplayName: activeChild?.displayName ?? null,
    children: children.map((child) => serializeChild(child, activeChildId)),
    dueDate: stage.dueDate,
    members: members.map(serializeMember),
  };
}

async function requireMember(familyId: string, memberId: string) {
  const member = await prisma.familyMember.findFirst({ where: { id: memberId, familyId } });

  if (!member) {
    throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  }

  return member;
}

/**
 * Changes a member's role.
 *
 * The owner is untouchable: MVP guarantees exactly one owner per family, and
 * demoting them would leave a household with nobody able to manage billing or
 * deletion. Ownership transfer is post-MVP.
 */
export async function updateMemberRole(input: {
  familyId: string;
  actorUserId: string;
  memberId: string;
  role: FamilyMemberRole;
}): Promise<void> {
  const member = await requireMember(input.familyId, input.memberId);

  if (member.role === "OWNER") {
    throw new ServiceError(422, "OWNER_CANNOT_BE_CHANGED", "The owner's role cannot change.");
  }

  if (input.role === "OWNER") {
    throw new ServiceError(
      422,
      "OWNER_CANNOT_BE_ASSIGNED",
      "Ownership transfer is not supported yet.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyMember.update({ where: { id: member.id }, data: { role: input.role } });

    await writeAuditEventTx(tx, {
      action: "member.role_changed",
      actorUserId: input.actorUserId,
      familyId: input.familyId,
      targetType: "member",
      targetId: member.id,
      metadata: { from: member.role, to: input.role },
    });
  });
}

/**
 * Removes a member and clears the household pointers that would otherwise dangle.
 *
 * `activeChildId` in particular: left set, it points at a child in a household the
 * user can no longer read, which is a cross-family leak waiting for the next request
 * that trusts it.
 */
export async function removeMember(input: {
  familyId: string;
  actorUserId: string;
  memberId: string;
}): Promise<void> {
  const member = await requireMember(input.familyId, input.memberId);

  if (member.role === "OWNER") {
    throw new ServiceError(422, "OWNER_CANNOT_BE_REMOVED", "The owner cannot be removed.");
  }

  await detachMember({
    familyId: input.familyId,
    membershipId: member.id,
    userId: member.userId,
    actorUserId: input.actorUserId,
    action: "member.removed",
  });
}

/** A non-owner leaving voluntarily. Same clean-up as being removed. */
export async function leaveFamily(input: {
  familyId: string;
  userId: string;
}): Promise<void> {
  const membership = await prisma.familyMember.findFirst({
    where: { familyId: input.familyId, userId: input.userId, status: "ACTIVE" },
  });

  if (!membership) {
    throw new ServiceError(404, "FAMILY_NOT_FOUND", "Household not found.");
  }

  if (membership.role === "OWNER") {
    throw new ServiceError(
      422,
      "OWNER_CANNOT_LEAVE",
      "As the owner, delete the household instead of leaving it.",
    );
  }

  await detachMember({
    familyId: input.familyId,
    membershipId: membership.id,
    userId: input.userId,
    actorUserId: input.userId,
    action: "member.left",
  });
}

async function detachMember(input: {
  familyId: string;
  membershipId: string;
  userId: string;
  actorUserId: string;
  action: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.familyMember.update({
      where: { id: input.membershipId },
      // Soft: memories they authored stay with the household as family content, and
      // the row is the audit trail for when access ended.
      data: { status: "REMOVED", removedAt: new Date() },
    });

    await tx.user.updateMany({
      where: { id: input.userId, defaultFamilyId: input.familyId },
      data: { defaultFamilyId: null },
    });

    // Clears the pointer for any child of *this* family, whichever it was.
    const familyChildren = await tx.childProfile.findMany({
      where: { familyId: input.familyId },
      select: { id: true },
    });

    await tx.user.updateMany({
      where: { id: input.userId, activeChildId: { in: familyChildren.map((c) => c.id) } },
      data: { activeChildId: null },
    });

    await writeAuditEventTx(tx, {
      action: input.action,
      actorUserId: input.actorUserId,
      familyId: input.familyId,
      targetType: "member",
      targetId: input.membershipId,
    });
  });

  // Re-resolve so the next request does not have to repair state.
  const { resolveCurrentFamily } = await import("@/services/family");
  const nextFamilyId = await resolveCurrentFamily(input.userId);

  if (nextFamilyId) {
    await resolveActiveChild(input.userId, nextFamilyId);
  }
}
