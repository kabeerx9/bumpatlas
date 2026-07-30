import { z } from "zod";

import { contentItemSchema, wellnessActionSchema } from "./content";

export const todayLoopKeySchema = z.enum(["capture", "care", "learn", "connect"]);
export type TodayLoopKey = z.infer<typeof todayLoopKeySchema>;

/**
 * Correction 18: the four Today cards are chosen server-side and returned here.
 * Without these payloads the live screens fall back to mock product data, which
 * is how unreviewed content reaches users.
 *
 * Every card is nullable because a card can legitimately have nothing to show:
 * community disabled, no content seeded for the stage, or no partner to invite.
 * Card selection is deterministic per (user, date, stage) — see `DailyPlan` —
 * so the screen does not reshuffle on refetch.
 */
export const todayCaptureCardSchema = z.object({
  promptId: z.string(),
  prompt: z.string(),
});
export type TodayCaptureCard = z.infer<typeof todayCaptureCardSchema>;

/**
 * The full action rather than an ID: the Care screen is always opened from
 * Today, and the route inventory has no wellness-action fetch endpoint. Costs a
 * larger Today payload; saves a round trip and a route that does not exist.
 */
export const todayCareCardSchema = wellnessActionSchema;
export type TodayCareCard = z.infer<typeof todayCareCardSchema>;

export const todayLearnCardSchema = contentItemSchema;
export type TodayLearnCard = z.infer<typeof todayLearnCardSchema>;

/**
 * `mode` distinguishes the two states the released Connect tile renders: a real
 * group prompt, or the invite-your-partner nudge when the user has no group.
 */
export const todayConnectCardSchema = z.object({
  mode: z.enum(["group", "invite"]),
  groupId: z.string().nullable(),
  groupName: z.string().nullable(),
  prompt: z.string(),
  replyCount: z.number().int().nonnegative(),
});
export type TodayConnectCard = z.infer<typeof todayConnectCardSchema>;

export const todayResponseSchema = z.object({
  date: z.string(),
  /** Kept for shipped screens; same text as `cards.capture.prompt`. */
  prompt: z.string(),
  cards: z.object({
    capture: todayCaptureCardSchema,
    care: todayCareCardSchema.nullable(),
    learn: todayLearnCardSchema.nullable(),
    connect: todayConnectCardSchema.nullable(),
  }),
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

/**
 * `challengeId` identifies the card the user completed. `kind` is derived
 * server-side from the day's plan, never trusted from the client, because only
 * STORY and WELLNESS completions count toward weekly progress.
 */
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
