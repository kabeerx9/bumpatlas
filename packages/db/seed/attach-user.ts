import { randomBytes } from "node:crypto";

import prisma from "../src/index";
import { attachDemoHousehold, removeDemoCommunity } from "../src/demo/attach-household";
import { DEMO_HOUSEHOLDS } from "../src/demo/data";
import { assertSafeSeedTarget } from "./guard";

/**
 * Attaches a populated demo household to one specific account, by Clerk user ID.
 *
 *   pnpm --filter @bumpatlas/db seed:user user_2abc...            Rivera household
 *   pnpm --filter @bumpatlas/db seed:user user_2abc... --household 1   Okafor (premium)
 *   pnpm --filter @bumpatlas/db seed:user user_2abc... --replace       drop earlier demo ones
 *   pnpm --filter @bumpatlas/db seed:user user_2abc... --reset-community
 *
 * For when an account ended up empty — e.g. onboarding created a blank family over the
 * just-in-time seed, or the flag was off when the user first signed in. Always builds a
 * fresh household and repoints `defaultFamilyId` at it; any existing families stay in the
 * database untouched, they just stop being the default.
 *
 * `--replace` first deletes the demo households this script previously attached to the same
 * account, so repeated runs do not accumulate. It matches on owner plus a known demo family
 * name, never on "every family this user owns" — the whole point of the default being
 * additive is that a real household must survive a careless re-run.
 *
 * `--reset-community` additionally clears the stage-group posts authored by *this* account.
 * Community rows are group-scoped, so a cohort accumulates the seed output of every account
 * ever pointed at the same database, and the feed ends up showing the same canned post several
 * times over. It is opt-in and still scoped to the one account named on the command line —
 * clearing a shared group wholesale would delete posts belonging to whoever else seeded it.
 *
 * The user row is upserted, so this also works for a Clerk ID copied from the dashboard
 * before that person has ever hit the API.
 */

function parseArgs(): {
  clerkUserId: string;
  householdIndex: number;
  replace: boolean;
  resetCommunity: boolean;
} {
  const args = process.argv.slice(2);
  const clerkUserId = args.find((arg) => !arg.startsWith("--"));

  if (!clerkUserId) {
    console.error(
      "Usage: seed:user <clerkUserId> [--household 0-3] [--replace] [--reset-community]",
    );
    console.error(
      DEMO_HOUSEHOLDS.map((h, i) => `  ${i}: ${h.familyName}`).join("\n"),
    );
    process.exit(1);
  }

  const flagIndex = args.indexOf("--household");
  const householdIndex = flagIndex === -1 ? 0 : Number(args[flagIndex + 1]);

  if (!Number.isInteger(householdIndex) || !DEMO_HOUSEHOLDS[householdIndex]) {
    throw new Error(`--household must be 0-${DEMO_HOUSEHOLDS.length - 1}`);
  }

  return {
    clerkUserId,
    householdIndex,
    replace: args.includes("--replace"),
    resetCommunity: args.includes("--reset-community"),
  };
}

/**
 * Removes demo households this script attached to `ownerUserId` on an earlier run.
 *
 * The family delete cascades to children, memories, media, entitlements, completions and
 * recaps. Two things do not cascade and so are handled explicitly:
 *
 *   - the local-only co-parents, which are `User` rows rather than family-owned ones. They are
 *     collected before the delete and removed after, matched on the `demo_` clerk id prefix
 *     that only ever belongs to a seeded identity.
 *   - the community conversation, which is group-scoped. Leaving it behind is what made a
 *     re-seed produce a doubled feed with every post attributed to the account reading it.
 */
async function removePreviousDemoHouseholds(ownerUserId: string): Promise<number> {
  const families = await prisma.family.findMany({
    where: {
      ownerUserId,
      name: { in: DEMO_HOUSEHOLDS.map((h) => h.familyName) },
    },
    select: { id: true, members: { select: { user: { select: { id: true, clerkId: true } } } } },
  });

  if (families.length === 0) return 0;

  const coParentIds = families
    .flatMap((f) => f.members.map((m) => m.user))
    .filter((u) => u.id !== ownerUserId && u.clerkId.startsWith("demo_"))
    .map((u) => u.id);

  await prisma.family.deleteMany({ where: { id: { in: families.map((f) => f.id) } } });
  if (coParentIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: coParentIds } } });
  }
  await removeDemoCommunity(ownerUserId);

  return families.length;
}

async function main(): Promise<void> {
  assertSafeSeedTarget();

  const { clerkUserId, householdIndex, replace, resetCommunity } = parseArgs();
  const household = DEMO_HOUSEHOLDS[householdIndex]!;

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    create: { clerkId: clerkUserId },
    update: {},
    select: { id: true, email: true, defaultFamilyId: true },
  });

  if (replace) {
    const removed = await removePreviousDemoHouseholds(user.id);
    console.log(`Removed ${removed} previously seeded demo household(s).`);
  }

  if (resetCommunity) {
    const { count } = await prisma.communityPost.deleteMany({
      where: { authorUserId: user.id, group: { kind: "STAGE" } },
    });
    console.log(`Cleared ${count} stage-group post(s) authored by this account.`);
  }

  if (user.defaultFamilyId && !replace) {
    console.log(
      `User already has default family ${user.defaultFamilyId} — attaching a new one over it.`,
    );
  }

  // Unique per run: this script can be re-run for the same user, and each attach creates
  // its own local-only co-parent, so a fixed identity would collide on the second run.
  const suffix = randomBytes(4).toString("hex");
  const { familyId } = await attachDemoHousehold({
    ownerUserId: user.id,
    household,
    coParent: {
      clerkId: `demo_manual_${suffix}`,
      email: `coparent-manual-${suffix}@bumpatlas.example.com`,
    },
  });

  console.log(
    `Attached "${household.familyName}" (${familyId}) to ${clerkUserId}` +
      `${user.email ? ` (${user.email})` : ""} and set it as the default family.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
