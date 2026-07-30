import prisma from "@bumpatlas/db";
import type { FamilyMember, FamilyMemberRole } from "@bumpatlas/db/types";

import { ServiceError } from "@/services/errors";

/**
 * Resolves which household this user is currently reading (§6.2).
 *
 * `User.defaultFamilyId` is a cache, never authority: it is only used when it
 * still has an ACTIVE membership, otherwise the oldest active membership wins and
 * the pointer is corrected. This is what lets a user belong to several families
 * later without changing the singular UI today.
 */
export async function resolveCurrentFamily(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultFamilyId: true },
  });

  if (!user) return null;

  if (user.defaultFamilyId) {
    const stillActive = await prisma.familyMember.findFirst({
      where: { familyId: user.defaultFamilyId, userId, status: "ACTIVE" },
      select: { id: true },
    });

    if (stillActive) return user.defaultFamilyId;
  }

  const fallback = await prisma.familyMember.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { familyId: true },
  });

  const resolved = fallback?.familyId ?? null;

  if (resolved !== user.defaultFamilyId) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultFamilyId: resolved },
    });
  }

  return resolved;
}

/**
 * Resolves which child this user is focused on (§6.2.1).
 *
 * Answers "which child", never "which stage" — `computeStage()` checks for an
 * active pregnancy first, so nothing may branch on this to decide stage.
 *
 * Returns null when the family has no children, which is the normal state during
 * pregnancy. Every route needing "the child" calls this rather than reaching for
 * `findFirst`, because an unordered findFirst silently returns a different sibling
 * between requests once a household has two.
 */
export async function resolveActiveChild(
  userId: string,
  familyId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeChildId: true },
  });

  if (!user) return null;

  if (user.activeChildId) {
    // Revalidates family *and* archived state: a pointer surviving a family change
    // would read another household's child.
    const stillValid = await prisma.childProfile.findFirst({
      where: { id: user.activeChildId, familyId, archivedAt: null },
      select: { id: true },
    });

    if (stillValid) return user.activeChildId;
  }

  const youngest = await prisma.childProfile.findFirst({
    where: { familyId, archivedAt: null },
    // Youngest first, then birth order, then id: twins share a date of birth, so
    // without the tiebreakers the answer would not be stable across requests.
    orderBy: [{ dateOfBirth: "desc" }, { birthOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const resolved = youngest?.id ?? null;

  if (resolved !== user.activeChildId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeChildId: resolved },
    });
  }

  return resolved;
}

/**
 * Membership proof for a family-scoped request. Throws rather than returning null
 * so a route cannot forget to check.
 *
 * `NOT_FOUND` for a family the caller is not an active member of: a 403 would
 * confirm that the household exists.
 */
export async function requireActiveMembership(
  userId: string,
  familyId: string,
): Promise<FamilyMember> {
  const membership = await prisma.familyMember.findFirst({
    where: { familyId, userId, status: "ACTIVE" },
  });

  if (!membership) {
    throw new ServiceError(404, "FAMILY_NOT_FOUND", "Household not found.");
  }

  return membership;
}

/** Ordered for "at least this role" comparisons. Index is significance, not identity. */
const ROLE_RANK: Record<FamilyMemberRole, number> = {
  VIEWER: 0,
  CONTRIBUTOR: 1,
  PARENT: 2,
  OWNER: 3,
};

export function hasRoleAtLeast(role: FamilyMemberRole, minimum: FamilyMemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * §6.4 as predicates rather than rank comparisons, because the matrix is not
 * purely hierarchical — a VIEWER may participate in community personally while
 * being unable to write any household content.
 */
export const permissions = {
  /** Create memories, complete challenges, use AI. */
  canContribute: (role: FamilyMemberRole) => hasRoleAtLeast(role, "CONTRIBUTOR"),
  /** Invite and remove non-owner members, export household data. */
  canManageMembers: (role: FamilyMemberRole) => hasRoleAtLeast(role, "PARENT"),
  /** Create and edit child/pregnancy profiles. */
  canManageProfiles: (role: FamilyMemberRole) => hasRoleAtLeast(role, "PARENT"),
  /** Billing and family deletion. Owner only. */
  canManageBilling: (role: FamilyMemberRole) => role === "OWNER",
  /** Every active member can read household content. */
  canRead: () => true,
} as const;

export function requirePermission(
  role: FamilyMemberRole,
  permission: keyof typeof permissions,
  message = "Your role does not allow this.",
): void {
  const allowed = permissions[permission](role);

  if (!allowed) {
    throw new ServiceError(403, "FORBIDDEN", message);
  }
}
