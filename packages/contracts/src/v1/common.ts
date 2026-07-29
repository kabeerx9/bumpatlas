import { z } from "zod";

export const cursorPageSchema = z.object({
  nextCursor: z.string().nullable(),
});

export const visibilitySchema = z.enum(["HOUSEHOLD", "PRIVATE"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const stageModeSchema = z.enum(["postpartum", "pregnancy", "unknown"]);
export type StageMode = z.infer<typeof stageModeSchema>;

export const notificationPrefKeySchema = z.enum([
  "dailyPrompt",
  "wellnessReminder",
  "partnerActivity",
  "weeklyRecap",
  "communityReply",
  "subscription",
]);
export type NotificationPrefKey = z.infer<typeof notificationPrefKeySchema>;
