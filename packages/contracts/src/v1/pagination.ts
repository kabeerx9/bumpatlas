import { z } from "zod";

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;

/**
 * Correction 9: one cursor query schema instead of ad-hoc string parsing per
 * route. Query values arrive as strings, so `limit` coerces.
 *
 * The cursor is an opaque base64url token that encodes the previous page's sort
 * tuple. Clients must never construct or interpret it; offset pagination is
 * never used for user timelines because inserts shift the window.
 */
export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGE_LIMIT_MAX)
    .default(PAGE_LIMIT_DEFAULT),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;
