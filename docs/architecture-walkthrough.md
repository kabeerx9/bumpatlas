# BumpAtlas — Architecture Walkthrough

A pnpm + Turborepo monorepo. One Fastify API, one Expo app, one small web app, and a set of
packages that exist to keep them agreeing with each other.

## Monorepo layout

| Path | Owns |
|---|---|
| `apps/native` | Expo (expo-router) app — screens in `app/`, data layer in `lib/api/` |
| `apps/server` | Fastify API — routes, middleware, services, cron jobs, webhooks |
| `apps/web` | Vite + TanStack Router web app (sign-in, invite/recap landing pages) |
| `packages/contracts` | Zod schemas for every request/response + the typed fetch client (`src/http.ts`) |
| `packages/db` | Prisma schema (split per domain under `prisma/schema/`), generated client, seed scripts, demo-household builders |
| `packages/env` | Validated env for each runtime: `src/server.ts`, `src/native.ts`, `src/web.ts` |
| `packages/ui` | Shared web UI components |
| `packages/config` | Base tsconfig |
| `api/index.mjs` | Vercel serverless entry that wraps the Fastify app |

The dependency direction is strict: apps depend on packages; `contracts` depends on nothing
but Zod; `db` is imported only by the server and seeds — the native app never sees Prisma.

## One request, end to end

`GET /api/v1/today`, from tap to Postgres:

1. **Screen → hook.** A tab screen calls `useTodayQuery()` in `apps/native/lib/api/hooks.ts`.
   Every server read goes through React Query with centralized `queryKeys`. A build-time flag
   (`EXPO_PUBLIC_USE_MOCK_DATA`, default true) short-circuits every hook to typed mock
   fixtures — the mocks are annotated with contract types on purpose, so a contract change
   fails to compile at the fixture, not as `{}` inference inside every screen.
2. **Hook → API module → typed client.** `apps/native/lib/api/today.ts` calls
   `apiClient.requestJson("/api/v1/today", todayResponseSchema)`. The client is built once in
   `apps/native/lib/api/client.ts` from `createApiClient` in `packages/contracts/src/http.ts`:
   it fetches a Clerk token per request, sets `Authorization: Bearer`, and — key move —
   **parses the response with the Zod schema** before returning. The return type is
   `z.infer<typeof schema>`, so the compile-time type and the runtime validation are the same
   object (contract-first types). A server drift is a thrown `ApiError("Invalid response
   payload")`, never a silently wrong shape. Structured errors carry a business `code`
   (`QUOTA_EXCEEDED`, `CHILD_LIMIT_REACHED`) that clients branch on instead of message text.
