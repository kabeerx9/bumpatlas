import { z } from "zod";

import { cursorPageSchema, visibilitySchema } from "./common";

export const memorySchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  eventDate: z.string(),
  authorName: z.string(),
  visibility: visibilitySchema,
  mediaStorageKey: z.string().nullable(),
  mediaUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Memory = z.infer<typeof memorySchema>;

export const listMemoriesResponseSchema = z
  .object({
    items: z.array(memorySchema),
  })
  .merge(cursorPageSchema);
export type ListMemoriesResponse = z.infer<typeof listMemoriesResponseSchema>;

export const createMemoryInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  eventDate: z.string().min(1),
  visibility: visibilitySchema.default("HOUSEHOLD"),
  mediaStorageKey: z.string().nullable().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateMemoryInput = z.infer<typeof createMemoryInputSchema>;

export const updateMemoryInputSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
  visibility: visibilitySchema.optional(),
});
export type UpdateMemoryInput = z.infer<typeof updateMemoryInputSchema>;

export const mediaUploadUrlInputSchema = z.object({
  contentType: z.string().min(1),
  byteSize: z.number().int().positive().max(20_000_000),
});
export type MediaUploadUrlInput = z.infer<typeof mediaUploadUrlInputSchema>;

export const mediaUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  storageKey: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
});
export type MediaUploadUrlResponse = z.infer<typeof mediaUploadUrlResponseSchema>;
