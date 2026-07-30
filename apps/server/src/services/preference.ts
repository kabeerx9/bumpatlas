import prisma from "@bumpatlas/db";
import type { Preferences, PrimaryGoal } from "@bumpatlas/contracts/v1";

import { isValidTimeZone } from "@/plugins/request-context";
import { ServiceError } from "@/services/errors";
import { findActivePregnancy } from "@/services/profile";
import { trackProductEvent } from "@/services/product-event";

export async function getPreferences(userId: string): Promise<Preferences> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      primaryGoal: true,
      timeZone: true,
      activeChildId: true,
      onboardingCompletedAt: true,
    },
  });

  return {
    primaryGoal: user.primaryGoal,
    timeZone: user.timeZone,
    // Read-only here; POST /children/:id/activate is the only writer.
    activeChildId: user.activeChildId,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  };
}

export async function updatePreferences(input: {
  userId: string;
  primaryGoal?: PrimaryGoal;
  timeZone?: string;
}): Promise<Preferences> {
  if (input.timeZone !== undefined && !isValidTimeZone(input.timeZone)) {
    throw new ServiceError(400, "INVALID_INPUT", "timeZone must be a valid IANA identifier.");
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      ...(input.primaryGoal === undefined ? {} : { primaryGoal: input.primaryGoal }),
      ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
    },
  });

  return getPreferences(input.userId);
}

/**
 * Marks onboarding complete once, and only when it genuinely is.
 *
 * All four conditions must hold: adult attestation, current policy consents, a
 * household, and a pregnancy or child. Emitting the event earlier would make the
 * launch funnel metric describe something other than a usable account.
 *
 * Idempotent — `onboardingCompletedAt` is set only if still null, so the event fires
 * exactly once per user even though this runs after several different requests.
 */
export async function maybeCompleteOnboarding(input: {
  userId: string;
  familyId: string | null;
}): Promise<boolean> {
  if (!input.familyId) return false;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { onboardingCompletedAt: true, isAdultAttested: true },
  });

  if (user.onboardingCompletedAt) return false;
  if (!user.isAdultAttested) return false;

  const [terms, privacy] = await Promise.all([
    prisma.consentRecord.count({ where: { userId: input.userId, policyKey: "TERMS" } }),
    prisma.consentRecord.count({ where: { userId: input.userId, policyKey: "PRIVACY" } }),
  ]);

  if (terms === 0 || privacy === 0) return false;

  const [children, pregnancy] = await Promise.all([
    prisma.childProfile.count({ where: { familyId: input.familyId, archivedAt: null } }),
    findActivePregnancy(input.familyId),
  ]);

  if (children === 0 && !pregnancy) return false;

  const updated = await prisma.user.updateMany({
    // The null guard is what makes concurrent callers safe: only one update lands.
    where: { id: input.userId, onboardingCompletedAt: null },
    data: { onboardingCompletedAt: new Date() },
  });

  if (updated.count === 0) return false;

  await trackProductEvent("ONBOARDING_COMPLETED", {
    actorUserId: input.userId,
    familyId: input.familyId,
    metadata: { hasChild: children > 0, hasPregnancy: Boolean(pregnancy) },
  });

  return true;
}
