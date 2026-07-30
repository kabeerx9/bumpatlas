import prisma from "@bumpatlas/db";
import type { EntitlementsResponse } from "@bumpatlas/contracts/v1";
import type { EntitlementCache, Prisma } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";

/**
 * Free-tier defaults, read from env so launch tuning needs no deploy (§4).
 *
 * `maxChildren` is null for Premium (unlimited) and at least 2 on Free, so twins or
 * a second sibling never hit a paywall at the moment a baby is born.
 */
export function freeEntitlementDefaults() {
  return {
    isPremium: false,
    maxMembers: env.FREE_FAMILY_SEATS,
    maxChildren: env.FREE_CHILDREN_LIMIT,
    mediaUploadsPerMonth: env.FREE_MEDIA_UPLOADS_PER_MONTH,
    aiDailyLimit: env.FREE_AI_MESSAGES_PER_DAY,
    userGroupsCreatedLimit: env.USER_GROUPS_CREATED_LIMIT_FREE,
    source: "FREE" as const,
  };
}

export function premiumEntitlements() {
  return {
    isPremium: true,
    maxMembers: env.PREMIUM_FAMILY_SEATS,
    maxChildren: null,
    mediaUploadsPerMonth: env.PREMIUM_MEDIA_UPLOADS_PER_MONTH,
    aiDailyLimit: env.PREMIUM_AI_MESSAGES_PER_DAY,
    userGroupsCreatedLimit: env.USER_GROUPS_CREATED_LIMIT_PREMIUM,
  };
}

/** Seeded with the family, in the same transaction, so no family exists without limits. */
export function createFreeEntitlementTx(
  tx: Prisma.TransactionClient,
  familyId: string,
): Promise<EntitlementCache> {
  return tx.entitlementCache.create({
    data: { familyId, ...freeEntitlementDefaults() },
  });
}

/**
 * Reads a family's entitlements, healing a missing row.
 *
 * The heal exists because the alternative is worse: a family whose cache row is
 * somehow absent would otherwise get a 500 on every quota check, locking them out
 * of their own memories.
 */
export async function getEntitlements(familyId: string): Promise<EntitlementCache> {
  const existing = await prisma.entitlementCache.findUnique({ where: { familyId } });
  if (existing) return existing;

  return prisma.entitlementCache.create({
    data: { familyId, ...freeEntitlementDefaults() },
  });
}

export function serializeEntitlements(entitlement: EntitlementCache): EntitlementsResponse {
  return {
    isPremium: entitlement.isPremium,
    planId: entitlement.planId,
    renewsAt: entitlement.renewsAt?.toISOString() ?? null,
    mediaUploadsLimit: entitlement.mediaUploadsPerMonth,
    maxChildren: entitlement.maxChildren,
    aiDailyLimit: entitlement.aiDailyLimit,
    // Contract casing rule (correction 12): Prisma FREE maps to "free".
    source: entitlement.source.toLowerCase() as EntitlementsResponse["source"],
  };
}
