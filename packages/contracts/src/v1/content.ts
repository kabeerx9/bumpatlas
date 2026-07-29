import { z } from "zod";

import { cursorPageSchema } from "./common";

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

export const contentDetailSchema = contentItemSchema.extend({
  bodyMarkdown: z.string(),
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

export const listContentResponseSchema = z
  .object({
    items: z.array(contentItemSchema),
  })
  .merge(cursorPageSchema);
export type ListContentResponse = z.infer<typeof listContentResponseSchema>;
