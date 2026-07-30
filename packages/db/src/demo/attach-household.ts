import prisma from "../index";
import {
  DEMO_COMMUNITY_POSTS,
  DEMO_COMPLETIONS,
  DEMO_HOUSEHOLDS,
  DEMO_MEMORIES,
  demoImageUrl,
  type DemoHousehold,
} from "./data";

/**
 * Populates a demo household around an existing user row.
 *
 * Extracted from the `seed:demo` script so the server can reuse it: the seed creates its own
 * owner and calls this, and the just-in-time provisioning path calls it for a real user who
 * has just signed in. Both need the identical household shape, and two copies of ~180 lines
 * of fixture writes would drift within a week.
 *
 * The caller owns the owner `User` row and the co-parent's identity. That is deliberate —
 * the seed wants stable, idempotent co-parent emails it can delete and recreate, while the
 * server needs a fresh unique co-parent per invocation. Baking either policy in here would
 * break the other caller.
 */

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export function monthsAgo(months: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

export type AttachDemoHouseholdInput = {
  /** Local `User.id` of the household owner. Must already exist. */
  ownerUserId: string;
  household: DemoHousehold;
  /**
   * Identity for the local-only co-parent. Never sign-in-able; it exists so co-authored
   * memories, the second member seat, and role screens have something real to render.
   */
  coParent: { clerkId: string; email: string };
  /**
   * An already-created family to populate instead of creating one.
   *
   * The server's just-in-time path creates the family up front as its concurrency claim —
   * it is what stops ten parallel cold-start requests each building a household. Handing
   * that row in lets this function populate it without a delete-and-recreate window during
   * which `defaultFamilyId` would briefly be null and the claim could be taken again.
   */
  existingFamilyId?: string;
};

export async function attachDemoHousehold(
  input: AttachDemoHouseholdInput,
): Promise<{ familyId: string; coParentUserId: string }> {
  const { household, ownerUserId } = input;

  const coParent = await prisma.user.create({
    data: {
      clerkId: input.coParent.clerkId,
      email: input.coParent.email,
      name: household.coParent.name,
      timeZone: "Europe/London",
      isAdultAttested: true,
      onboardingCompletedAt: new Date(),
      createdAt: daysAgo(88),
    },
  });

  const family = input.existingFamilyId
    ? await prisma.family.update({
        where: { id: input.existingFamilyId },
        data: {
          name: household.familyName,
          members: { create: [{ userId: coParent.id, role: "PARENT", status: "ACTIVE" }] },
        },
      })
    : await prisma.family.create({
        data: {
          name: household.familyName,
          ownerUserId,
          members: {
            create: [
              { userId: ownerUserId, role: "OWNER", status: "ACTIVE" },
              { userId: coParent.id, role: "PARENT", status: "ACTIVE" },
            ],
          },
        },
      });

  await prisma.user.updateMany({
    where: { id: { in: [ownerUserId, coParent.id] } },
    data: { defaultFamilyId: family.id },
  });

  for (const userId of [ownerUserId, coParent.id]) {
    await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    await prisma.consentRecord.createMany({
      data: (["TERMS", "PRIVACY", "COMMUNITY"] as const).map((policyKey) => ({
        userId,
        policyKey,
        version: "2026-07-01",
      })),
      skipDuplicates: true,
    });
  }

  // Upsert, not create. When the server calls this for a user who is already signed in, the
  // family becomes visible to their in-flight requests the moment the caller's claim sets
  // defaultFamilyId — and the entitlements service lazily creates this row on first read.
  // A plain create loses that race and aborts the household half-built.
  const entitlements = {
    isPremium: household.isPremium,
    maxMembers: household.isPremium ? 6 : 2,
    maxChildren: household.isPremium ? null : 2,
    mediaUploadsPerMonth: household.isPremium ? 1000 : 100,
    aiDailyLimit: household.isPremium ? 30 : 5,
    userGroupsCreatedLimit: household.isPremium ? 5 : 1,
    source: household.isPremium ? ("REVENUECAT" as const) : ("FREE" as const),
    ...(household.isPremium ? { planId: "premium_monthly", renewsAt: daysAgo(-25) } : {}),
  };

  await prisma.entitlementCache.upsert({
    where: { familyId: family.id },
    create: { familyId: family.id, ...entitlements },
    update: entitlements,
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
    where: { id: { in: [ownerUserId, coParent.id] } },
    data: { activeChildId: youngest.id },
  });

  let imageIndex = 0;
  for (const [index, memory] of DEMO_MEMORIES.entries()) {
    const child = children[memory.childIndex] ?? youngest;
    // Alternate authorship so the household timeline shows both parents.
    const authorId = index % 3 === 0 ? coParent.id : ownerUserId;
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
          storageKey: demoImageUrl(`${household.key}-${family.id}-${imageIndex}`),
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

  // Upsert, not create: completions are unique per (user, planDate, kind) regardless of
  // family, so re-attaching a household to a user who already has one would collide. The
  // update repoints surviving rows at the new family so its streak screens still render.
  for (const completion of DEMO_COMPLETIONS) {
    for (const kind of completion.kinds) {
      const planDate = daysAgo(completion.daysAgo);
      await prisma.challengeCompletion.upsert({
        where: {
          userId_planDate_kind: { userId: ownerUserId, planDate, kind },
        },
        create: {
          userId: ownerUserId,
          familyId: family.id,
          planDate,
          kind,
        },
        update: { familyId: family.id },
      });
    }
  }

  await prisma.badgeAward.createMany({
    data: [
      { userId: ownerUserId, badgeKey: "first_capture" },
      { userId: ownerUserId, badgeKey: "care_pause" },
      { userId: ownerUserId, badgeKey: "partner_joined" },
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

  await attachDemoCommunity({ ownerUserId, householdKey: household.key });

  return { familyId: family.id, coParentUserId: coParent.id };
}

/** Joins a stage group and adds posts, so Connect is not an empty screen. */
export async function attachDemoCommunity(input: {
  ownerUserId: string;
  householdKey: string;
}): Promise<void> {
  const group = await prisma.communityGroup.findFirst({
    where: { kind: "STAGE", slug: "months-0-6" },
  });

  if (!group) return;

  await prisma.communityGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: input.ownerUserId } },
    create: { groupId: group.id, userId: input.ownerUserId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  // Only the first household authors posts; the rest read the same conversation, which is
  // what a real cohort looks like and exercises the block/report flows against someone else.
  if (input.householdKey !== DEMO_HOUSEHOLDS[0]!.key) return;

  for (const [index, body] of DEMO_COMMUNITY_POSTS.entries()) {
    await prisma.communityPost.create({
      data: {
        groupId: group.id,
        authorUserId: input.ownerUserId,
        body,
        createdAt: daysAgo(index),
      },
    });
  }
}
