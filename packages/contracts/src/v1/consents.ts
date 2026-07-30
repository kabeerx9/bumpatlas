import { z } from "zod";

export const consentTypeSchema = z.enum([
  "terms",
  "privacy",
  "community",
  "age_attestation",
  "week_summary",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

/**
 * Correction 11: no client-supplied `acceptedAt`. A consent record is legal
 * evidence, so the server stamps its own clock. Upserted by
 * (userId, policyKey, version).
 */
export const createConsentInputSchema = z.object({
  type: consentTypeSchema,
  version: z.string().min(1),
});
export type CreateConsentInput = z.infer<typeof createConsentInputSchema>;

export const consentRecordSchema = z.object({
  id: z.string(),
  type: consentTypeSchema,
  version: z.string(),
  acceptedAt: z.string(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;
