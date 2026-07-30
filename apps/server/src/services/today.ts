import prisma from "@bumpatlas/db";
import type { ChallengeKind, DailyPlan } from "@bumpatlas/db/types";
import { createHash } from "node:crypto";

import { ServiceError } from "@/services/errors";
import { resolveStageForUser } from "@/services/profile";
import { formatCalendarDate, toCalendarDate, type StageKey } from "@/services/stage";

/**
 * Deterministic pick from a list.
 *
 * Hash of `(userId, date, bucket)` rather than `Math.random()`: the same user on the
 * same day must get the same card on every request, including after a refetch or an
 * app restart, and no state needs storing to guarantee it. Adding the bucket name
 * keeps the four cards from correlating with each other.
 */
export function deterministicPick<T>(
  items: T[],
  seed: { userId: string; date: string; bucket: string },
): T | null {
  if (items.length === 0) return null;

  const digest = createHash("sha256")
    .update(`${seed.userId}:${seed.date}:${seed.bucket}`)
    .digest();

  // First 4 bytes as an unsigned int is plenty of spread for lists of this size.
  const index = digest.readUInt32BE(0) % items.length;

  return items[index]!;
}

/**
 * Stage tags a plan for `stageKey` may draw from.
 *
 * Falls back to untagged (general) content so a household in an unusual stage still
 * gets a Today rather than four empty cards.
 */
function stageTagFilter(stageKey: StageKey) {
  return {
    OR: [{ stageTags: { has: stageKey } }, { stageTags: { isEmpty: true } }],
  };
}

const publishedContent = { isPublished: true, withdrawnAt: null };

/**
 * Returns the day's plan, creating it once.
 *
 * Frozen after creation: the plan is what the day's completions refer to, so
 * regenerating it would strand them. The unique constraint on `(userId, planDate)`
 * settles the concurrent-first-request race — the loser reads the winner's row rather
 * than both trying to insert.
 */
export async function getOrCreateDailyPlan(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
}): Promise<DailyPlan> {
  const today = formatCalendarDate(toCalendarDate(new Date(), input.timeZone));
  const planDate = new Date(`${today}T00:00:00.000Z`);

  const existing = await prisma.dailyPlan.findUnique({
    where: { userId_planDate: { userId: input.userId, planDate } },
  });

  if (existing) return existing;

  // Same computeStage() the stage header uses, so Today and the header can never
  // disagree about whether this household is pregnant or postpartum.
  const { stage } = await resolveStageForUser({
    userId: input.userId,
    familyId: input.familyId,
    timeZone: input.timeZone,
  });

  const [prompts, actions, learnItems] = await Promise.all([
    prisma.contentItem.findMany({
      where: { type: "MEMORY_PROMPT", ...publishedContent, ...stageTagFilter(stage.stageKey) },
      select: { id: true },
      orderBy: { slug: "asc" },
    }),
    prisma.wellnessAction.findMany({
      where: { ...publishedContent, ...stageTagFilter(stage.stageKey) },
      select: { id: true },
      orderBy: { slug: "asc" },
    }),
    prisma.contentItem.findMany({
      where: {
        type: { in: ["PARENTING_TIP", "PREGNANCY_WEEK_CARD", "PARENT_WELLNESS_CARD"] },
        ...publishedContent,
        ...stageTagFilter(stage.stageKey),
      },
      select: { id: true },
      orderBy: { slug: "asc" },
    }),
  ]);

  const seed = { userId: input.userId, date: today };

  const data = {
    userId: input.userId,
    planDate,
    stageKey: stage.stageKey,
    memoryPromptId: deterministicPick(prompts, { ...seed, bucket: "capture" })?.id ?? null,
    wellnessActionId: deterministicPick(actions, { ...seed, bucket: "care" })?.id ?? null,
    learnContentId: deterministicPick(learnItems, { ...seed, bucket: "learn" })?.id ?? null,
    // Community prompts arrive in Phase 8; the card falls back to the invite nudge.
    communityPromptId: null,
    communityGroupId: null,
  };

  try {
    return await prisma.dailyPlan.create({ data });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return prisma.dailyPlan.findUniqueOrThrow({
        where: { userId_planDate: { userId: input.userId, planDate } },
      });
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"
  );
}

