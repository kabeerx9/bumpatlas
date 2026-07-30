import { z } from "zod";

import { cursorPageSchema, visibilitySchema } from "./common";
import { cursorQuerySchema } from "./pagination";

/**
 * A memory targets a child or a pregnancy, never both (§7.2.1). Enforced in the
 * contract so the rule cannot drift between create and update.
 */
const targetsAtMostOne = (value: {
  childId?: string | null;
  pregnancyId?: string | null;
}) => !(value.childId && value.pregnancyId);
const targetsAtMostOneMessage = {
  message: "A memory may reference a child or a pregnancy, not both",
} as const;

export const memorySchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  eventDate: z.string(),
  authorName: z.string(),
  visibility: visibilitySchema,
  /**
   * Correction 26: attribution has to be on the response too. A memory stored
   * without a target can never be attributed later — the information to
   * reconstruct it does not exist anywhere.
   */
  childId: z.string().nullable(),
  pregnancyId: z.string().nullable(),
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

/**
 * Correction 28: absent `childId` means the whole household timeline, so
 * existing users never see memories disappear.
 */
export const listMemoriesQuerySchema = cursorQuerySchema.extend({
  childId: z.string().min(1).optional(),
});
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;

export const createMemoryInputSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
    eventDate: z.string().min(1),
    visibility: visibilitySchema.default("HOUSEHOLD"),
    childId: z.string().min(1).optional(),
    pregnancyId: z.string().min(1).optional(),
    mediaStorageKey: z.string().nullable().optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine(targetsAtMostOne, targetsAtMostOneMessage);
export type CreateMemoryInput = z.infer<typeof createMemoryInputSchema>;

/** Correction 27: a mis-attributed memory must be correctable. */
export const updateMemoryInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().min(1).max(4000).optional(),
    visibility: visibilitySchema.optional(),
    childId: z.string().min(1).nullable().optional(),
    pregnancyId: z.string().min(1).nullable().optional(),
  })
  .refine(targetsAtMostOne, targetsAtMostOneMessage);
export type UpdateMemoryInput = z.infer<typeof updateMemoryInputSchema>;

export const mediaUploadUrlInputSchema = z.object({
  contentType: z.string().min(1),
  byteSize: z.number().int().positive().max(20_000_000),
});
export type MediaUploadUrlInput = z.infer<typeof mediaUploadUrlInputSchema>;

export const mediaUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  storageKey: z.string().min(1),
  /** Correction 8: the client needs to know when to stop retrying an upload. */
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type MediaUploadUrlResponse = z.infer<typeof mediaUploadUrlResponseSchema>;
