import { z } from "zod";

export const moderationItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  summary: z.string(),
  postPreview: z.string(),
  reporter: z.string(),
  priority: z.enum(["normal", "high"]),
  status: z.string(),
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
