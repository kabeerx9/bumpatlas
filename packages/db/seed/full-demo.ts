import { createHash, randomBytes } from "node:crypto";

import prisma from "../src/index";
import {
  attachDemoHousehold,
  COHORT_CLERK_PREFIX,
  daysAgo,
  removeDemoCommunity,
  weekStartOf,
} from "../src/demo/attach-household";
import type { DemoHousehold } from "../src/demo/data";
import { DEMO_IMAGES, demoImageUrl, type DemoImageKey } from "../src/demo/images";
import { assertSafeSeedTarget } from "./guard";

/**
 * Gives one real, signed-in account a complete, coherent demo dataset — every screen has
 * something real to render, spread across a believable multi-month history rather than a
 * pile of data all dated "today".
 *
 *   pnpm --filter @bumpatlas/db seed:full-demo <clerkUserId>              default 6 months
 *   pnpm --filter @bumpatlas/db seed:full-demo <clerkUserId> --months 9
 *   pnpm --filter @bumpatlas/db seed:full-demo <clerkUserId> --replace    drop the earlier run first
 *
 * Builds on `attachDemoHousehold` for the household shape every other seed already produces
 * (family, two children, co-parent, notification prefs, consents, base memories/completions/
 * milestones/recaps/community) and then layers on top of it — extra memories, a longer
 * completion history, every milestone definition instead of the first three, more weekly
 * recaps, a bigger community conversation, and a pending invite — so the account looks like
 * it has been lived in for months, not seeded five minutes ago.
 *
 * Not idempotent by default: re-running adds a second round of the "extra" layer on top of
 * the first (the base household from `attachDemoHousehold` is safely re-upsertable, but the
 * extension queries below are plain creates). Pass `--replace` to remove the previous run
 * first, matched on this script's own family-name marker so a real household never gets
 * caught by it.
 */

const FAMILY_NAME = "The Demo family (full seed)";
const EXTRA_COHORT_NAMES = [
  "Marcus D.",
  "Aisha K.",
  "Leo P.",
  "Ines M.",
  "Chen W.",
  "Fatima R.",
] as const;

/** Non-avatar catalogue keys, for cycling through extra memory photos. */
const EXTRA_IMAGE_KEYS = (Object.keys(DEMO_IMAGES) as DemoImageKey[]).filter(
  (key) => !key.startsWith("avatar-"),
);

const EXTRA_MEMORY_TEMPLATES = [
  "Tried solids for the first time. Verdict: unclear, but enthusiastic.",
  "Story time before bed, the same book for the fourth night running.",
  "Discovered the sound the pans make. Discovered it a lot.",
  "First proper laugh at absolutely nothing. Doing it again immediately.",
  "Long walk to the shops and back, asleep for most of it.",
  "New tooth, apparently. Everyone found out at 2am.",
  "Stacked the cups, knocked them over, looked delighted.",
  "Grandparent visit. Photos on the good camera, for once.",
  "Rolled over twice in one afternoon and seemed unbothered by it.",
  "Splashed in the paddling pool until thoroughly cold.",
  "Said something that was almost a word. We are counting it.",
  "Fell asleep mid-snack. Snack remains uneaten, on the floor.",
  "First time in the swing at the park, unsure but game.",
  "Painted with fingers. Mostly on the table, some on paper.",
  "Slept through the night. Writing it down before it stops being true.",
  "Chased the dog around the garden twice, lost both times.",
  "New babysitter day. Went better than expected for everyone.",
  "Practiced standing, holding the sofa, very serious about it.",
  "Ate an entire banana unassisted. Milestone, arguably.",
  "Quiet Sunday. Nothing happened and it was good.",
  "Big cousins visited, total chaos, thoroughly enjoyed by all.",
  "First trip to the library. Chewed a corner of a board book.",
  "Learned to wave. Waves at everything now, including furniture.",
  "Wore the coat with the ears on it. Non-negotiable this week.",
  "Nap refused twice, taken once, unannounced, at 4pm.",
  "Helped water the plants, watered mostly the patio.",
  "First snow this year. Watched it through the window, unimpressed.",
  "Danced to the kitchen radio for a full three minutes.",
  "New shoes, immediately removed, worn again under protest.",
  "Bath time with the boat. The boat capsized repeatedly, gleefully.",
  "Pulled up to standing against the coffee table. Proud of itself.",
  "Shared a biscuit, unprompted, with the sibling. Noted for the record.",
  "Doctor's check-up. All fine. Cried mostly about the waiting room.",
  "First time saying goodnight properly instead of just crying about it.",
  "Sorted the shape sorter by throwing every piece at once.",
  "Watched the washing machine for ten straight minutes, captivated.",
  "Picked out their own hat. It did not match anything. Wore it anyway.",
  "Practiced climbing the stairs, closely supervised, very determined.",
  "First proper sentence, four words, mostly about a biscuit.",
  "Fell asleep in the car seat before we left the driveway.",
  "Helped fold the washing, unfolded most of what got folded.",
  "Ran the whole length of the garden without stopping once.",
  "New word today, used correctly and often, all afternoon.",
  "Quiet morning with porridge everywhere except the bowl.",
  "First go on the slide, wanted straight back up for another.",
  "Practiced counting to three, skipped two most of the time.",
  "Fed the sibling a spoonful of yoghurt, unsupervised, briefly.",
  "Long overdue haircut. Survived it better than we did.",
  "Built a tower taller than usual, celebrated its collapse.",
  "Asked for the same song four times in a row in the car.",
];

