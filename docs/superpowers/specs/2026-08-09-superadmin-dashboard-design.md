# Superadmin Dashboard — Design

**Date:** 2026-08-09
**Status:** Approved by Kabeer (chat, 2026-08-09)
**Home:** `apps/web` at `/admin`, backed by one admin metrics endpoint.

## Purpose

Give the founder a private reports surface: signup growth and product engagement,
readable at a glance, with zero new infrastructure. v1 covers **Growth** and
**Engagement**; community-health and revenue reports are explicitly deferred.

## Decisions

- **Platform:** web (`apps/web`), not native, not a separate app. The web app
  already has Clerk sign-in, the contracts workspace package, and an `_auth`
  layout; big screens suit reports.
- **Freshness:** on-load queries against Supabase. No rollup tables, no cron.
  Revisit only if dashboard loads become slow (years away at current scale).
- **Signup source of truth:** the server `User` table, not the Clerk API. Every
  Clerk signup becomes a row via JIT provisioning, so signup counts need no
  Clerk dependency. Clerk's own dashboard covers auth-level detail.
- **Active users are a proxy:** distinct users who created something (memory,
  challenge completion, community post/comment) in the window. There is no
  session/event tracking, and this design deliberately does not add any.

## Contract (`packages/contracts/src/v1/admin.ts`)

`adminMetricsResponseSchema`:

- `totals`: users, families, children, pregnancies
- `signupsByDay`: `{ date, count }[]` for the requested range
- `invites`: `{ sent, redeemed }`
- `engagementByDay`: `{ date, memories, challengeCompletions }[]`
- `activeUsers`: `{ last1d, last7d, last30d }` (creator-proxy, see above)

Query param: `range` = `30d` (default) | `90d`.

## Server

- `GET /api/v1/admin/metrics?range=…` behind `requireAuth` + the existing
  `requireAdmin` (404-cloaked, same as moderation).
- A metrics service performs the aggregates; day bucketing uses raw SQL
  (`date_trunc`) because Prisma `groupBy` cannot bucket by day. Counts only.
- **Invariant (danger domain):** this endpoint aggregates across all households,
  bypassing family scoping — therefore it must never return row-level user data:
  no names, no content, no per-user rows. Counts and dates only.

## Web

- `/admin` route under the existing `_auth` layout in `apps/web`.
- Data via `createApiClient` from `@bumpatlas/contracts` with the Clerk token.
- A 404 from the metrics call renders the app's normal not-found page, so the
  admin surface is as invisible client-side as it is server-side.
- UI: stat cards for totals and active users; simple charts for the two
  timeseries. No dashboard framework.

## Ops

- `ADMIN_USER_IDS` (currently empty in production) gets Kabeer's Clerk user ID.
  Comma-separated for future admins.

## Testing

- Server integration tests: non-admin receives 404; aggregates verified against
  seeded data; range param respected.
- Web: typecheck + manual verification signed in as admin and as non-admin.

## Out of scope (v1)

- Community-health and revenue/entitlement reports.
- Rollup tables, cron precomputation, event/session tracking, real DAU.
- Any mutation from the dashboard (it is read-only).

## Delivery

Two tracer slices, tickets on GitHub:

1. **Skeleton end-to-end** — contract + endpoint + `/admin` totals cards live,
   `ADMIN_USER_IDS` set in production.
2. **Timeseries reports** — signups/engagement charts, invites, active users.
