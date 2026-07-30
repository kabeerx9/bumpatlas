import { z } from "zod";

export const pregnancySchema = z.object({
  id: z.string(),
  dueDate: z.string(),
  gestationalWeek: z.number().int().nullable().optional(),
  convertedAt: z.string().nullable().optional(),
});
export type Pregnancy = z.infer<typeof pregnancySchema>;

export const createPregnancyInputSchema = z.object({
  dueDate: z.string().min(1),
});
export type CreatePregnancyInput = z.infer<typeof createPregnancyInputSchema>;

export const updatePregnancyInputSchema = z.object({
  dueDate: z.string().min(1).optional(),
});
export type UpdatePregnancyInput = z.infer<typeof updatePregnancyInputSchema>;

/**
 * Correction 30: one child contract, extended additively. A second
 * `childSummary` shape would be one more thing to keep in sync.
 *
 * `isActive` is per-caller — it marks the child *this* user is focused on
 * (§6.2.1), not a household-wide flag, so two co-parents can legitimately see
 * different children marked active.
 */
export const childSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  dateOfBirth: z.string(),
  birthOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
  archivedAt: z.string().nullable(),
});
export type Child = z.infer<typeof childSchema>;

/**
 * Correction 33: twins are one pregnancy converting into several children.
 *
 * The union keeps the released convert screen working — it sends
 * `{ childName, birthDate }` (`apps/native/lib/api/profiles.ts`) — while the
 * `babies` branch expresses a multiple birth. Capped at 4; higher-order
 * multiples are rare enough to add manually.
 */
export const convertPregnancyInputSchema = z.union([
  z.object({
    childName: z.string().trim().min(1).max(80),
    birthDate: z.string().min(1),
  }),
  z.object({
    birthDate: z.string().min(1),
    babies: z
      .array(z.object({ displayName: z.string().trim().min(1).max(80) }))
      .min(1)
      .max(4),
  }),
]);
export type ConvertPregnancyInput = z.infer<typeof convertPregnancyInputSchema>;

/**
 * Superset response: the first child's fields stay at the top level so the
 * already-released convert screen still parses, and `children` carries the full
 * set. An array-only response would fail Zod parse on shipped code.
 */
export const convertPregnancyResponseSchema = childSchema.extend({
  children: z.array(childSchema),
});
export type ConvertPregnancyResponse = z.infer<typeof convertPregnancyResponseSchema>;

export const createChildInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().min(1),
});
export type CreateChildInput = z.infer<typeof createChildInputSchema>;

export const updateChildInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  dateOfBirth: z.string().min(1).optional(),
});
export type UpdateChildInput = z.infer<typeof updateChildInputSchema>;

/** Correction 29. Youngest first; archived excluded unless asked for. */
export const listChildrenQuerySchema = z.object({
  includeArchived: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true")
    .optional()
    .default(false),
});
export type ListChildrenQuery = z.infer<typeof listChildrenQuerySchema>;

export const listChildrenResponseSchema = z.array(childSchema);
export type ListChildrenResponse = z.infer<typeof listChildrenResponseSchema>;