type ExtraMemory = { daysAgo: number; body: string; childIndex: 0 | 1; image: DemoImageKey };

/**
 * Spreads the extra memories across the requested span with real clustering: dense around a
 * handful of "eventful" weeks, thin in between, rather than one evenly-spaced grid — which is
 * what a real timeline never looks like.
 */
function buildExtraMemories(count: number, spanDays: number): ExtraMemory[] {
  const memories: ExtraMemory[] = [];
  // A handful of cluster centres through the span (skipping the most recent ~80 days, which
  // the base household's own 34 memories already cover) plus a few quiet gap weeks.
  const clusterCentres = [110, 135, 160, 190, 220, 250, 280, 310, 340].filter(
    (d) => d < spanDays,
  );

  for (let i = 0; i < count; i++) {
    const centre = clusterCentres[i % clusterCentres.length]!;
    const jitter = ((i * 37) % 11) - 5; // deterministic spread, +/-5 days around the centre
    const day = Math.min(spanDays - 1, Math.max(80, centre + jitter));
    const template = EXTRA_MEMORY_TEMPLATES[i % EXTRA_MEMORY_TEMPLATES.length]!;
    const image = EXTRA_IMAGE_KEYS[i % EXTRA_IMAGE_KEYS.length]!;

    memories.push({
      daysAgo: day,
      body: template,
      childIndex: i % 2 === 0 ? 1 : 0,
      image,
    });
  }

  return memories;
}

function parseArgs(): { clerkUserId: string; months: number; replace: boolean } {
  const args = process.argv.slice(2);
  const clerkUserId = args.find((arg) => !arg.startsWith("--"));

  if (!clerkUserId || !/^user_[A-Za-z0-9]+$/.test(clerkUserId)) {
    console.error("Usage: seed:full-demo <clerkUserId> [--months 6] [--replace]");
    process.exit(1);
  }

  const monthsFlag = args.indexOf("--months");
  const months = monthsFlag === -1 ? 6 : Number(args[monthsFlag + 1]);
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw new Error("--months must be an integer between 1 and 24");
  }

  return { clerkUserId, months, replace: args.includes("--replace") };
}

/** Removes a previous run of this script for the same account. */
async function removePreviousRun(ownerUserId: string): Promise<void> {
  const family = await prisma.family.findFirst({
    where: { ownerUserId, name: FAMILY_NAME },
    select: { id: true, members: { select: { user: { select: { id: true, clerkId: true } } } } },
  });

  if (!family) return;

  const coParentIds = family.members
    .map((m) => m.user)
    .filter((u) => u.id !== ownerUserId && u.clerkId.startsWith("demo_fulldemo_"))
    .map((u) => u.id);

  await prisma.family.delete({ where: { id: family.id } });
  if (coParentIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: coParentIds } } });
  }
  await removeDemoCommunity(ownerUserId);
}

