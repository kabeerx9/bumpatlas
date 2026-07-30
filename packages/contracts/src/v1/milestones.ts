import { z } from "zod";

/**
 * Correction 13, scoped to §7.5. Deliberately narrow: definitions plus one
 * four-state observation per (child, definition). The API never computes
 * developmental delay and never compares siblings.
 */
export const milestoneStatusSchema = z.enum([
  "not_observed",
  "emerging",
  "observed",
  "skipped",
]);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const milestoneDefinitionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  /** Non-diagnostic guidance. Never phrased as a pass/fail expectation. */
  guidance: z.string(),
  domain: z.string(),
  stageTags: z.array(z.string()),
  reviewer: z.string().nullable(),
  reviewedAt: z.string().nullable(),
});
export type MilestoneDefinition = z.infer<typeof milestoneDefinitionSchema>;

export const milestoneObservationSchema = z.object({
  definitionId: z.string(),
  childId: z.string(),
  status: milestoneStatusSchema,
  observedAt: z.string().nullable(),
  memoryId: z.string().nullable().optional(),
});
export type MilestoneObservation = z.infer<typeof milestoneObservationSchema>;

/**
 * `childId` is echoed back because the server resolved it (§6.2.1) and the
 * client must never guess which sibling the list describes. It is null only
 * when the family has no children yet, during pregnancy.
 */
export const listMilestonesResponseSchema = z.object({
  childId: z.string().nullable(),
  definitions: z.array(milestoneDefinitionSchema),
  observations: z.array(milestoneObservationSchema),
});
export type ListMilestonesResponse = z.infer<typeof listMilestonesResponseSchema>;

/**
 * `childId` is required, not resolved. An observation silently recorded against
 * the wrong sibling is unrecoverable, so the caller must be explicit.
 */
export const upsertMilestoneObservationInputSchema = z.object({
  childId: z.string().min(1),
  status: milestoneStatusSchema,
  memoryId: z.string().min(1).nullable().optional(),
});
export type UpsertMilestoneObservationInput = z.infer<
  typeof upsertMilestoneObservationInputSchema
>;
