import { randomBytes } from "node:crypto";

import prisma from "../src/index";
import {
  DEMO_COMMUNITY_POSTS,
  DEMO_COMPLETIONS,
  DEMO_HOUSEHOLDS,
  DEMO_MEMORIES,
  demoImageUrl,
  type DemoHousehold,
} from "./demo-data";

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

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
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
    // Surface the status, not the body: Clerk error payloads can echo the password.
    console.warn(`  ! Clerk rejected ${input.email} (HTTP ${created.status})`);
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
  `coparent-${household.key}@bumpatlas.test`;

async function seedHousehold(household: DemoHousehold): Promise<void> {
  await clearHousehold(household);

  const clerkId = WITH_CLERK
    ? ((await provisionClerkUser(household.owner)) ??
      `demo_${household.key}_${randomBytes(4).toString("hex")}`)
    : `demo_${household.key}`;

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

  // Local-only: exists so co-parent content and roles are visible. Not sign-in-able.
  const coParent = await prisma.user.create({
    data: {
      clerkId: `demo_${household.key}_coparent`,
      email: coParentEmail(household),
      name: household.coParent.name,
      timeZone: "Europe/London",
      isAdultAttested: true,
      onboardingCompletedAt: new Date(),
      createdAt: daysAgo(88),
    },
  });

  const family = await prisma.family.create({
    data: {
      name: household.familyName,
      ownerUserId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER", status: "ACTIVE" },
          { userId: coParent.id, role: "PARENT", status: "ACTIVE" },
        ],
      },
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: [owner.id, coParent.id] } },
    data: { defaultFamilyId: family.id },
  });

  for (const userId of [owner.id, coParent.id]) {
    await prisma.notificationPreference.create({ data: { userId } });
    for (const policyKey of ["TERMS", "PRIVACY", "COMMUNITY"] as const) {
      await prisma.consentRecord.create({
        data: { userId, policyKey, version: "2026-07-01" },
      });
    }
  }

  await prisma.entitlementCache.create({
    data: {
      familyId: family.id,
      isPremium: household.isPremium,
      maxMembers: household.isPremium ? 6 : 2,
      maxChildren: household.isPremium ? null : 2,
      mediaUploadsPerMonth: household.isPremium ? 1000 : 100,
      aiDailyLimit: household.isPremium ? 30 : 5,
      userGroupsCreatedLimit: household.isPremium ? 5 : 1,
      source: household.isPremium ? "REVENUECAT" : "FREE",
      ...(household.isPremium
        ? { planId: "premium_monthly", renewsAt: daysAgo(-25) }
        : {}),
    },
  });

  const children = [];
  for (const [index, child] of household.children.entries()) {
    children.push(
      await prisma.childProfile.create({
        data: {
          familyId: family.id,
          displayName: child.displayName,
          dateOfBirth: monthsAgo(child.ageInMonths),
          birthOrder: index,
        },
      }),
    );
  }

  // Youngest is the active child, matching what resolveActiveChild would pick anyway.
  const youngest = children.at(-1)!;
  await prisma.user.updateMany({
    where: { id: { in: [owner.id, coParent.id] } },
    data: { activeChildId: youngest.id },
  });

  let imageIndex = 0;
  for (const [index, memory] of DEMO_MEMORIES.entries()) {
    const child = children[memory.childIndex] ?? youngest;
    // Alternate authorship so the household timeline shows both parents.
    const authorId = index % 3 === 0 ? coParent.id : owner.id;
    const eventDate = daysAgo(memory.daysAgo);

    const created = await prisma.memoryEntry.create({
      data: {
        familyId: family.id,
        authorUserId: authorId,
        childId: child.id,
        title: memory.body.split("\n")[0]!.slice(0, 120),
        body: memory.body,
        eventDate,
        createdAt: eventDate,
      },
    });

    if (memory.withImage) {
      imageIndex += 1;
      await prisma.mediaAsset.create({
        data: {
          familyId: family.id,
          uploaderUserId: authorId,
          memoryId: created.id,
          // An absolute URL, which the media serializer passes through outside production.
          storageKey: demoImageUrl(`${household.key}-${imageIndex}`),
          contentType: "image/jpeg",
          byteSize: 250_000,
          width: 900,
          height: 700,
          status: "ATTACHED",
          createdAt: eventDate,
        },
      });
    }
  }

  for (const completion of DEMO_COMPLETIONS) {
    for (const kind of completion.kinds) {
      await prisma.challengeCompletion.create({
        data: {
          userId: owner.id,
          familyId: family.id,
          planDate: daysAgo(completion.daysAgo),
          kind,
        },
      });
    }
  }

  await prisma.badgeAward.createMany({
    data: [
      { userId: owner.id, badgeKey: "first_capture" },
      { userId: owner.id, badgeKey: "care_pause" },
      { userId: owner.id, badgeKey: "partner_joined" },
    ],
    skipDuplicates: true,
  });

  const definitions = await prisma.milestoneDefinition.findMany({ take: 3 });
  for (const [index, definition] of definitions.entries()) {
    await prisma.milestoneObservation.create({
      data: {
        familyId: family.id,
        childId: youngest.id,
        definitionId: definition.id,
        status: index === 0 ? "OBSERVED" : index === 1 ? "EMERGING" : "NOT_OBSERVED",
        observedAt: index === 0 ? daysAgo(4) : null,
      },
    });
  }

  await seedCommunityFor({ ownerId: owner.id, householdKey: household.key });
}

/** Joins a stage group and adds posts, so Connect is not an empty screen. */
async function seedCommunityFor(input: {
  ownerId: string;
  householdKey: string;
}): Promise<void> {
  const group = await prisma.communityGroup.findFirst({
    where: { kind: "STAGE", slug: "months-0-6" },
  });

  if (!group) return;

  await prisma.communityGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: input.ownerId } },
    create: { groupId: group.id, userId: input.ownerId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  // Only the first household authors posts; the rest read the same conversation, which is
  // what a real cohort looks like and exercises the block/report flows against someone else.
  if (input.householdKey !== DEMO_HOUSEHOLDS[0]!.key) return;

  for (const [index, body] of DEMO_COMMUNITY_POSTS.entries()) {
    await prisma.communityPost.create({
      data: {
        groupId: group.id,
        authorUserId: input.ownerId,
        body,
        createdAt: daysAgo(index),
      },
    });
  }
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

  for (const household of DEMO_HOUSEHOLDS) {
    console.log(`Seeding ${household.familyName}...`);
    await seedHousehold(household);
  }

  const [families, memories, media] = await Promise.all([
    prisma.family.count(),
    prisma.memoryEntry.count(),
    prisma.mediaAsset.count(),
  ]);

  console.log(`\nDone. ${families} households, ${memories} memories, ${media} images.\n`);

  if (WITH_CLERK) {
    console.log("Sign in with any of these (password below):");
    for (const household of DEMO_HOUSEHOLDS) {
      console.log(`  ${household.owner.email}  ${household.isPremium ? "(premium)" : "(free)"}`);
    }
    console.log(`\n  password: ${DEMO_PASSWORD}\n`);
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