async function main(): Promise<void> {
  assertSafeSeedTarget();
  const { clerkUserId, months, replace } = parseArgs();
  const spanDays = months * 30;

  const [milestoneDefinitionCount, communityGroupCount] = await Promise.all([
    prisma.milestoneDefinition.count(),
    prisma.communityGroup.count(),
  ]);

  if (milestoneDefinitionCount === 0 || communityGroupCount === 0) {
    throw new Error(
      "Content seed has not run — milestone definitions and community groups are needed for " +
        "a coherent dataset. Run `pnpm --filter @bumpatlas/db seed:content` first, then re-run this script.",
    );
  }

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    create: { clerkId: clerkUserId },
    update: {},
    select: { id: true, email: true },
  });

  if (replace) {
    await removePreviousRun(user.id);
    console.log("Removed a previous run of this script for this account.");
  }

  const suffix = randomBytes(4).toString("hex");
  const household: DemoHousehold = {
    key: "fulldemo",
    familyName: FAMILY_NAME,
    owner: { email: user.email ?? `full-demo-${suffix}@bumpatlas.example.com`, name: "You" },
    coParent: { name: "Sam" },
    children: [
      { displayName: "Theo", ageInMonths: 26 }, // toddler
      { displayName: "Wren", ageInMonths: 3 }, // infant, becomes the active child
    ],
    isPremium: true,
  };

  const { familyId, coParentUserId } = await attachDemoHousehold({
    ownerUserId: user.id,
    household,
    coParent: {
      clerkId: `demo_fulldemo_coparent_${suffix}`,
      email: `demo-fulldemo-coparent-${suffix}@bumpatlas.example.com`,
    },
  });

  const children = await prisma.childProfile.findMany({
    where: { familyId },
    orderBy: { birthOrder: "asc" },
    select: { id: true, dateOfBirth: true },
  });
  const toddler = children[0]!;
  const infant = children[1]!;

  // --- extra memories, spread across the rest of the requested span -------------------------
  const targetTotal = Math.min(100, Math.max(60, Math.round(months * 13)));
  const extraCount = Math.max(0, targetTotal - 34);
  const extraMemories = buildExtraMemories(extraCount, spanDays);

  let extraMemoryCount = 0;
  for (const [index, memory] of extraMemories.entries()) {
    const child = memory.childIndex === 0 ? toddler : infant;
    // Alternate authorship the same way the base household does.
    const authorId = index % 3 === 0 ? coParentUserId : user.id;
    const eventDate = daysAgo(memory.daysAgo);

    const created = await prisma.memoryEntry.create({
      data: {
        familyId,
        authorUserId: authorId,
        childId: child.id,
        title: memory.body.slice(0, 120),
        body: memory.body,
        eventDate,
        // A minority private, same ratio as the base fixture.
        visibility: index % 9 === 0 ? "PRIVATE" : "HOUSEHOLD",
        createdAt: eventDate,
      },
    });

    const image = DEMO_IMAGES[memory.image];
    await prisma.mediaAsset.create({
      data: {
        familyId,
        uploaderUserId: authorId,
        memoryId: created.id,
        storageKey: `${demoImageUrl(memory.image)}#${familyId}-extra-${index}`,
        contentType: "image/jpeg",
        byteSize: 180_000,
        width: image.width,
        height: image.height,
        status: "ATTACHED",
        createdAt: eventDate,
      },
    });
    extraMemoryCount++;
  }

  // --- challenge completions: a believable weekly rhythm across the whole span --------------
  // The base household already covers the last ~20 days; extend a 3-4/week rhythm out to the
  // edge of the span, upserting so a second run cannot double-count a day.
  let extraCompletionCount = 0;
  const totalWeeks = Math.ceil(spanDays / 7);
  for (let week = 3; week < totalWeeks; week++) {
    // 3-4 completions this week, on different days, alternating kind so both STORY and
    // WELLNESS streaks have real weeks to look back on.
    const daysThisWeek = 3 + (week % 2);
    for (let i = 0; i < daysThisWeek; i++) {
      const dayOffset = week * 7 + i * 2;
      if (dayOffset >= spanDays) break;
      const kind = i % 2 === 0 ? "STORY" : "WELLNESS";
      const planDate = daysAgo(dayOffset);
      await prisma.challengeCompletion.upsert({
        where: { userId_planDate_kind: { userId: user.id, planDate, kind } },
        create: { userId: user.id, familyId, planDate, kind },
        update: { familyId },
      });
      extraCompletionCount++;
    }
  }

  await prisma.badgeAward.createMany({
    data: [
      { userId: user.id, badgeKey: "week_streak" },
      { userId: user.id, badgeKey: "milestone_moment" },
    ],
    skipDuplicates: true,
  });

  // --- milestone observations: every definition, statuses spread realistically -------------
  const definitions = await prisma.milestoneDefinition.findMany();
  let observedCount = 0;
  let emergingCount = 0;
  let notObservedCount = 0;

  for (const [index, definition] of definitions.entries()) {
    const targetsInfant = definition.stageTags.some((tag) =>
      ["NB_0_3M", "I_3_6M", "I_6_12M"].includes(tag),
    );
    const child = targetsInfant ? infant : toddler;
    const bucket = index % 3;
    const status: "OBSERVED" | "EMERGING" | "NOT_OBSERVED" =
      bucket === 0 ? "OBSERVED" : bucket === 1 ? "EMERGING" : "NOT_OBSERVED";

    if (status === "OBSERVED") observedCount++;
    else if (status === "EMERGING") emergingCount++;
    else notObservedCount++;

    // observedAt must land after the child's own date of birth, or the app would be showing a
    // milestone reached before the child existed.
    const ageInDays = Math.floor(
      (Date.now() - child.dateOfBirth.getTime()) / (24 * 60 * 60 * 1000),
    );
    const observedDaysAgo = status === "OBSERVED" ? Math.max(1, Math.min(ageInDays, 5 + index * 3)) : null;

    await prisma.milestoneObservation.upsert({
      where: { childId_definitionId: { childId: child.id, definitionId: definition.id } },
      create: {
        familyId,
        childId: child.id,
        definitionId: definition.id,
        status,
        observedAt: observedDaysAgo === null ? null : daysAgo(observedDaysAgo),
      },
      update: {
        status,
        observedAt: observedDaysAgo === null ? null : daysAgo(observedDaysAgo),
      },
    });
  }

  // --- weekly recaps: several past weeks, counts derived from what was actually written -----
  const recapWeeks = Math.min(10, Math.max(3, Math.floor(spanDays / 7)));
  const recapTitles = [
    "A week of firsts",
    "Quiet mornings",
    "Out and about",
    "Slow and steady",
    "A busy stretch",
    "Small wins",
    "Settling in",
    "New sounds",
    "On the move",
    "Steady as ever",
  ];

  let recapCount = 0;
  for (let weeksAgo = 0; weeksAgo < recapWeeks; weeksAgo++) {
    const weekStart = weekStartOf(daysAgo(weeksAgo * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const memoryCount = await prisma.memoryEntry.count({
      where: { familyId, deletedAt: null, eventDate: { gte: weekStart, lt: weekEnd } },
    });
    const completions = await prisma.challengeCompletion.findMany({
      where: { familyId, planDate: { gte: weekStart, lt: weekEnd } },
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
      title: recapTitles[weeksAgo % recapTitles.length]!,
      highlights: ["A steady week", "Time together", "Small moments worth keeping"],
      memoryCount,
      storyDays: distinctDays("STORY"),
      wellnessDays: distinctDays("WELLNESS"),
      childId: infant.id,
    };

    await prisma.weeklyRecap.upsert({
      where: { familyId_weekStart: { familyId, weekStart } },
      create: { familyId, weekStart, ...data },
      update: data,
    });
    recapCount++;
  }

  // --- community: extra local voices and posts, on top of the base household's 7 -----------
  const group = await prisma.communityGroup.findFirst({ where: { kind: "STAGE", slug: "months-0-6" } });
  let extraPostCount = 0;
  let commentCount = 0;
  let reactionCount = 0;

  if (group) {
    const authorIds: string[] = [];
    for (const name of EXTRA_COHORT_NAMES) {
      const cohortSuffix = randomBytes(4).toString("hex");
      const cohortUser = await prisma.user.create({
        data: {
          clerkId: `${COHORT_CLERK_PREFIX}extra_${cohortSuffix}`,
          email: `extra-${cohortSuffix}@bumpatlas.example.com`,
          name,
          timeZone: "Europe/London",
          isAdultAttested: true,
          onboardingCompletedAt: daysAgo(60),
          createdAt: daysAgo(60),
        },
      });
      authorIds.push(cohortUser.id);
      await prisma.communityGroupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: cohortUser.id } },
        create: { groupId: group.id, userId: cohortUser.id, status: "ACTIVE" },
        update: { status: "ACTIVE" },
      });
    }

    const extraPostBodies = [
      "Does anyone else's toddler negotiate bedtime like it's a hostage situation?",
      "First time both kids napped at the same time today. I did not know what to do with myself.",
      "Anyone got a good answer for 'why' that actually ends the loop?",
      "Two teeth in one week. We are all a bit shattered.",
      "Public service announcement: the swing at the park by the church is finally fixed.",
      "Started solids again after a food strike. Cautiously optimistic.",
      "Someone tell me the 18 month sleep regression actually ends.",
      "Small joy: matching pyjamas were, against all odds, a hit tonight.",
      "How is everyone handling the clocks changing with a toddler in the mix?",
      "Got both of them out the door in matching coats. Personal best.",
      "Anyone else's kid suddenly obsessed with one specific spoon?",
      "Rough morning, good afternoon. Feels like most days lately.",
      "Does teething ever stop being a whole household event?",
      "First shoes that actually stayed on for a whole walk. Miracle.",
      "Wondering if anyone's tried baby-led weaning with a strong-willed toddler watching on.",
      "Nap transition chaos continues. Send tea.",
      "Found ten minutes to sit down today and honestly did not know what to do with it.",
      "Toddler decided the stairs are for climbing backwards only now.",
    ];

    for (const [index, body] of extraPostBodies.entries()) {
      const authorId = authorIds[index % authorIds.length]!;
      const createdAt = daysAgo(index % 21);
      const post = await prisma.communityPost.create({
        data: { groupId: group.id, authorUserId: authorId, body, createdAt },
      });
      extraPostCount++;

      // Roughly every other post gets a couple of comments, from other cohort voices.
      if (index % 2 === 0) {
        const commentAuthors = [
          authorIds[(index + 1) % authorIds.length]!,
          user.id,
        ];
        for (const [ci, commentAuthorId] of commentAuthors.entries()) {
          await prisma.communityComment.create({
            data: {
              postId: post.id,
              authorUserId: commentAuthorId,
              body: ci === 0 ? "Same here, no idea what fixed it in the end." : "Sending solidarity.",
              createdAt: new Date(createdAt.getTime() + (ci + 1) * 41 * 60_000),
            },
          });
          commentCount++;
        }
      }

      // Most posts get a handful of reactions.
      if (index % 3 !== 0) {
        const reactors = [...authorIds.slice(0, 3), user.id];
        await prisma.communityReaction.createMany({
          data: reactors.map((reactorId) => ({ postId: post.id, userId: reactorId, createdAt })),
          skipDuplicates: true,
        });
        reactionCount += reactors.length;
      }
    }
  }

  // --- pending invite: household is not fully "settled" without one ------------------------
  const inviteToken = randomBytes(32).toString("hex");
  await prisma.familyInvite.create({
    data: {
      familyId,
      tokenHash: createHash("sha256").update(inviteToken).digest("hex"),
      role: "CONTRIBUTOR",
      email: `pending-invite-${suffix}@bumpatlas.example.com`,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdByUserId: user.id,
    },
  });

  // --- summary ---------------------------------------------------------------------------
  const [totalMemories, totalMedia, totalCompletions, totalBadges, totalPosts, totalComments, totalReactions] =
    await Promise.all([
      prisma.memoryEntry.count({ where: { familyId } }),
      prisma.mediaAsset.count({ where: { familyId } }),
      prisma.challengeCompletion.count({ where: { familyId } }),
      prisma.badgeAward.count({ where: { userId: user.id } }),
      group ? prisma.communityPost.count({ where: { groupId: group.id } }) : Promise.resolve(0),
      group ? prisma.communityComment.count({ where: { post: { groupId: group.id } } }) : Promise.resolve(0),
      group ? prisma.communityReaction.count({ where: { post: { groupId: group.id } } }) : Promise.resolve(0),
    ]);

  console.log(`\nAttached "${FAMILY_NAME}" (${familyId}) to ${clerkUserId} as the default family.\n`);
  console.log("Summary:");
  console.log("  households              1");
  console.log("  children                2 (1 infant, 1 toddler)");
  console.log("  members                 2 active + 1 pending invite");
  console.log(`  memories                ${totalMemories} (${extraMemoryCount} added by this run)`);
  console.log(`  media assets            ${totalMedia}`);
  console.log(`  challenge completions   ${totalCompletions} (${extraCompletionCount} added by this run)`);
  console.log(`  badge awards            ${totalBadges}`);
  console.log(
    `  milestone observations  ${definitions.length} (${observedCount} observed, ${emergingCount} emerging, ${notObservedCount} not yet)`,
  );
  console.log(`  weekly recaps           ${recapCount}`);
  console.log(
    `  community posts         ${totalPosts} (${extraPostCount} added by this run, ${totalComments} comments, ${totalReactions} reactions)`,
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
