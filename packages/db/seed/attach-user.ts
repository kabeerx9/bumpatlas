import { randomBytes } from "node:crypto";

import prisma from "../src/index";
import { attachDemoHousehold } from "../src/demo/attach-household";
import { DEMO_HOUSEHOLDS } from "../src/demo/data";

/**
 * Attaches a populated demo household to one specific account, by Clerk user ID.
 *
 *   pnpm --filter @bumpatlas/db seed:user user_2abc...            Rivera household
 *   pnpm --filter @bumpatlas/db seed:user user_2abc... --household 1   Okafor (premium)
 *
 * For when an account ended up empty — e.g. onboarding created a blank family over the
 * just-in-time seed, or the flag was off when the user first signed in. Always builds a
 * fresh household and repoints `defaultFamilyId` at it; any existing families stay in the
 * database untouched, they just stop being the default.
 *
 * The user row is upserted, so this also works for a Clerk ID copied from the dashboard
 * before that person has ever hit the API.
 */

function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }

  const url = process.env.DATABASE_URL ?? "";
  if (/prod/i.test(url)) {
    throw new Error("Refusing to seed demo data: DATABASE_URL looks like production.");
  }
}

function parseArgs(): { clerkUserId: string; householdIndex: number } {
  const args = process.argv.slice(2);
  const clerkUserId = args.find((arg) => !arg.startsWith("--"));

  if (!clerkUserId) {
    console.error("Usage: seed:user <clerkUserId> [--household 0-3]");
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

  return { clerkUserId, householdIndex };
}

async function main(): Promise<void> {
  assertNotProduction();

  const { clerkUserId, householdIndex } = parseArgs();
  const household = DEMO_HOUSEHOLDS[householdIndex]!;

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    create: { clerkId: clerkUserId },
    update: {},
    select: { id: true, email: true, defaultFamilyId: true },
  });

  if (user.defaultFamilyId) {
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
