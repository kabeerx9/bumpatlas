import { z } from "zod";

export const meResponseSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * Transport-level error envelope the client tolerates. The legacy string form is
 * what `/api/me` and `/api/account` still return; every `/api/v1` route returns
 * the structured form (`v1ErrorResponseSchema`).
 */
export const apiErrorResponseSchema = z.object({
  error: z.union([
    z.string(),
    z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    }),
  ]),
});
