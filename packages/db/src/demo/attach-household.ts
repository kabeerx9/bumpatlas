import { randomBytes } from "node:crypto";

import prisma from "../index";
import {
  DEMO_COMMUNITY_POSTS,
  DEMO_COMPLETIONS,
  DEMO_HOUSEHOLDS,
  DEMO_MEMORIES,
  DEMO_NEIGHBOURS,
  DEMO_RECAPS,
  type DemoHousehold,
} from "./data";
import { DEMO_AVATARS, DEMO_IMAGES, demoImageUrl } from "./images";

/**
 * Clerk-id prefix for the local-only cohort voices.
 *
 * Doubles as the marker for "this group's demo conversation has been seeded" and as the
 * handle teardown uses to find them again — they are the only rows that identify a seeded
 * community identity, so the prefix is defined once rather than typed in three places.
 */
export const COHORT_CLERK_PREFIX = "demo_cohort_";

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
      imageUrl: demoImageUrl(DEMO_AVATARS[1]),
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

  // Only fills a gap. The owner may be a real person signed in through Clerk, and
  // overwriting their actual avatar with a stock photograph would be worse than an
  // empty one — so this writes only where nothing is set.
  await prisma.user.updateMany({
    where: { id: ownerUserId, imageUrl: null },
    data: { imageUrl: demoImageUrl(DEMO_AVATARS[0]) },
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
        visibility: memory.isPrivate ? "PRIVATE" : "HOUSEHOLD",
        createdAt: eventDate,
      },
    });

    if (memory.image) {
      const image = DEMO_IMAGES[memory.image];
      await prisma.mediaAsset.create({
        data: {
          familyId: family.id,
          uploaderUserId: authorId,
          memoryId: created.id,
          // An absolute URL, which the media serializer passes through outside production.
          // `storageKey` is globally unique, so the family id keeps two households that
          // picked the same catalogue photo from colliding on the constraint.
          storageKey: `${demoImageUrl(memory.image)}#${family.id}-${index}`,
          contentType: "image/jpeg",
          byteSize: 180_000,
          width: image.width,
          height: image.height,
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

  await attachDemoRecaps({ familyId: family.id, childId: youngest.id });

  await attachDemoCommunity({ ownerUserId, householdKey: household.key });

  return { familyId: family.id, coParentUserId: coParent.id };
}

/** Monday of the week containing `date`, in UTC. Matches the generator's week boundary. */
export function weekStartOf(date: Date): Date {
  const monday = new Date(date);
  // getUTCDay() is 0 for Sunday, which belongs to the week that started six days earlier.
  const offset = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - offset);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Past weekly recaps.
 *
 * Counts are computed from the rows that were actually written rather than hardcoded: a
 * recap claiming nine memories in a week the timeline shows four is the kind of demo bug
 * that gets mistaken for a real aggregation fault.
 */
export async function attachDemoRecaps(input: {
  familyId: string;
  childId: string;
}): Promise<void> {
  for (const recap of DEMO_RECAPS) {
    const weekStart = weekStartOf(daysAgo(recap.weeksAgo * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const memoryCount = await prisma.memoryEntry.count({
      where: {
        familyId: input.familyId,
        deletedAt: null,
        eventDate: { gte: weekStart, lt: weekEnd },
      },
    });

    const completions = await prisma.challengeCompletion.findMany({
      where: { familyId: input.familyId, planDate: { gte: weekStart, lt: weekEnd } },
      select: { planDate: true, kind: true },
    });

    const distinctDays = (kind: "STORY" | "WELLNESS") =>
      new Set(
        completions.filter((c) => c.kind === kind).map((c) => c.planDate.toISOString()),
      ).size;

    const weekLabel = weekStart.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

    const data = {
      weekLabel: `Week of ${weekLabel}`,
      title: recap.title,
      highlights: recap.highlights,
      memoryCount,
      storyDays: distinctDays("STORY"),
      wellnessDays: distinctDays("WELLNESS"),
      childId: input.childId,
    };

    // Upsert on the same (familyId, weekStart) key the generator uses, so a seeded recap and
    // a later real generation converge on one row instead of racing to create two.
    await prisma.weeklyRecap.upsert({
      where: { familyId_weekStart: { familyId: input.familyId, weekStart } },
      create: { familyId: input.familyId, weekStart, ...data },
      update: data,
    });
  }
}

/**
 * Joins a stage group and adds a conversation, so Connect is not an empty screen.
 *
 * The cohort's other voices are local-only users created here rather than the seeded
 * households, because the households are attached independently and in any order — making
 * one household's posts depend on another having been seeded first produced a feed whose
 * contents varied with seeding order.
 */
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

  // Only the first household seeds the conversation; the rest join and read the same one,
  // which is what a real cohort looks like and exercises the block and report flows against
  // posts the reader did not write.
  if (input.householdKey !== DEMO_HOUSEHOLDS[0]!.key) return;

  // Already seeded by an earlier household attach — joining is enough.
  //
  // Keyed on a cohort neighbour being present, not on the group having *any* post. Those are
  // not the same test: a group carrying posts from an older seed format would satisfy the
  // second one forever, leaving the feed permanently stuck on whatever was written first with
  // no way to reseed short of deleting rows by hand.
  const seeded = await prisma.communityGroupMember.count({
    where: { groupId: group.id, user: { clerkId: { startsWith: COHORT_CLERK_PREFIX } } },
  });
  if (seeded > 0) return;

  const authors = new Map<string, string>([["owner", input.ownerUserId]]);
  for (const neighbour of DEMO_NEIGHBOURS) {
    const suffix = randomBytes(4).toString("hex");
    const user = await prisma.user.create({
      data: {
        clerkId: `${COHORT_CLERK_PREFIX}${neighbour.key}_${suffix}`,
        email: `${neighbour.key}-${suffix}@bumpatlas.example.com`,
        name: neighbour.name,
        imageUrl: demoImageUrl(DEMO_AVATARS[2]),
        timeZone: "Europe/London",
        isAdultAttested: true,
        onboardingCompletedAt: daysAgo(120),
        createdAt: daysAgo(120),
      },
    });
    authors.set(neighbour.key, user.id);

    await prisma.communityGroupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      create: { groupId: group.id, userId: user.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
  }

  for (const post of DEMO_COMMUNITY_POSTS) {
    const createdAt = daysAgo(post.daysAgo);
    const created = await prisma.communityPost.create({
      data: {
        groupId: group.id,
        authorUserId: authors.get(post.author)!,
        body: post.body,
        createdAt,
      },
    });

    for (const [index, comment] of post.comments.entries()) {
      await prisma.communityComment.create({
        data: {
          postId: created.id,
          authorUserId: authors.get(comment.author)!,
          body: comment.body,
          // Minutes after the post, so comment order is stable and reads as a conversation.
          createdAt: new Date(createdAt.getTime() + (index + 1) * 37 * 60_000),
        },
      });
    }

    await prisma.communityReaction.createMany({
      data: post.reactions.map((key) => ({
        postId: created.id,
        userId: authors.get(key)!,
        createdAt,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Removes the seeded community conversation from every stage group.
 *
 * Community rows are group-scoped, not family-scoped, so deleting a demo family leaves the
 * conversation behind — which is exactly how a re-seed ended up with a doubled feed. Deleting
 * the cohort users cascades their posts, comments and reactions; the owner's own posts have to
 * go explicitly, since the owner row itself survives.
 */
export async function removeDemoCommunity(ownerUserId: string): Promise<void> {
  await prisma.user.deleteMany({
    where: { clerkId: { startsWith: COHORT_CLERK_PREFIX } },
  });

  await prisma.communityPost.deleteMany({
    where: { authorUserId: ownerUserId, group: { kind: "STAGE" } },
  });

  await prisma.communityComment.deleteMany({ where: { authorUserId: ownerUserId } });
}
