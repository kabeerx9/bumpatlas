import { randomBytes } from "node:crypto";

import prisma from "@bumpatlas/db";
import { attachDemoHousehold } from "@bumpatlas/db/demo/attach-household";
import { DEMO_HOUSEHOLDS } from "@bumpatlas/db/demo/data";
import { env } from "@bumpatlas/env/server";
import type { FastifyBaseLogger } from "fastify";

/**
 * Gives a freshly provisioned user a populated demo household.
 *
 * Development affordance: signing in with a real identity (Google, say) otherwise lands on
 * empty-state screens, which makes it impossible to see whether the app is rendering real
 * server data or falling back to fixtures. With this on, a first sign-in produces the same
 * household the `seed:demo` script builds.
 *
 * Two guards, deliberately independent:
 *   1. `DEMO_SEED_NEW_USERS` must be on.
 *   2. NODE_ENV must not be production — a flag flipped by accident must not write fake
 *      children and memories into a real account. The env check is not redundant with the
 *      flag; it is the backstop for the flag being wrong.
 */
export function isDemoSeedingEnabled(): boolean {
  return env.DEMO_SEED_NEW_USERS && env.NODE_ENV !== "production";
}

/**
 * Claims the right to seed this user, then populates their household.
 *
 * The claim matters. A cold app start fans out ~10 authenticated requests at once, and all of
 * them see a user with no family — without a claim step every one would build its own
 * household and the user would end up with ten. A transaction-scoped Postgres advisory lock
 * keyed on the user id serialises them; the losers observe `defaultFamilyId` already set and
 * return.
 *
 * Only the claim runs inside the transaction. The population that follows writes ~120 rows,
 * which would sit well past Prisma's interactive-transaction timeout and hold the lock for
 * the duration — the classic interactive transaction budget mistake. The advisory lock is
 * released at commit, and by then `defaultFamilyId` is set, so late arrivals still bail.
 */
export async function seedNewUserIfEnabled(
  userId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  if (!isDemoSeedingEnabled()) return;

  const household = DEMO_HOUSEHOLDS[0]!;

  try {
    const claimedFamilyId = await prisma.$transaction(async (tx) => {
      // hashtextextended keeps the 64-bit lock key stable for a given cuid.
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { defaultFamilyId: true },
      });

      // Already seeded, or a real user who genuinely has a household. Either way, hands off.
      if (!user || user.defaultFamilyId) return null;

      const family = await tx.family.create({
        data: {
          name: household.familyName,
          ownerUserId: userId,
          members: { create: [{ userId, role: "OWNER", status: "ACTIVE" }] },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { defaultFamilyId: family.id },
      });

      return family.id;
    });

    if (!claimedFamilyId) return;

    const suffix = randomBytes(4).toString("hex");
    await attachDemoHousehold({
      ownerUserId: userId,
      household,
      // Unique per invocation: unlike the seed script, this runs once per real user and has
      // no clear-and-replace step, so a fixed co-parent identity would collide immediately.
      coParent: {
        clerkId: `demo_jit_${suffix}`,
        email: `coparent-jit-${suffix}@bumpatlas.example.com`,
      },
      existingFamilyId: claimedFamilyId,
    });

    logger.info({ userId }, "Attached demo household to new user");
  } catch (error) {
    // Never fail the request that triggered this. The user still gets a working, if empty,
    // account, and the next sign-in will not retry (defaultFamilyId may be set) — which is
    // why this logs at error level rather than warn.
    logger.error({ err: error, userId }, "Failed to attach demo household to new user");
  }
}
