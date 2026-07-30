import { z } from "zod";

/**
 * Correction 31, additive: `childId` says which child the recap describes, so a
 * multi-child household knows what it is reading. Per-child recap *tracks* are
 * explicitly deferred (§18), so this is a single household recap scoped to the
 * caller's active child — not an array.
 */
export const recapSchema = z.object({
  id: z.string(),
  weekLabel: z.string(),
  title: z.string(),
  highlights: z.array(z.string()),
  eligible: z.boolean(),
  childId: z.string().nullable(),
  childDisplayName: z.string().nullable(),
});
export type Recap = z.infer<typeof recapSchema>;

export const shareLinkResponseSchema = z.object({
  token: z.string(),
  url: z.string().url(),
  expiresAt: z.string(),
});
export type ShareLinkResponse = z.infer<typeof shareLinkResponseSchema>;

/**
 * Public share payload for `GET /api/v1/public/recaps/:token` — the only
 * unauthenticated product route.
 *
 * This is a privacy allowlist, not a filtered `recapSchema`. Anyone with the
 * link can read it, so it is built field by field from a serializer that starts
 * empty: no IDs, no member list, no memory bodies, no media keys, no dates of
 * birth. Adding a field here is a privacy decision.
 *
 * The household name is deliberately absent: households are routinely named after the
 * child ("Ava's household"), so including it would leak the child's name through the
 * back door that the `childDisplayName` rule exists to close.
 */
export const publicRecapSchema = z.object({
  weekLabel: z.string(),
  title: z.string(),
  highlights: z.array(z.string()),
  /**
   * Always null in the public payload. Kept in the shape so a client can render one
   * component for both the private and shared views without branching.
   */
  childDisplayName: z.null(),
  expiresAt: z.string(),
});
export type PublicRecap = z.infer<typeof publicRecapSchema>;
