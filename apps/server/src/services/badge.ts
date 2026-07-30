import prisma from "@bumpatlas/db";
import type { Badge } from "@bumpatlas/contracts/v1";

/**
 * Badge definitions live in code, not the database.
 *
 * They are cosmetic, few, and stable, and their award rules are code anyway — putting
 * the copy in a table would mean a badge could exist with no rule that can award it.
 */
export type BadgeDefinition = {
  key: string;
  title: string;
  description: string;
};

export const BADGES: BadgeDefinition[] = [
  {
    key: "first_capture",
    title: "First Capture",
    description: "You saved your first memory.",
  },
  {
    key: "care_pause",
    title: "Care Pause",
    description: "You completed a wellness Care action.",
  },
  {
    key: "week_of_stories",
    title: "Week of Stories",
    description: "You captured a memory on four days in one week.",
  },
  {
    key: "partner_joined",
    title: "Better Together",
    description: "Someone joined your household.",
  },
  {
    key: "first_milestone",
    title: "Noticed",
    description: "You recorded your first milestone observation.",
  },
];

const BADGE_KEYS = new Set(BADGES.map((badge) => badge.key));

/**
 * Awards a badge, ignoring a repeat.
 *
 * Idempotent by unique constraint rather than by checking first: two requests that both
 * qualify a user in the same instant would both pass a check, and the loser would raise
 * a 500 over a decorative reward.
 */
export async function awardBadge(userId: string, badgeKey: string): Promise<boolean> {
  if (!BADGE_KEYS.has(badgeKey)) return false;

  try {
    await prisma.badgeAward.create({ data: { userId, badgeKey } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Award rules, evaluated after a qualifying action.
 *
 * Pure decisions from counts the caller already has, so the rules are readable in one
 * place instead of scattered across the routes that trigger them.
 */
export function badgesEarnedByCapture(input: {
  totalMemories: number;
  storyDaysThisWeek: number;
}): string[] {
  const earned: string[] = [];

  if (input.totalMemories >= 1) earned.push("first_capture");
  if (input.storyDaysThisWeek >= 4) earned.push("week_of_stories");

  return earned;
}

export function badgesEarnedByWellness(): string[] {
  return ["care_pause"];
}

export async function listBadges(userId: string): Promise<Badge[]> {
  const awards = await prisma.badgeAward.findMany({
    where: { userId },
    select: { badgeKey: true, awardedAt: true },
  });

  const awardedAt = new Map(awards.map((award) => [award.badgeKey, award.awardedAt]));

  // Every definition is returned, earned or not, so the UI can show the locked ones.
  return BADGES.map((badge) => ({
    id: badge.key,
    title: badge.title,
    description: badge.description,
    earnedAt: awardedAt.get(badge.key)?.toISOString() ?? null,
  }));
}
