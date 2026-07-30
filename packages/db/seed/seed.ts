import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prisma from "../src/index";

/**
 * Repeatable content seed. Upserts by slug, so running it twice is a no-op and
 * re-running after editing a JSON file updates in place rather than duplicating.
 *
 * The publish gate is enforced here rather than trusted from the JSON: anything that
 * makes a claim about pregnancy, a parent's body, or child development stays
 * unpublished until a named reviewer and a review date exist. A seed file that says
 * `isPublished: true` without them is a bug, and this script refuses it.
 */

const seedDir = path.dirname(fileURLToPath(import.meta.url));

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(seedDir, relativePath), "utf8")) as T;
}

type MemoryPromptSeed = { slug: string; prompt: string; stageTags: string[] };

type WellnessActionSeed = {
  slug: string;
  title: string;
  detail: string;
  duration: string;
  durationSeconds: number;
  stageNote: string;
  stageTags: string[];
  clearanceCopy: string;
  stopCopy: string;
  badgeKey: string | null;
  steps: { id: string; title: string; body: string }[];
  sourceName: string | null;
  reviewerName: string | null;
  reviewedOn: string | null;
  isPublished: boolean;
};

type MilestoneSeed = {
  slug: string;
  title: string;
  guidance: string;
  domain: string;
  stageTags: string[];
  reviewerName: string | null;
  reviewedOn: string | null;
  isPublished: boolean;
};

/**
 * A memory prompt is a journaling question with no health claim, so it publishes
 * without a reviewer. Everything else must earn it.
 */
function assertReviewGate(
  kind: string,
  item: { slug: string; reviewerName: string | null; reviewedOn: string | null; isPublished: boolean },
): boolean {
  if (!item.isPublished) return false;

  if (!item.reviewerName || !item.reviewedOn) {
    throw new Error(
      `${kind} "${item.slug}" is marked published without reviewerName and reviewedOn. ` +
        "Health-adjacent content cannot publish without review.",
    );
  }

  return true;
}

async function seedMemoryPrompts(): Promise<number> {
  const prompts = readJson<MemoryPromptSeed[]>("content/memory-prompts.json");

  for (const prompt of prompts) {
    await prisma.contentItem.upsert({
      where: { slug: prompt.slug },
      create: {
        slug: prompt.slug,
        type: "MEMORY_PROMPT",
        title: prompt.prompt,
        summary: prompt.prompt,
        bodyMarkdown: prompt.prompt,
        readingMinutes: 1,
        stageTags: prompt.stageTags,
        isPublished: true,
      },
      update: {
        title: prompt.prompt,
        summary: prompt.prompt,
        bodyMarkdown: prompt.prompt,
        stageTags: prompt.stageTags,
        isPublished: true,
      },
    });
  }

  return prompts.length;
}

async function seedWellnessActions(): Promise<number> {
  const actions = readJson<WellnessActionSeed[]>("content/wellness-actions.json");

  for (const action of actions) {
    const isPublished = assertReviewGate("Wellness action", action);

    const data = {
      title: action.title,
      detail: action.detail,
      duration: action.duration,
      durationSeconds: action.durationSeconds,
      stageNote: action.stageNote,
      stageTags: action.stageTags,
      clearanceCopy: action.clearanceCopy,
      stopCopy: action.stopCopy,
      steps: action.steps,
      badgeKey: action.badgeKey,
      sourceName: action.sourceName,
      reviewerName: action.reviewerName,
      reviewedOn: action.reviewedOn ? new Date(`${action.reviewedOn}T00:00:00.000Z`) : null,
      isPublished,
    };

    await prisma.wellnessAction.upsert({
      where: { slug: action.slug },
      create: { slug: action.slug, ...data },
      update: data,
    });
  }

  return actions.length;
}

async function seedMilestones(): Promise<number> {
  const milestones = readJson<MilestoneSeed[]>("content/milestone-definitions.json");

  for (const milestone of milestones) {
    const isPublished = assertReviewGate("Milestone definition", milestone);

    const data = {
      title: milestone.title,
      guidance: milestone.guidance,
      domain: milestone.domain,
      stageTags: milestone.stageTags,
      reviewerName: milestone.reviewerName,
      reviewedOn: milestone.reviewedOn ? new Date(`${milestone.reviewedOn}T00:00:00.000Z`) : null,
      isPublished,
    };

    await prisma.milestoneDefinition.upsert({
      where: { slug: milestone.slug },
      create: { slug: milestone.slug, ...data },
      update: data,
    });
  }

  return milestones.length;
}

async function main() {
  const prompts = await seedMemoryPrompts();
  const actions = await seedWellnessActions();
  const milestones = await seedMilestones();

  console.log(
    `Seeded ${prompts} memory prompts, ${actions} wellness actions, ${milestones} milestone definitions.`,
  );
  console.log("Run `pnpm --filter @bumpatlas/db seed:validate` to check launch inventory.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
