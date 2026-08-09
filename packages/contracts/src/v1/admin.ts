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

/**
 * Slice 1 carries totals and active users only. The timeseries fields from the
 * spec (`signupsByDay`, `invites`, `engagementByDay`) are added in slice 2 as
 * new top-level keys, which is additive for every existing consumer.
 */
export const adminMetricsResponseSchema = z.object({
  totals: adminMetricsTotalsSchema,
  activeUsers: adminActiveUsersSchema,
});
export type AdminMetricsResponse = z.infer<typeof adminMetricsResponseSchema>;
