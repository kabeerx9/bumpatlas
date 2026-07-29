import { z } from "zod";

export const consentTypeSchema = z.enum([
  "terms",
  "privacy",
  "community",
  "age_attestation",
  "week_summary",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const createConsentInputSchema = z.object({
  type: consentTypeSchema,
  version: z.string().min(1),
  acceptedAt: z.string().optional(),
});
export type CreateConsentInput = z.infer<typeof createConsentInputSchema>;

export const consentRecordSchema = z.object({
  id: z.string(),
  type: consentTypeSchema,
  version: z.string(),
  acceptedAt: z.string(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;
