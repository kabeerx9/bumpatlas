import type { FamilyMember, FamilyMemberRole } from "@bumpatlas/db/types";

import type { AuthContext } from "@/middleware/require-auth";
import { ServiceError } from "@/services/errors";
import {
  permissions,
  requireActiveMembership,
  requirePermission,
  resolveCurrentFamily,
} from "@/services/family";

export type FamilyContext = {
  familyId: string;
  membership: FamilyMember;
  role: FamilyMemberRole;
};

/**
 * Resolves the caller's current household and proves active membership in one step.
 *
 * Throws `404 FAMILY_NOT_FOUND` when onboarding has not created a family yet,
 * which is a legitimate state the client handles, not an error to log loudly.
 */
export async function requireCurrentFamily(auth: AuthContext): Promise<FamilyContext> {
  const familyId = await resolveCurrentFamily(auth.userId);

  if (!familyId) {
    throw new ServiceError(404, "FAMILY_NOT_FOUND", "No household yet.");
  }

  const membership = await requireActiveMembership(auth.userId, familyId);

  return { familyId, membership, role: membership.role };
}

/**
 * For routes that name a family explicitly. Membership is proven against the
 * *requested* family, never against the caller's default, so a client cannot read
 * another household by passing its ID.
 */
export async function requireFamilyMember(
  auth: AuthContext,
  familyId: string,
): Promise<FamilyContext> {
  const membership = await requireActiveMembership(auth.userId, familyId);

  return { familyId, membership, role: membership.role };
}

export async function requireCurrentFamilyWithPermission(
  auth: AuthContext,
  permission: keyof typeof permissions,
  message?: string,
): Promise<FamilyContext> {
  const context = await requireCurrentFamily(auth);
  requirePermission(context.role, permission, message);
  return context;
}

export type RequireCurrentFamily = typeof requireCurrentFamily;
