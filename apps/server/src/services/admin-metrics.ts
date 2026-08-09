import prisma from "@bumpatlas/db";

import { table } from "@/services/db-raw";

/**
 * Aggregates for the founder dashboard (superadmin dashboard spec, 2026-08-09).
 *
 * Invariant (danger domain): this service reads across every household, bypassing
 * family scoping — so it must only ever return counts and dates. No names, no
 * content, no per-user rows may leave this module.
 *
 * On-load queries, no rollups: at current scale five counts and one union scan
 * are cheap. Revisit with rollup tables only if dashboard loads become slow.
 */

const DAY_MS = 86_400_000;

export type AdminMetricsRange = "30d" | "90d";

const RANGE_DAYS: Record<AdminMetricsRange, number> = { "30d": 30, "90d": 90 };

export type AdminMetrics = {
  totals: { users: number; families: number; children: number; pregnancies: number };
  activeUsers: { last1d: number; last7d: number; last30d: number };
  signupsByDay: { date: string; count: number }[];
  engagementByDay: { date: string; memories: number; challengeCompletions: number }[];
  invites: { sent: number; redeemed: number };
};

export async function getAdminMetrics(
  range: AdminMetricsRange = "30d",
  now = new Date(),
): Promise<AdminMetrics> {
  const days = RANGE_DAYS[range];
  const since = new Date(now.getTime() - days * DAY_MS);

  const [
    users,
    families,
    children,
    pregnancies,
    activeUsers,
    signupsByDay,
    engagementByDay,
    invites,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.family.count(),
    prisma.childProfile.count(),
    prisma.pregnancyProfile.count(),
    countActiveUsers(now),
    countSignupsByDay(since, now),
    countEngagementByDay(since, now),
    countInvites(since, now),
  ]);

  return {
    totals: { users, families, children, pregnancies },
    activeUsers,
    signupsByDay,
    engagementByDay,
    invites,
  };
}

/**
 * Builds the full list of UTC calendar dates from `since` through `now`,
 * inclusive, as `YYYY-MM-DD` strings. Days with zero underlying rows still
 * need an entry — the chart on the other end must render zeroes, not gaps —
 * so the series is generated here rather than left to whatever dates the
 * aggregate happens to return.
 */
function dayRange(since: Date, now: Date): string[] {
  const start = Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate());
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const days: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }

  return days;
}

/**
 * Signups per UTC day, bucketed with `date_trunc` because Prisma `groupBy`
 * cannot bucket by day. Zero-filled server-side against the full day series
 * so the web chart never has to reason about missing dates.
 */
async function countSignupsByDay(
  since: Date,
  now: Date,
): Promise<{ date: string; count: number }[]> {
  const rows = await prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
    `SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
     FROM ${table("User")}
     WHERE "createdAt" >= $1
     GROUP BY day`,
    since,
  );

  const byDay = new Map(rows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]));

  return dayRange(since, now).map((date) => ({ date, count: byDay.get(date) ?? 0 }));
}

/**
 * Memories and challenge completions per UTC day. Two independent `date_trunc`
 * aggregates joined in JS rather than one raw-SQL join, so the zero-fill logic
 * stays in one place (`dayRange`) instead of duplicated across a SQL FULL JOIN.
 */
async function countEngagementByDay(
  since: Date,
  now: Date,
): Promise<{ date: string; memories: number; challengeCompletions: number }[]> {
  const [memoryRows, challengeRows] = await Promise.all([
    prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
      `SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
       FROM ${table("MemoryEntry")}
       WHERE "createdAt" >= $1
       GROUP BY day`,
      since,
    ),
    prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
      `SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
       FROM ${table("ChallengeCompletion")}
       WHERE "createdAt" >= $1
       GROUP BY day`,
      since,
    ),
  ]);

  const memoriesByDay = new Map(
    memoryRows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]),
  );
  const challengesByDay = new Map(
    challengeRows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]),
  );

  return dayRange(since, now).map((date) => ({
    date,
    memories: memoriesByDay.get(date) ?? 0,
    challengeCompletions: challengesByDay.get(date) ?? 0,
  }));
}

/**
 * Invite funnel over the range: invites created (`sent`) vs invites accepted
 * (`redeemed`) in the window. Counts only — no email, no token, per the
 * module-level invariant.
 */
async function countInvites(
  since: Date,
  now: Date,
): Promise<{ sent: number; redeemed: number }> {
  const [sent, redeemed] = await Promise.all([
    prisma.familyInvite.count({ where: { createdAt: { gte: since, lte: now } } }),
    prisma.familyInvite.count({ where: { acceptedAt: { gte: since, lte: now } } }),
  ]);

  return { sent, redeemed };
}

/**
 * Creator-proxy activity: distinct users who created a memory, challenge
 * completion, or community post/comment in the window. There is no session or
 * event tracking, and this deliberately does not add any.
 *
 * Raw SQL because Prisma cannot express COUNT(DISTINCT …) across four tables in
 * one round trip. Table names go through `table()` — `$queryRawUnsafe` bypasses
 * Prisma's schema prefix and would otherwise resolve through `search_path`,
 * silently reading the development schema under integration tests.
 *
 * Soft-deleted rows still count: the activity signal is that the user created
 * something, not that it survived.
 */
async function countActiveUsers(
  now: Date,
): Promise<{ last1d: number; last7d: number; last30d: number }> {
  const since1d = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);

  // COUNT() returns bigint, which Prisma surfaces as JS BigInt.
  const rows = await prisma.$queryRawUnsafe<
    { last1d: bigint; last7d: bigint; last30d: bigint }[]
  >(
    `WITH activity AS (
       SELECT "authorUserId" AS user_id, "createdAt" FROM ${table("MemoryEntry")} WHERE "createdAt" >= $3
       UNION ALL
       SELECT "userId", "createdAt" FROM ${table("ChallengeCompletion")} WHERE "createdAt" >= $3
       UNION ALL
       SELECT "authorUserId", "createdAt" FROM ${table("CommunityPost")} WHERE "createdAt" >= $3
       UNION ALL
       SELECT "authorUserId", "createdAt" FROM ${table("CommunityComment")} WHERE "createdAt" >= $3
     )
     SELECT
       COUNT(DISTINCT user_id) FILTER (WHERE "createdAt" >= $1) AS last1d,
       COUNT(DISTINCT user_id) FILTER (WHERE "createdAt" >= $2) AS last7d,
       COUNT(DISTINCT user_id) AS last30d
     FROM activity`,
    since1d,
    since7d,
    since30d,
  );

  const row = rows[0];

  return {
    last1d: Number(row?.last1d ?? 0n),
    last7d: Number(row?.last7d ?? 0n),
    last30d: Number(row?.last30d ?? 0n),
  };
}
