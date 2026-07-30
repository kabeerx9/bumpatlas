import prisma from "@bumpatlas/db";
import type { PublicRecap, Recap, ShareLinkResponse } from "@bumpatlas/contracts/v1";
import type { WeeklyRecap } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";
import { createHash, randomBytes } from "node:crypto";

import { ServiceError } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import { formatCalendarDate, toCalendarDate } from "@/services/stage";

const SHARE_TTL_DAYS = 30;
const MAX_HIGHLIGHTS = 5;
/** Long enough that a title is recognisable, short enough not to republish a memory. */
const HIGHLIGHT_MAX_CHARS = 80;

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Monday of the week containing `date`, as a UTC date-only value. */
export function weekStartFor(date: Date, timeZone: string | null): Date {
  const calendar = toCalendarDate(date, timeZone);
  const asDate = new Date(`${formatCalendarDate(calendar)}T00:00:00.000Z`);
  const day = asDate.getUTCDay();
  // Sunday (0) belongs to the week that started six days earlier.
  const offset = day === 0 ? 6 : day - 1;

  asDate.setUTCDate(asDate.getUTCDate() - offset);
  return asDate;
}

function weekLabelFor(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);

  const format = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
      date,
    );

  return `${format(weekStart)} – ${format(end)}`;
}

/**
 * Eligibility: enough happened that a recap is worth reading.
 *
 * Either branch qualifies — three memories, or a rhythm of two story days plus one
 * wellness day. A recap of an empty week would read as a reminder of what the parent did
 * not manage, which is the opposite of the product's intent.
 */
export function isRecapEligible(input: {
  memoryCount: number;
  storyDays: number;
  wellnessDays: number;
}): boolean {
  if (input.memoryCount >= 3) return true;

  return input.storyDays >= 2 && input.wellnessDays >= 1;
}

/**
 * Builds highlights from memory titles.
 *
 * Titles, truncated, never bodies: a highlight is a reminder of a moment, and a shared
 * recap must not become a way to republish private journal text. Ordered oldest-first so
 * the week reads as a sequence.
 */
export function buildHighlights(memories: { title: string }[]): string[] {
  return memories.slice(0, MAX_HIGHLIGHTS).map((memory) => {
    const title = memory.title.trim();
    return title.length > HIGHLIGHT_MAX_CHARS
      ? `${title.slice(0, HIGHLIGHT_MAX_CHARS - 1)}…`
      : title;
  });
}

/**
 * Generates or returns the recap for a family's week.
 *
 * Idempotent by `(familyId, weekStart)`, so the Sunday cron and an on-demand read produce
 * the same row rather than competing. Deterministic: no AI involved, so a late cron never
 * means a missing recap.
 */
export async function getOrCreateRecap(input: {
  familyId: string;
  userId: string;
  timeZone: string | null;
  now?: Date;
}): Promise<{ recap: WeeklyRecap; eligible: boolean }> {
  const now = input.now ?? new Date();
  const weekStart = weekStartFor(now, input.timeZone);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [memories, completions, activeChildId] = await Promise.all([
    prisma.memoryEntry.findMany({
      where: {
        familyId: input.familyId,
        deletedAt: null,
        eventDate: { gte: weekStart, lt: weekEnd },
      },
      // Draws from every child's memories; ordering is chronological, never ranked.
      orderBy: [{ eventDate: "asc" }, { id: "asc" }],
      select: { title: true },
    }),
    prisma.challengeCompletion.findMany({
      where: {
        familyId: input.familyId,
        planDate: { gte: weekStart, lt: weekEnd },
        kind: { in: ["STORY", "WELLNESS"] },
      },
      select: { planDate: true, kind: true },
    }),
    resolveActiveChild(input.userId, input.familyId),
  ]);

  const storyDates = new Set<string>();
  const wellnessDates = new Set<string>();

  for (const completion of completions) {
    const key = completion.planDate.toISOString().slice(0, 10);
    if (completion.kind === "STORY") storyDates.add(key);
    else wellnessDates.add(key);
  }

  const eligible = isRecapEligible({
    memoryCount: memories.length,
    storyDays: storyDates.size,
    wellnessDays: wellnessDates.size,
  });

  const data = {
    weekLabel: weekLabelFor(weekStart),
    title: `Your week, ${weekLabelFor(weekStart)}`,
    highlights: buildHighlights(memories),
    memoryCount: memories.length,
    storyDays: storyDates.size,
    wellnessDays: wellnessDates.size,
    childId: activeChildId,
  };

  const recap = await prisma.weeklyRecap.upsert({
    where: { familyId_weekStart: { familyId: input.familyId, weekStart } },
    create: { familyId: input.familyId, weekStart, ...data },
    // Regenerating refreshes counts for the week in progress; the row identity is stable.
    update: data,
  });

  return { recap, eligible };
}

export async function serializeRecap(input: {
  recap: WeeklyRecap;
  eligible: boolean;
  familyId: string;
}): Promise<Recap> {
  const child = input.recap.childId
    ? await prisma.childProfile.findFirst({
        where: { id: input.recap.childId, familyId: input.familyId },
        select: { displayName: true },
      })
    : null;

  return {
    id: input.recap.id,
    weekLabel: input.recap.weekLabel,
    title: input.recap.title,
    highlights: input.recap.highlights,
    eligible: input.eligible,
    childId: input.recap.childId,
    // Private, authenticated response only.
    childDisplayName: child?.displayName ?? null,
  };
}

export async function createShareLink(input: {
  recapId: string;
  userId: string;
}): Promise<ShareLinkResponse> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000);

  await prisma.recapShareToken.create({
    data: {
      recapId: input.recapId,
      tokenHash: hashShareToken(token),
      createdByUserId: input.userId,
      expiresAt,
    },
  });

  return {
    token,
    url: `${env.WEB_BASE_URL}/recap/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Resolves a public recap from a share token.
 *
 * The payload is assembled field by field from an allowlist, not filtered down from the
 * private shape: with a filter, any field added to `WeeklyRecap` later would leak by
 * default. No child name, no dates of birth, no due date, no member names, no memory
 * bodies.
 */
export async function getPublicRecap(token: string): Promise<PublicRecap> {
  const share = await prisma.recapShareToken.findUnique({
    where: { tokenHash: hashShareToken(token) },
    include: { recap: true },
  });

  if (!share) {
    throw new ServiceError(404, "RECAP_NOT_FOUND", "This recap link is not valid.");
  }

  if (share.revokedAt) {
    throw new ServiceError(410, "RECAP_LINK_REVOKED", "This recap link was turned off.");
  }

  if (share.expiresAt.getTime() <= Date.now()) {
    throw new ServiceError(410, "RECAP_LINK_EXPIRED", "This recap link has expired.");
  }

  // Count only, no viewer identity: a shared link must not become a tracker.
  await prisma.recapShareToken.update({
    where: { id: share.id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    weekLabel: share.recap.weekLabel,
    title: share.recap.title,
    highlights: share.recap.highlights,
    // Deliberately null: the shared payload never carries a child's name — and the
    // household name is omitted entirely, because households are routinely named after
    // the child.
    childDisplayName: null,
    expiresAt: share.expiresAt.toISOString(),
  };
}

export async function revokeShareLinks(recapId: string): Promise<void> {
  await prisma.recapShareToken.updateMany({
    where: { recapId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
