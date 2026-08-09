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

export type AdminMetrics = {
  totals: { users: number; families: number; children: number; pregnancies: number };
  activeUsers: { last1d: number; last7d: number; last30d: number };
};

export async function getAdminMetrics(now = new Date()): Promise<AdminMetrics> {
  const [users, families, children, pregnancies, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.family.count(),
    prisma.childProfile.count(),
    prisma.pregnancyProfile.count(),
    countActiveUsers(now),
  ]);

  return { totals: { users, families, children, pregnancies }, activeUsers };
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
