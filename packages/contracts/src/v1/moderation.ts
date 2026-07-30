import { z } from "zod";

import { groupKindSchema } from "./community";

/** Correction 20. `critical` is what a safety-of-life report escalates to. */
export const moderationPrioritySchema = z.enum(["normal", "high", "critical"]);
export type ModerationPriority = z.infer<typeof moderationPrioritySchema>;

export const moderationItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  summary: z.string(),
  postPreview: z.string(),
  reporter: z.string(),
  priority: moderationPrioritySchema,
  status: z.string(),
  /**
   * Correction 25: the founder needs to see whether a report came from a seeded
   * cohort or a member-created group, because the remediation differs — a user
   * group can be archived and its host removed.
   */
  groupId: z.string().nullable(),
  groupKind: groupKindSchema.nullable(),
  createdAt: z.string(),
});
export type ModerationItem = z.infer<typeof moderationItemSchema>;

export const listModerationQueueResponseSchema = z.object({
  items: z.array(moderationItemSchema),
});
export type ListModerationQueueResponse = z.infer<typeof listModerationQueueResponseSchema>;

export const moderationActionInputSchema = z.object({
  action: z.enum(["hide", "review", "escalate"]),
  note: z.string().trim().max(1000).optional(),
});
export type ModerationActionInput = z.infer<typeof moderationActionInputSchema>;
