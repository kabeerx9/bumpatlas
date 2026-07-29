import { z } from "zod";

export const entitlementsResponseSchema = z.object({
  isPremium: z.boolean(),
  planId: z.string().nullable(),
  renewsAt: z.string().nullable(),
  mediaUploadsLimit: z.number().int().positive(),
  aiDailyLimit: z.number().int().positive(),
  source: z.enum(["free", "revenuecat", "manual"]).optional(),
});
export type EntitlementsResponse = z.infer<typeof entitlementsResponseSchema>;