3. **Fastify.** `apps/server/src/create-app.ts` builds the app: helmet, CORS, an in-memory
   rate limiter (coarse only — real quotas live in Postgres transactions so they survive
   replication), the Clerk plugin, Pino with redaction of auth/timezone/svix headers (bodies
   are never logged: a body here is a memory or a child's name), 1 MiB body limit, and
   server-generated request IDs.
4. **Auth middleware.** Routes call `requireAuth` (`apps/server/src/middleware/require-auth.ts`).
   Clerk's plugin has already verified the JWT; the middleware then does **JIT provisioning**:
   `prisma.user.upsert({ where: { clerkId }, create: { clerkId }, update: {} })` — a single
   `INSERT … ON CONFLICT`, because a cold app start fans out ~10 concurrent requests and a
   find-then-create would race (P2002 fallback re-reads). No Clerk API call on the hot path;
   email/name are filled in later by `/api/me` and the Clerk webhook. The returned
   `AuthContext` is deliberately tiny (no role, no entitlement — those are per-family and
   re-read at point of use).
5. **Family scoping.** `requireCurrentFamily` (`middleware/require-family-member.ts`)
   re-resolves `defaultFamilyId` and proves *active membership inside the query* — the
   pointer on the user row is never trusted, and routes that name a family ID prove
   membership against the requested family, not the default.
6. **Service → Prisma → Postgres.** Route handlers are thin; logic lives in
   `apps/server/src/services/*` (e.g. `today.ts`, `stage.ts`, `entitlement.ts`). Invariants
   the code cares about are pushed into Postgres: unique constraints for idempotent
   completions/joins/reactions, the `activeFamilyKey` nullable-unique trick for "one active
   pregnancy per family", conditional-UPDATE counters for AI quotas. The database is a
   hosted **Supabase** Postgres — the same project for local dev and prod, with
   `DATABASE_URL`/`DIRECT_URL` split for pooled vs direct (migration) connections and a
   separate `bumpatlas_test` schema for integration tests (`DATABASE_SCHEMA`).

## Auth, both sides

Clerk end to end. Native holds the session (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, token via
`utils/clerk-auth`); the server verifies with `@clerk/fastify` and never stores credentials.
Three other principals exist: **admin** (Clerk IDs listed in `ADMIN_USER_IDS`; non-admins get
404 not 403 so the surface isn't probeable — `middleware/require-admin.ts`), **cron** (shared
`CRON_SECRET` compared with a hand-rolled timing-safe equality in `requireCronSecret`, since
`===` on secrets leaks length/prefix through timing), and **webhooks** (svix signatures for
Clerk; events deduped in the `WebhookEvent` table).

## Contracts: how app and server stay in sync

`packages/contracts` is the only shared vocabulary. Server routes validate input with the
same schemas the client uses to build requests; the client validates responses with the
schemas the server used to shape them. Types are never written twice — everything is
`z.infer`. Contract enums are lowercase and product-flavored (`"queued"`, `"stage"`); Prisma
enums are SCREAMING_CASE; services own the mapping. Internal stage keys (`P_T2`, `NB_0_3M`)
never cross the contract — the public shape is just `pregnancy | postpartum | unknown`, so
content targeting can be re-tuned without a client release.

## Seeding

Three scripts in `packages/db/seed` (run via `pnpm --filter @bumpatlas/db seed:*`):

- `seed.ts` (**seed:content**) — repeatable editorial content, upserted by slug. It enforces
  the review gate itself: health-adjacent content without `reviewerName`/`reviewedOn` is
  refused publication even if the JSON says `isPublished: true`.
- `demo.ts` (**seed:demo**) — four sign-in-able demo households (Rivera, Okafor, Lindqvist,
  Haruna); `--with-clerk` provisions real Clerk users.
- `attach-user.ts` (**seed:user**) — attaches a demo household to one Clerk ID; additive by
  default, `--replace` matches only known demo family names so a real household survives a
  careless re-run.

All demo writes pass through `seed/guard.ts` (`assertSafeSeedTarget`), which **fails closed**:
it prints the target host and refuses any non-localhost database unless `ALLOW_DEMO_SEED=1` —
inverting the old "block if the URL says prod" check, which a random Supabase ref trivially
passes. There's also a runtime variant: with `DEMO_SEED_NEW_USERS=true` (dev only),
`requireAuth` seeds a demo household for a brand-new user in-line
(`services/demo/seed-new-user.ts`). Concurrency there is the interesting part: ~10 cold-start
requests all see "no family", so a **transaction-scoped Postgres advisory lock**
(`pg_advisory_xact_lock(hashtextextended(userId, 0))`) serializes the claim, and only the
claim runs inside the transaction — the ~120-row population happens after commit, to stay
inside Prisma's **interactive transaction budget** and not hold the lock for the duration.

## Feature flags and env layering

`packages/env` uses `@t3-oss/env-core`: one Zod-validated schema per runtime, so a missing or
malformed variable fails at startup, and booleans/ints are parsed once at the edge. Server
flags (`FEATURE_COMMUNITY`, `FEATURE_AI`, …) combine with per-country overrides
(`COUNTRY_FEATURE_OVERRIDES_JSON`) in `services/feature-flags.ts`; the override is
deliberately asymmetric — a country can only turn a feature **off** — and country comes from
proxy-set headers (`x-vercel-ip-country`), never the client. Free/premium limits are env
values too, so pricing tuning needs no deploy.

## Deployment shape

The server builds to `apps/server/dist` (tsdown) and runs two ways from the same
`buildApp()` factory: `src/main.ts` listens on a port for local dev; `api/index.mjs` wraps it
for Vercel by awaiting `app.ready()` once (memoized promise) and emitting each serverless
invocation into Fastify's underlying Node server. `vercel.json` rewrites `/(.*)` to that one
function (10 s max duration) — a **serverless monolith**, not per-route functions, so cold
starts amortize across the whole API. Cron jobs are plain authenticated HTTP POSTs under
`/api/cron/*` (data-request processing, purges, weekly recaps) — idempotent by design, so the
provider scheduler double-firing is harmless, and recaps also generate on demand, so a missed
run degrades to a slower first read. Media bypasses the function entirely via signed URLs to
S3-compatible object storage (`OBJECT_STORAGE_*`). Supabase is shared by local and prod —
which is exactly why the seed guard exists.

## Where to start reading

`apps/server/src/create-app.ts` → `middleware/require-auth.ts` → one vertical slice
(`routes/v1/memories.ts` + `services/memory.ts` + `contracts/src/v1/memories.ts` +
`apps/native/lib/api/memories.ts`). That slice shows every pattern the rest of the codebase
repeats.
