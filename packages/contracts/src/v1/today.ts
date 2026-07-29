import { z } from "zod";

export const todayLoopKeySchema = z.enum(["capture", "care", "learn", "connect"]);
export type TodayLoopKey = z.infer<typeof todayLoopKeySchema>;

export const todayResponseSchema = z.object({
  date: z.string(),
  prompt: z.string(),
  loopCompletion: z.record(todayLoopKeySchema, z.boolean()),
  weekProgress: z.object({
    storyDays: z.number().int().nonnegative(),
    wellnessDays: z.number().int().nonnegative(),
    activeDays: z.number().int().nonnegative(),
    goal: z.number().int().positive(),
  }),
  mediaUploadsUsed: z.number().int().nonnegative(),
  mediaUploadsLimit: z.number().int().positive(),
  aiMessagesUsed: z.number().int().nonnegative(),
  aiDailyLimit: z.number().int().positive(),
  isPremium: z.boolean(),
});
export type TodayResponse = z.infer<typeof todayResponseSchema>;

export const completeChallengeInputSchema = z.object({
  challengeId: z.string().min(1),
  moodId: z.string().optional(),
});
export type CompleteChallengeInput = z.infer<typeof completeChallengeInputSchema>;

export const badgeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  earnedAt: z.string().nullable(),
});
export type Badge = z.infer<typeof badgeSchema>;

export const listBadgesResponseSchema = z.object({
  items: z.array(badgeSchema),
});
export type ListBadgesResponse = z.infer<typeof listBadgesResponseSchema>;
