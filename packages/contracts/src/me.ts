import { z } from "zod";

export const meResponseSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  /**
   * Whether this caller matches the server's `ADMIN_USER_IDS` allowlist
   * (`requireAuth`'s `AuthContext.isAdmin`). Purely a UI signal — it drives
   * whether the web app shows the Admin nav link and lets `/admin` render an
   * immediate not-found instead of round-tripping to the metrics endpoint.
   * The server-side 404 cloak on `/api/v1/admin/*` (`requireAdmin`) is the
   * real boundary and does not depend on this field.
   */
  isAdmin: z.boolean(),
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
