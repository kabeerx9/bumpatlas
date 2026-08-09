import { z } from "zod";

/**
 * Founder-only reporting surface (superadmin dashboard spec, 2026-08-09).
 *
 * Invariant: every field here is an aggregate — counts and dates only. The
 * endpoint behind this schema reads across all households, bypassing family
 * scoping, so the contract must never grow a field carrying row-level user
 * data: no names, no content, no per-user rows.
 */
const countSchema = z.number().int().nonnegative();

export const adminMetricsTotalsSchema = z.object({
  users: countSchema,
  families: countSchema,
  children: countSchema,
  pregnancies: countSchema,
});
export type AdminMetricsTotals = z.infer<typeof adminMetricsTotalsSchema>;

/**
 * Creator-proxy activity: distinct users who created something (memory,
 * challenge completion, community post/comment) in the window. There is no
 * session/event tracking; this deliberately does not pretend to be real DAU.
 */
export const adminActiveUsersSchema = z.object({
  last1d: countSchema,
  last7d: countSchema,
  last30d: countSchema,
});
export type AdminActiveUsers = z.infer<typeof adminActiveUsersSchema>;

/** One day's signup count. `date` is an ISO calendar date (`YYYY-MM-DD`), UTC. */
export const adminSignupsByDayEntrySchema = z.object({
  date: z.string(),
  count: countSchema,
});
export type AdminSignupsByDayEntry = z.infer<typeof adminSignupsByDayEntrySchema>;

/** One day's engagement counts. `date` is an ISO calendar date (`YYYY-MM-DD`), UTC. */
export const adminEngagementByDayEntrySchema = z.object({
  date: z.string(),
  memories: countSchema,
  challengeCompletions: countSchema,
});
export type AdminEngagementByDayEntry = z.infer<typeof adminEngagementByDayEntrySchema>;

/** Invite funnel over the requested range: created vs accepted. */
export const adminInvitesSchema = z.object({
  sent: countSchema,
  redeemed: countSchema,
});
export type AdminInvites = z.infer<typeof adminInvitesSchema>;

/**
 * Slice 2 (superadmin dashboard spec, timeseries reports): signup and
 * engagement timeseries, plus the invite funnel, all scoped to `range`. Added
 * as new top-level keys, which is additive for every existing consumer.
 */
export const adminMetricsResponseSchema = z.object({
  totals: adminMetricsTotalsSchema,
  activeUsers: adminActiveUsersSchema,
  signupsByDay: z.array(adminSignupsByDayEntrySchema),
  engagementByDay: z.array(adminEngagementByDayEntrySchema),
  invites: adminInvitesSchema,
});
export type AdminMetricsResponse = z.infer<typeof adminMetricsResponseSchema>;

/** `range` query param on `GET /api/v1/admin/metrics`. Defaults to `30d`. */
export const adminMetricsRangeSchema = z.enum(["30d", "90d"]);
export type AdminMetricsRange = z.infer<typeof adminMetricsRangeSchema>;

export const adminMetricsQuerySchema = z.object({
  range: adminMetricsRangeSchema.default("30d"),
});
export type AdminMetricsQuery = z.infer<typeof adminMetricsQuerySchema>;
