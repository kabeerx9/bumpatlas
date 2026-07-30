import { randomBytes } from "node:crypto";

import prisma from "../src/index";
import { attachDemoHousehold, daysAgo } from "../src/demo/attach-household";
import { DEMO_HOUSEHOLDS, type DemoHousehold } from "../src/demo/data";

/**
 * Demo data seed: four sign-in-able households with identical content.
 *
 * Separate from `seed:content` on purpose. Content is real product data that belongs in every
 * environment; this is throwaway demo data that must never run against production. The guard
 * below enforces that rather than trusting whoever runs it.
 *
 *   pnpm --filter @bumpatlas/db seed:demo              local users only
 *   pnpm --filter @bumpatlas/db seed:demo --with-clerk also provisions real Clerk users
 *
 * Idempotent: re-running replaces the demo households and leaves everything else alone.
 */

const WITH_CLERK = process.argv.includes("--with-clerk");
/** Shared across all demo accounts. Dev instance only — never a real user's password. */
const DEMO_PASSWORD = "BumpAtlasDemo!2026";

function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }

  const url = process.env.DATABASE_URL ?? "";
  if (/prod/i.test(url)) {
    throw new Error("Refusing to seed demo data: DATABASE_URL looks like production.");
  }
}

/**
 * Creates or reuses a Clerk user so the account can actually be signed into.
 *
 * Only runs with `--with-clerk`, because it writes to an external service. Without it the
 * local rows still exist and every API path works — you just cannot log in as them.
 */
async function provisionClerkUser(input: {
  email: string;
  name: string;
}): Promise<string | null> {
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret || secret.includes("replace_me")) {
    console.warn(`  ! CLERK_SECRET_KEY not configured — skipping Clerk user for ${input.email}`);
    return null;
  }

  const [firstName, ...rest] = input.name.split(" ");
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };

  const existing = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(input.email)}`,
    { headers },
  );

  if (existing.ok) {
    const found = (await existing.json()) as { id: string }[];
    if (found.length > 0) return found[0]!.id;
  }

  const created = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [input.email],
      password: DEMO_PASSWORD,
      first_name: firstName,
      last_name: rest.join(" ") || "Demo",
      skip_password_checks: true,
    }),
  });

  if (!created.ok) {
    // Clerk error payloads can echo submitted values (including the password), so surface
    // only the error code, the offending param name, and Clerk's own static description —
    // never `meta` or the raw body. A bare status code here cost a long debugging session
    // when Clerk started rejecting the seed's `.test` email domain.
    const reasons = await created
      .json()
      .then((body: unknown) => {
        const errors = (body as { errors?: unknown }).errors;
        if (!Array.isArray(errors)) return [];
        return errors.map((error: Record<string, unknown>) => {
          const param = (error.meta as { param_name?: string } | undefined)?.param_name;
          return [error.code, param && `(${param})`, error.long_message]
            .filter(Boolean)
            .join(" ");
        });
      })
      .catch(() => []);

    console.warn(
      `  ! Clerk rejected ${input.email} (HTTP ${created.status})` +
        (reasons.length > 0 ? `\n      ${reasons.join("\n      ")}` : ""),
    );
    return null;
  }

  const user = (await created.json()) as { id: string };
  return user.id;
}

/**
 * Removes a previous run's household so re-seeding is idempotent.
 *
 * Deletes by owner email rather than truncating: this seed has to be safe to run against a
 * development database that also contains a real developer's own account.
 */
async function clearHousehold(household: DemoHousehold): Promise<void> {
  const owner = await prisma.user.findFirst({ where: { email: household.owner.email } });
  if (!owner) return;

  const families = await prisma.family.findMany({
    where: { ownerUserId: owner.id },
    select: { id: true },
  });

  // Cascades handle members, children, memories, media, recaps, and completions.
  await prisma.family.deleteMany({ where: { id: { in: families.map((f) => f.id) } } });
  await prisma.user.deleteMany({
    where: { email: { in: [household.owner.email, coParentEmail(household)] } },
  });
}

const coParentEmail = (household: DemoHousehold) =>
  `coparent-${household.key}@bumpatlas.example.com`;

/** Resolves to true when the owner ended up with a real, sign-in-able Clerk account. */
async function seedHousehold(household: DemoHousehold): Promise<boolean> {
  await clearHousehold(household);

  const provisionedClerkId = WITH_CLERK ? await provisionClerkUser(household.owner) : null;

  // The random suffix keeps the unique constraint satisfied when provisioning failed, so the
  // rest of the seed still completes — but the caller has to know it produced a local-only
  // account rather than printing sign-in instructions that cannot work.
  const clerkId =
    provisionedClerkId ??
    (WITH_CLERK
      ? `demo_${household.key}_${randomBytes(4).toString("hex")}`
      : `demo_${household.key}`);

  const owner = await prisma.user.create({
    data: {
      clerkId,
      email: household.owner.email,
      name: household.owner.name,
      timeZone: "Europe/London",
      primaryGoal: "MEMORIES",
      isAdultAttested: true,
      adultAttestedAt: new Date(),
      onboardingCompletedAt: new Date(),
      // Old enough to post community links, so the demo is not tripped up by the anti-spam
      // rule the moment someone tries it.
      createdAt: daysAgo(90),
    },
  });

  await attachDemoHousehold({
    ownerUserId: owner.id,
    household,
    // Stable identity so clearHousehold can find and delete it on the next run.
    coParent: {
      clerkId: `demo_${household.key}_coparent`,
      email: coParentEmail(household),
    },
  });

  return provisionedClerkId !== null;
}

async function main() {
  assertNotProduction();

  const milestones = await prisma.milestoneDefinition.count();
  const groups = await prisma.communityGroup.count();

  if (milestones === 0 || groups === 0) {
    console.warn(
      "! Content seed has not run. Run `pnpm --filter @bumpatlas/db seed:content` first for milestones and stage groups.\n",
    );
  }

  const signInReady = new Set<string>();

  for (const household of DEMO_HOUSEHOLDS) {
    console.log(`Seeding ${household.familyName}...`);
    if (await seedHousehold(household)) {
      signInReady.add(household.key);
    }
  }

  const [families, memories, media] = await Promise.all([
    prisma.family.count(),
    prisma.memoryEntry.count(),
    prisma.mediaAsset.count(),
  ]);

  console.log(`\nDone. ${families} households, ${memories} memories, ${media} images.\n`);

  if (WITH_CLERK && signInReady.size > 0) {
    console.log("Sign in with any of these (password below):");
    for (const household of DEMO_HOUSEHOLDS) {
      if (!signInReady.has(household.key)) continue;
      console.log(`  ${household.owner.email}  ${household.isPremium ? "(premium)" : "(free)"}`);
    }
    console.log(`\n  password: ${DEMO_PASSWORD}\n`);

    const failed = DEMO_HOUSEHOLDS.filter((h) => !signInReady.has(h.key));
    if (failed.length > 0) {
      console.warn(
        `! ${failed.length} household(s) have local rows but no Clerk account and cannot be ` +
          `signed into: ${failed.map((h) => h.owner.email).join(", ")}\n`,
      );
    }
  } else if (WITH_CLERK) {
    console.warn(
      "! Clerk provisioning failed for every household — see the errors above.\n" +
        "  The local rows exist, but none of these accounts can be signed into.\n",
    );
  } else {
    console.log(
      "Local rows only — these accounts cannot be signed into.\n" +
        "Re-run with --with-clerk to provision real Clerk users.\n",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
