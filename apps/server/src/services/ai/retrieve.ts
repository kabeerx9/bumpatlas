import prisma from "@bumpatlas/db";

import { normalise } from "@/services/ai/safety";
import type { StageKey } from "@/services/stage";

export type Snippet = {
  slug: string;
  title: string;
  body: string;
  reviewerName: string | null;
};

/** Enough context to answer, few enough that the prompt stays inspectable. */
const MAX_SNIPPETS = 4;
const MIN_TERM_LENGTH = 4;

const STOP_WORDS = new Set([
  "about", "after", "again", "baby", "because", "been", "before", "being", "does", "doing",
  "from", "have", "help", "here", "how", "just", "know", "like", "made", "make", "many",
  "much", "my", "need", "only", "other", "over", "should", "some", "than", "that", "them",
  "then", "there", "these", "they", "this", "very", "want", "what", "when", "where",
  "which", "while", "will", "with", "would", "your",
]);

export function extractTerms(message: string): string[] {
  return [
    ...new Set(
      normalise(message)
        .split(" ")
        .filter((word) => word.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(word)),
    ),
  ].slice(0, 8);
}

/**
 * Retrieves reviewed, published content to answer from.
 *
 * Keyword matching over `ContentItem`, not embeddings: the blueprint defers a vector store
 * until keyword retrieval provably fails, and with a few hundred curated items it will not.
 *
 * Only `AI_SNIPPET` and stage-matched reviewed material is eligible. Community posts, other
 * families' data, and memory text are never retrievable here — the query cannot reach them
 * because it only reads `ContentItem`.
 */
export async function retrieveSnippets(input: {
  message: string;
  stageKey: StageKey;
}): Promise<Snippet[]> {
  const terms = extractTerms(input.message);

  if (terms.length === 0) return [];

  const candidates = await prisma.contentItem.findMany({
    where: {
      isPublished: true,
      withdrawnAt: null,
      type: { in: ["AI_SNIPPET", "PARENTING_TIP", "PREGNANCY_WEEK_CARD", "PARENT_WELLNESS_CARD"] },
      OR: terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" as const } },
        { summary: { contains: term, mode: "insensitive" as const } },
      ]),
    },
    select: {
      slug: true,
      title: true,
      summary: true,
      bodyMarkdown: true,
      stageTags: true,
      reviewerName: true,
    },
    take: 20,
  });

  // Stage-matched content first: the same question has a different answer at 8 weeks
  // pregnant and at 18 months.
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score:
        (candidate.stageTags.includes(input.stageKey) ? 2 : 0) +
        terms.filter(
          (term) =>
            candidate.title.toLowerCase().includes(term) ||
            candidate.summary.toLowerCase().includes(term),
        ).length,
    }))
    .sort((a, b) => b.score - a.score || a.candidate.slug.localeCompare(b.candidate.slug))
    .slice(0, MAX_SNIPPETS);

  return scored.map(({ candidate }) => ({
    slug: candidate.slug,
    title: candidate.title,
    body: candidate.summary || candidate.bodyMarkdown,
    reviewerName: candidate.reviewerName,
  }));
}
