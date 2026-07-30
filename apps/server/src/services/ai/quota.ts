import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";

import { table } from "@/services/db-raw";
import { getEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";
import { formatCalendarDate, toCalendarDate } from "@/services/stage";

export type QuotaSnapshot = {
  dailyUsed: number;
  dailyLimit: number;
  hourlyUsed: number;
  hourlyLimit: number;
};

function hourStartFor(now: Date): Date {
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  return hour;
}

export async function getUsage(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
  now?: Date;
}): Promise<QuotaSnapshot> {
  const now = input.now ?? new Date();
  const day = new Date(`${formatCalendarDate(toCalendarDate(now, input.timeZone))}T00:00:00.000Z`);

  const [entitlement, daily, hourly] = await Promise.all([
    getEntitlements(input.familyId),
    prisma.aiUsageDaily.findUnique({
      where: { familyId_day: { familyId: input.familyId, day } },
    }),
    prisma.aiUsageHourly.findUnique({
      where: { userId_hourStart: { userId: input.userId, hourStart: hourStartFor(now) } },
    }),
  ]);

  return {
    dailyUsed: daily?.count ?? 0,
    dailyLimit: entitlement.aiDailyLimit,
    hourlyUsed: hourly?.count ?? 0,
    hourlyLimit: env.AI_MESSAGES_PER_HOUR,
  };
}

/**
 * Reserves one unit of quota before the provider is called.
 *
 * "Reserve then settle" (§5.10), not "increment on success": if usage were incremented
 * only after a successful generation, a crash between the two steps would hand out free
 * requests, and under concurrency two messages would both read the same count and both
 * pass.
 *
 * The increment is a single conditional UPDATE — `count = count + 1 WHERE count < limit` —
 * so the check and the write are atomic. Zero rows updated means the quota is exhausted.
 */
export async function reserveQuota(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
  now?: Date;
}): Promise<QuotaSnapshot> {
  const now = input.now ?? new Date();
  const day = new Date(`${formatCalendarDate(toCalendarDate(now, input.timeZone))}T00:00:00.000Z`);
  const hourStart = hourStartFor(now);

  const entitlement = await getEntitlements(input.familyId);
  const dailyLimit = entitlement.aiDailyLimit;
  const hourlyLimit = env.AI_MESSAGES_PER_HOUR;

  // Rows are created at zero first so the conditional UPDATE below always has a target.
  await prisma.aiUsageDaily.upsert({
    where: { familyId_day: { familyId: input.familyId, day } },
    create: { familyId: input.familyId, day, count: 0 },
    update: {},
  });
  await prisma.aiUsageHourly.upsert({
    where: { userId_hourStart: { userId: input.userId, hourStart } },
    create: { userId: input.userId, hourStart, count: 0 },
    update: {},
  });

  const dailyClaimed = await prisma.$executeRawUnsafe(
    `UPDATE ${table("AiUsageDaily")} SET count = count + 1
     WHERE "familyId" = $1 AND day = $2 AND count < $3`,
    input.familyId,
    day,
    dailyLimit,
  );

  if (dailyClaimed === 0) {
    throw new ServiceError(429, "QUOTA_EXCEEDED", "You have used today's assistant messages.", {
      limitKey: "ai_daily",
      used: dailyLimit,
      limit: dailyLimit,
      resetsAt: nextDay(day).toISOString(),
      upgradeAvailable: !entitlement.isPremium,
    });
  }

  const hourlyClaimed = await prisma.$executeRawUnsafe(
    `UPDATE ${table("AiUsageHourly")} SET count = count + 1
     WHERE "userId" = $1 AND "hourStart" = $2 AND count < $3`,
    input.userId,
    hourStart,
    hourlyLimit,
  );

  if (hourlyClaimed === 0) {
    // The daily unit is already reserved, so give it back before failing.
    await releaseDaily(input.familyId, day);

    throw new ServiceError(429, "RATE_LIMITED", "Too many assistant messages this hour.", {
      limitKey: "ai_hourly",
      used: hourlyLimit,
      limit: hourlyLimit,
      resetsAt: new Date(hourStart.getTime() + 3_600_000).toISOString(),
      // Not a paywall: the hourly cap applies to premium too.
      upgradeAvailable: false,
    });
  }

  return getUsage({ ...input, now });
}

/**
 * Releases a reservation after a provider failure.
 *
 * Without this, a provider outage would silently consume a parent's daily allowance for
 * answers they never received.
 */
export async function releaseQuota(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const day = new Date(`${formatCalendarDate(toCalendarDate(now, input.timeZone))}T00:00:00.000Z`);

  await releaseDaily(input.familyId, day);

  await prisma.$executeRawUnsafe(
    `UPDATE ${table("AiUsageHourly")} SET count = GREATEST(count - 1, 0)
     WHERE "userId" = $1 AND "hourStart" = $2`,
    input.userId,
    hourStartFor(now),
  );
}

async function releaseDaily(familyId: string, day: Date): Promise<void> {
  // GREATEST guards against a double release dropping the counter below zero.
  await prisma.$executeRawUnsafe(
    `UPDATE ${table("AiUsageDaily")} SET count = GREATEST(count - 1, 0)
     WHERE "familyId" = $1 AND day = $2`,
    familyId,
    day,
  );
}

function nextDay(day: Date): Date {
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
