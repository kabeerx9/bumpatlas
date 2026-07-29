import { z } from "zod";

export const recapSchema = z.object({
  id: z.string(),
  weekLabel: z.string(),
  title: z.string(),
  highlights: z.array(z.string()),
  eligible: z.boolean(),
  childDisplayName: z.string().nullable(),
});
export type Recap = z.infer<typeof recapSchema>;

export const shareLinkResponseSchema = z.object({
  token: z.string(),
  url: z.string().url(),
  expiresAt: z.string(),
});
export type ShareLinkResponse = z.infer<typeof shareLinkResponseSchema>;
