import { z } from "zod";

export const entitlementsResponseSchema = z.object({
  isPremium: z.boolean(),
  planId: z.string().nullable(),
  renewsAt: z.string().nullable(),
  mediaUploadsLimit: z.number().int().positive(),
  /**
   * Correction 35: `null` means unlimited (Premium). Sent so the UI can show the
   * add-child limit without hardcoding a number that lives in server env.
   */
  maxChildren: z.number().int().positive().nullable(),
  aiDailyLimit: z.number().int().positive(),
  source: z.enum(["free", "revenuecat", "manual"]).optional(),
});
export type EntitlementsResponse = z.infer<typeof entitlementsResponseSchema>;