/** ISO week starting Monday, in the user's zone. */
function weekStart(today: Date): Date {
  const day = today.getUTCDay();
  // Sunday is 0, so shift it to the end of the previous week.
  const offset = day === 0 ? 6 : day - 1;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

export type WeekProgress = {
  storyDays: number;
  wellnessDays: number;
  activeDays: number;
  goal: number;
};

const WEEKLY_GOAL = 4;

/**
 * Weekly progress from database records, never from client state.
 *
 * `activeDays` is the **union** of story and wellness dates, not their sum: doing both
 * on one day is one active day. Counting it twice would make the 4-of-7 goal reachable
 * in two days and the number would stop meaning anything.
 */
export async function getWeekProgress(input: {
  userId: string;
  timeZone: string | null;
}): Promise<WeekProgress> {
  const today = new Date(`${formatCalendarDate(toCalendarDate(new Date(), input.timeZone))}T00:00:00.000Z`);
  const start = weekStart(today);

  const completions = await prisma.challengeCompletion.findMany({
    where: {
      userId: input.userId,
      planDate: { gte: start },
      kind: { in: ["STORY", "WELLNESS"] },
    },
    select: { planDate: true, kind: true },
  });

  const storyDates = new Set<string>();
  const wellnessDates = new Set<string>();

  for (const completion of completions) {
    const key = completion.planDate.toISOString().slice(0, 10);
    if (completion.kind === "STORY") storyDates.add(key);
    else wellnessDates.add(key);
  }

  return {
    storyDays: storyDates.size,
    wellnessDays: wellnessDates.size,
    activeDays: new Set([...storyDates, ...wellnessDates]).size,
    goal: WEEKLY_GOAL,
  };
}

export type LoopCompletion = Record<"capture" | "care" | "learn" | "connect", boolean>;

const KIND_TO_LOOP: Record<ChallengeKind, keyof LoopCompletion> = {
  STORY: "capture",
  WELLNESS: "care",
  LEARN: "learn",
  CONNECT: "connect",
};

export async function getLoopCompletion(input: {
  userId: string;
  planDate: Date;
}): Promise<LoopCompletion> {
  const completions = await prisma.challengeCompletion.findMany({
    where: { userId: input.userId, planDate: input.planDate },
    select: { kind: true },
  });

  const loop: LoopCompletion = { capture: false, care: false, learn: false, connect: false };

  for (const completion of completions) {
    loop[KIND_TO_LOOP[completion.kind]] = true;
  }

  return loop;
}

/**
 * Infers which loop a completed challenge belongs to from the day's plan.
 *
 * Server-side on purpose: only STORY and WELLNESS count toward weekly progress, so a
 * client that could name its own kind could inflate the streak by completing the
 * cheapest card and calling it wellness.
 */
export function inferChallengeKind(plan: DailyPlan, challengeId: string): ChallengeKind {
  if (challengeId === plan.memoryPromptId) return "STORY";
  if (challengeId === plan.wellnessActionId) return "WELLNESS";
  if (challengeId === plan.learnContentId) return "LEARN";
  if (challengeId === plan.communityPromptId) return "CONNECT";

  // Accept the loop names directly for cards the plan could not fill — the Care and
  // Learn screens are reachable without a populated plan slot.
  const direct: Record<string, ChallengeKind> = {
    capture: "STORY",
    care: "WELLNESS",
    learn: "LEARN",
    connect: "CONNECT",
  };

  const mapped = direct[challengeId];
  if (mapped) return mapped;

  throw new ServiceError(
    422,
    "CHALLENGE_NOT_IN_PLAN",
    "That challenge is not part of today's plan.",
  );
}

/**
 * Records a completion idempotently and returns whether it was the first.
 *
 * `upsert` on the unique key rather than "check then insert": two taps arriving
 * together would both pass the check, and the second insert would fail with a 500
 * instead of quietly doing nothing.
 */
export async function completeChallenge(input: {
  userId: string;
  familyId: string;
  planDate: Date;
  kind: ChallengeKind;
  targetId: string | null;
}): Promise<{ firstTime: boolean }> {
  const existing = await prisma.challengeCompletion.findUnique({
    where: {
      userId_planDate_kind: {
        userId: input.userId,
        planDate: input.planDate,
        kind: input.kind,
      },
    },
    select: { id: true },
  });

  if (existing) return { firstTime: false };

  try {
    await prisma.challengeCompletion.create({
      data: {
        userId: input.userId,
        familyId: input.familyId,
        planDate: input.planDate,
        kind: input.kind,
        targetId: input.targetId,
      },
    });

    return { firstTime: true };
  } catch (error) {
    // Lost the race; the other request recorded it.
    if (isUniqueViolation(error)) return { firstTime: false };
    throw error;
  }
}
