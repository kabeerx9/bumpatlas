import { z } from "zod";

import { cursorPageSchema } from "./common";
import { cursorQuerySchema } from "./pagination";

export const contentItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  readingMinutes: z.number().int().positive(),
  stageTags: z.array(z.string()),
  bookmarked: z.boolean().optional(),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

/**
 * Correction 10: reviewer provenance is required on detail responses. The
 * pregnancy/wellness safety rule is that this content cannot publish without a
 * reviewer and a reviewed date, and the UI has to be able to show both.
 */
export const contentDetailSchema = contentItemSchema.extend({
  bodyMarkdown: z.string(),
  reviewerName: z.string().nullable(),
  reviewedOn: z.string().nullable(),
  sourceName: z.string().nullable(),
  citations: z
    .array(
      z.object({
        title: z.string(),
        source: z.string(),
        url: z.string().url().optional(),
      }),
    )
    .optional(),
});
export type ContentDetail = z.infer<typeof contentDetailSchema>;

export const listContentQuerySchema = cursorQuerySchema.extend({
  stageTag: z.string().min(1).optional(),
});
export type ListContentQuery = z.infer<typeof listContentQuerySchema>;

export const listContentResponseSchema = z
  .object({
    items: z.array(contentItemSchema),
  })
  .merge(cursorPageSchema);
export type ListContentResponse = z.infer<typeof listContentResponseSchema>;

/**
 * A guided wellness ("Care") action. This is reviewed content, not a generic
 * exercise: the safety copy is part of the payload because the Care screen must
 * render clearance and stop guidance before and during the action, and the
 * pregnancy variants cannot ship without a named reviewer.
 *
 * Shape mirrors what the released Care screen reads
 * (`apps/native/features/challenges/screens/care-screen.tsx`).
 */
export const wellnessActionStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
});
export type WellnessActionStep = z.infer<typeof wellnessActionStepSchema>;

export const wellnessActionSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  /** Human label such as "2 min"; `durationSeconds` drives the timer. */
  duration: z.string(),
  durationSeconds: z.number().int().positive(),
  stageNote: z.string(),
  stageTags: z.array(z.string()),
  reviewerName: z.string().nullable(),
  reviewedOn: z.string().nullable(),
  sourceName: z.string().nullable(),
  clearanceCopy: z.string(),
  stopCopy: z.string(),
  badgeOnComplete: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
    })
    .nullable()
    .optional(),
  steps: z.array(wellnessActionStepSchema),
});
export type WellnessAction = z.infer<typeof wellnessActionSchema>;
