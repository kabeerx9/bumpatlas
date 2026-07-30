import prisma from "@bumpatlas/db";
import type { ContentDetail, ContentItem as ContentItemContract, WellnessAction } from "@bumpatlas/contracts/v1";
import type { ContentItem, Prisma, WellnessAction as WellnessActionRow } from "@bumpatlas/db/types";

import { ServiceError } from "@/services/errors";

/**
 * The only content visibility filter.
 *
 * Draft and withdrawn content must never reach a client: withdrawal is how a safety
 * issue is pulled, so it has to take effect on the next read.
 */
const visible: Prisma.ContentItemWhereInput = { isPublished: true, withdrawnAt: null };

export function serializeContentItem(
  item: ContentItem,
  bookmarked: boolean,
): ContentItemContract {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    readingMinutes: item.readingMinutes,
    stageTags: item.stageTags,
    bookmarked,
  };
}

export function serializeContentDetail(
  item: ContentItem,
  bookmarked: boolean,
): ContentDetail {
  return {
    ...serializeContentItem(item, bookmarked),
    bodyMarkdown: item.bodyMarkdown,
    // Reviewer provenance is part of the safety contract, not decoration.
    reviewerName: item.reviewerName,
    reviewedOn: item.reviewedOn?.toISOString().slice(0, 10) ?? null,
    sourceName: item.sourceName,
  };
}

export function serializeWellnessAction(action: WellnessActionRow): WellnessAction {
  return {
    id: action.id,
    title: action.title,
    detail: action.detail,
    duration: action.duration,
    durationSeconds: action.durationSeconds,
    stageNote: action.stageNote,
    stageTags: action.stageTags,
    reviewerName: action.reviewerName,
    reviewedOn: action.reviewedOn?.toISOString().slice(0, 10) ?? null,
    sourceName: action.sourceName,
    clearanceCopy: action.clearanceCopy,
    stopCopy: action.stopCopy,
    badgeOnComplete: null,
    steps: action.steps as WellnessAction["steps"],
  };
}

export async function listContent(input: {
  userId: string;
  stageTag?: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: ContentItemContract[]; nextCursor: string | null }> {
  const items = await prisma.contentItem.findMany({
    where: {
      ...visible,
      // Memory prompts are Today-only machinery, not library reading.
      type: { not: "MEMORY_PROMPT" },
      ...(input.stageTag
        ? { OR: [{ stageTags: { has: input.stageTag } }, { stageTags: { isEmpty: true } }] }
        : {}),
      ...(input.cursor ? { id: { lt: input.cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: input.limit + 1,
  });

  const hasMore = items.length > input.limit;
  const page = hasMore ? items.slice(0, input.limit) : items;

  const bookmarked = await bookmarkedIds(
    input.userId,
    page.map((item) => item.id),
  );

  return {
    items: page.map((item) => serializeContentItem(item, bookmarked.has(item.id))),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

async function bookmarkedIds(userId: string, contentItemIds: string[]): Promise<Set<string>> {
  if (contentItemIds.length === 0) return new Set();

  const rows = await prisma.contentBookmark.findMany({
    where: { userId, contentItemId: { in: contentItemIds } },
    select: { contentItemId: true },
  });

  return new Set(rows.map((row) => row.contentItemId));
}

export async function getContentBySlug(input: {
  userId: string;
  slug: string;
}): Promise<ContentDetail> {
  const item = await prisma.contentItem.findFirst({
    where: { ...visible, slug: input.slug },
  });

  if (!item) {
    // Same answer for "draft" and "does not exist": otherwise this is a way to
    // enumerate unreleased content.
    throw new ServiceError(404, "CONTENT_NOT_FOUND", "Article not found.");
  }

  const bookmarked = await bookmarkedIds(input.userId, [item.id]);

  return serializeContentDetail(item, bookmarked.has(item.id));
}

/**
 * Toggles a bookmark.
 *
 * Toggle rather than create-only, matching the shipped client's single POST. The unique
 * constraint means a double tap ends in a defined state instead of two rows.
 */
export async function toggleBookmark(input: {
  userId: string;
  contentItemId: string;
}): Promise<{ bookmarked: boolean }> {
  const item = await prisma.contentItem.findFirst({
    where: { ...visible, id: input.contentItemId },
    select: { id: true },
  });

  if (!item) {
    throw new ServiceError(404, "CONTENT_NOT_FOUND", "Article not found.");
  }

  const existing = await prisma.contentBookmark.findUnique({
    where: { userId_contentItemId: { userId: input.userId, contentItemId: item.id } },
  });

  if (existing) {
    await prisma.contentBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }

  await prisma.contentBookmark.create({
    data: { userId: input.userId, contentItemId: item.id },
  });

  return { bookmarked: true };
}
