import { z } from "zod";

export const primaryGoalSchema = z.enum(["MEMORIES", "WELLNESS", "CONNECT", "LEARN"]);
export type PrimaryGoal = z.infer<typeof primaryGoalSchema>;

/**
 * Corrections 19 and 32. These are real `User` columns, not a generic JSON
 * settings dump, so they can be indexed and validated.
 *
 * `activeChildId` is read-only here on purpose: `POST /api/v1/children/:id/activate`
 * is its only writer, which keeps family-ownership and archived-state validation
 * in exactly one code path.
 */
export const preferencesSchema = z.object({
  primaryGoal: primaryGoalSchema.nullable(),
  timeZone: z.string().nullable(),
  activeChildId: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const updatePreferencesInputSchema = z
  .object({
    primaryGoal: primaryGoalSchema.optional(),
    timeZone: z.string().min(1).max(64).optional(),
  })
  .refine(
    (value) => value.primaryGoal !== undefined || value.timeZone !== undefined,
    { message: "At least one field must be provided" },
  );
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

/**
 * Zod strips unknown keys, so a client sending `activeChildId` here would be
 * silently ignored. The route checks the raw body against this list and answers
 * `422 UNSUPPORTED_FIELD` instead, which is a debuggable failure.
 */
export const PREFERENCES_READ_ONLY_FIELDS = [
  "activeChildId",
  "onboardingCompletedAt",
] as const;
