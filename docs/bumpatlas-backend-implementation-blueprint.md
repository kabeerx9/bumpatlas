# BumpAtlas Backend Implementation Blueprint

**Status:** Canonical backend build specification  
**Audience:** Grok, Composer, Cursor agents, and reviewers  
**Product source of truth:** `docs/bumpatlas-mvp-product-and-engineering-blueprint.md`  
**Contract source of truth:** `packages/contracts/src/v1/**`  
**Prepared:** 29 July 2026  
**Amendment:** member-created private groups with invite links added as an approved founder amendment (Sections 7.7, 7.8, 9, Phase 8b)

> Build the backend described here in the exact phase order. Do not add unrelated infrastructure or features. If this document and the product blueprint disagree about product scope, the product blueprint wins. If this document and the current native API disagree about an HTTP payload, correct `packages/contracts` first, then update both server and native to use that shared contract.

---

## 0. The goal

Build a backend that:

1. lets the current native frontend turn `EXPO_PUBLIC_USE_MOCK_DATA=false`;
2. keeps one family’s data completely isolated from every other family;
3. survives retries, duplicate taps, temporary network failures, and app restarts;
4. remains simple enough for a small team to understand;
5. can grow without rewriting every feature;
6. does not claim a feature is complete until route tests and authorization tests pass.

This is not a “future perfect” architecture. It is a reliable MVP architecture.

---

## 1. Non-negotiable implementation rules

### 1.1 Keep the architecture simple

Use:

- one Fastify application in `apps/server`;
- one PostgreSQL database through Prisma in `packages/db`;
- Clerk for user authentication;
- one private S3-compatible bucket (Cloudflare R2 recommended) for memory media;
- RevenueCat webhooks for subscription state;
- one LLM provider only when the AI phase begins;
- provider cron calls for weekly recaps, expired invite cleanup, and data requests.

Do **not** add for MVP:

- microservices;
- Redis;
- Kafka or another message broker;
- GraphQL;
- Kubernetes;
- event sourcing;
- a generic repository abstraction over Prisma;
- a separate worker deployment;
- Elasticsearch/vector database before keyword/tag retrieval proves insufficient;
- multiple LLM providers;
- custom authentication;
- a custom billing system.

### 1.2 Reliability without unnecessary infrastructure

Use these tools instead:

- PostgreSQL transactions for multi-row writes;
- unique constraints to prevent duplicates;
- foreign keys to prevent orphaned data;
- idempotency keys for retryable POST requests;
- soft deletion where recovery or audit is required;
- short database queries with indexes;
- retry-safe cron services;
- route-level Zod validation;
- structured errors;
- request IDs in logs;
- bounded body sizes and pagination.

### 1.3 Security and privacy defaults

- Every private route requires a valid Clerk Bearer token.
- Every family query must prove active family membership inside the database query.
- Never trust `familyId`, `userId`, role, quota, author, or entitlement values sent by the client.
- Memories and media are household-private by default.
- Community never accepts image/video fields.
- Never log memory bodies, AI messages, community bodies, child names, dates of birth, invite tokens, signed URLs, or webhook payloads.
- Store invite and recap tokens as hashes, never plaintext.
- All media buckets are private.
- Signed download URLs expire quickly.
- Analytics contain event names and IDs only, never free text.

### 1.4 Definition of “done”

A backend phase is done only when:

- contracts compile;
- Prisma generates;
- a migration exists;
- service tests pass;
- route tests pass;
- happy path passes;
- unauthenticated request returns 401;
- wrong-family request returns 403 or 404 without leaking existence;
- validation failures return 400;
- duplicate/retry behavior is tested where applicable;
- `pnpm check-types` passes;
- `pnpm test` passes.

---

## 2. Existing repository facts

Keep and extend the existing stack:

- Fastify 5 in `apps/server`;
- `@clerk/fastify` for auth;
- Zod contracts in `packages/contracts`;
- Prisma 7 + PostgreSQL adapter in `packages/db`;
- Node test runner + `tsx`;
- existing `/api/me`, `/api/account`, and `/webhooks/clerk`;
- native typed clients in `apps/native/lib/api/**`;
- React Query hooks in `apps/native/lib/api/hooks.ts`.

Do not replace working conventions just to make the code look different.

Current server entry:

```text
apps/server/src/create-app.ts
```

Current database schema:

```text
packages/db/prisma/schema/schema.prisma
```

### 2.1 Verified starting state, October 2026

These facts were confirmed by running the repository, not assumed. Trust them over any guess about the layout, and re-verify with the commands below before writing code.

| Fact | Reality |
|---|---|
| Server boots | Yes. `pnpm --filter server dev` listens on port 3000, `GET /` returns 200, `GET /api/me` returns 401 without auth |
| `pnpm --filter server test` | Passes, 11 tests |
| `pnpm check-types` | Passes across all five packages |
| `pnpm run doctor` | Passes |
| Database | Provisioned on Supabase; `DATABASE_URL` pooled and `DIRECT_URL` direct are both set in `apps/server/.env` |
| Prisma location | `packages/db/prisma/schema/schema.prisma`, **not** `apps/server`. `packages/db` has no `test` or `check-types` script |
| Models existing today | `User` only, with `id`, `clerkId`, `email`, `name`, `imageUrl`, timestamps. Every other model in Section 7 is greenfield |
| Migrations | **None exist.** `packages/db/prisma/migrations` is absent and the repo has only ever used `db:push` |
| Test runner | Node's built-in `node:test` plus `tsx`. **Do not introduce Vitest or Jest** |
| Integration tests | No harness exists. All current tests are unit level with mocked Prisma and Clerk |
| Auth today | `@clerk/fastify` is registered and `getAuth(request)` is called inline per route. No `requireAuth`, no `AuthContext`, no role guard |
| Lint | No lint script anywhere in the monorepo. `check-types` is the only static gate |
| Contracts | `packages/contracts/src/v1/*` exists and is imported by native, but none of the 35 corrections in Section 8 are applied yet |

Verify with:

```bash
pnpm install
pnpm run doctor
pnpm check-types
pnpm --filter server test
pnpm --filter server dev
```

**The first migration is a real task.** Because the project has only used `db:push`, `prisma migrate dev` will want to baseline. Create the initial migration covering the existing `User` model before adding new models, so the migration history starts from a known state. Never test migrations against production first; run them against a scratch database.

**Adding an environment variable takes two edits**, and missing either causes a confusing runtime failure: add it to the Zod schema in `packages/env/src/server.ts` *and* to `apps/server/.env.example`. Every variable in Section 4 beyond the seven already present needs both.

**`CLERK_WEBHOOK_SIGNING_SECRET` is currently the placeholder `whsec_replace_me`.** Clerk webhook verification will fail until a real value is supplied from the Clerk dashboard. This blocks user-sync testing but nothing else.

**Build the integration test harness before the first phase test**, because none exists and every phase in Section 13 demands database-backed tests. The minimum is a scratch test database, a helper that applies the schema, a way to truncate or roll back between tests, a `buildTestApp()` that wires real Prisma, and an auth stub that injects a `userId` the way `routes/account.test.ts` already mocks Clerk. Treat this as the first deliverable of Phase 0, not an afterthought.

### 2.2 Dependencies to add only when needed

Foundation:

```bash
pnpm --filter server add @fastify/helmet @fastify/rate-limit @js-temporal/polyfill
```

Media:

```bash
pnpm --filter server add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

AI: add only the selected provider’s official SDK when Phase 7 starts.

Use the package manager so it resolves current compatible versions; do not copy guessed versions into `package.json`.

---

## 3. Target folder structure

Create files only as each phase needs them.

```text
apps/server/src/
  create-app.ts
  main.ts
  plugins/
    error-handler.ts
    request-context.ts
  middleware/
    require-auth.ts
    require-family-member.ts
    require-role.ts
    require-admin.ts
  routes/
    me.ts
    account.ts
    health.ts
    v1/
      consents.ts
      preferences.ts
      data-requests.ts
      families.ts
      profiles.ts
      memories.ts
      media.ts
      today.ts
      milestones.ts
      content.ts
      recaps.ts
      billing.ts
      notifications.ts
      ai.ts
      community.ts
      moderation.ts
    public/
      recaps.ts
    cron/
      weekly-recaps.ts
      purge-expired.ts
      process-data-requests.ts
    webhooks/
      clerk.ts
      revenuecat.ts
  services/
    user.ts
    family.ts
    stage.ts
    preference.ts
    consent.ts
    memory.ts
    media.ts
    today.ts
    badge.ts
    milestone.ts
    content.ts
    recap.ts
    entitlement.ts
    notification.ts
    data-request.ts
    audit.ts
    product-event.ts
    idempotency.ts
    ai/
      chat.ts
      safety.ts
      retrieve.ts
      quota.ts
      prompts.ts
    community/
      groups.ts
      group-invites.ts
      host-actions.ts
      posts.ts
      moderation.ts
      safety.ts
  jobs/
    generate-weekly-recaps.ts
    purge-expired-records.ts
    process-data-requests.ts
    seed-community-prompts.ts
  test/
    helpers/
      build-test-app.ts
      auth.ts
      factories.ts

packages/db/
  prisma/schema/schema.prisma
  prisma/migrations/**
  seed/
    content/**
    groups/**
    seed.ts
  src/index.ts

packages/contracts/src/v1/
  common.ts
  errors.ts
  pagination.ts
  families.ts
  profiles.ts
  preferences.ts
  memories.ts
  today.ts
  milestones.ts
  content.ts
  recaps.ts
  billing.ts
  notifications.ts
  ai.ts
  community.ts
  moderation.ts
  consents.ts
  data-requests.ts
```

Do not create one file per endpoint if one domain route file stays readable.

---

## 4. Environment variables

Extend `packages/env/src/server.ts` and `apps/server/.env.example`.

### Required from Phase 1

```env
DATABASE_URL=
DIRECT_URL=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
CORS_ORIGIN=
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:3001
ADMIN_USER_IDS=
CRON_SECRET=
COUNTRY_FEATURE_OVERRIDES_JSON={}
MODERATION_COVERAGE_START_UTC=06:00
MODERATION_COVERAGE_END_UTC=23:00
COMMUNITY_24H_COVERAGE=false
```

### Required from media phase

```env
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY_ID=
OBJECT_STORAGE_SECRET_ACCESS_KEY=
OBJECT_STORAGE_PUBLIC_HOST=
```

`OBJECT_STORAGE_PUBLIC_HOST` is optional. Do not make the bucket public.

### Required from billing phase

```env
REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_PROJECT_ID=
```

### Required from AI phase

```env
AI_PROVIDER_API_KEY=
AI_MODEL=
AI_ENABLED=false
```

### Feature flags

```env
FEATURE_COMMUNITY=true
FEATURE_AI=false
FEATURE_PREGNANCY_EXERCISE=true
COMMUNITY_POSTING_ENABLED=true
FEATURE_USER_GROUPS=false
```

`FEATURE_USER_GROUPS` controls member-created private groups (Section 7.8 and Phase 8b). It stays `false` until moderation coverage for them is real.

### Numeric limits

Put these in env so they can change without a code deploy. The values below are the launch defaults.

```env
FREE_MEDIA_UPLOADS_PER_MONTH=100
PREMIUM_MEDIA_UPLOADS_PER_MONTH=1000
FREE_CHILDREN_LIMIT=2
FREE_FAMILY_SEATS=2
PREMIUM_FAMILY_SEATS=6
FREE_AI_MESSAGES_PER_DAY=5
PREMIUM_AI_MESSAGES_PER_DAY=30
AI_MESSAGES_PER_HOUR=20
COMMUNITY_POSTS_PER_DAY=10
COMMUNITY_COMMENTS_PER_DAY=50
COMMUNITY_NEW_ACCOUNT_LINK_DAYS=14
USER_GROUPS_CREATED_LIMIT_FREE=1
USER_GROUPS_CREATED_LIMIT_PREMIUM=5
USER_GROUP_MEMBER_LIMIT=50
USER_GROUP_JOINED_LIMIT=10
```

Parse comma-separated `ADMIN_USER_IDS` into a trimmed set. Fail startup when a required production secret is absent. Test environment may use explicit dummy values.

---

## 5. API-wide conventions

### 5.1 Base path and authentication

- Product routes: `/api/v1`.
- Existing identity routes remain `/api/me` and `/api/account`.
- Clerk JWT comes from `Authorization: Bearer <token>`.
- Public recap routes are the only unauthenticated product routes.
- Webhook routes authenticate with provider signatures, not Clerk.
- Cron routes authenticate with `Authorization: Bearer <CRON_SECRET>`.

### 5.2 Success responses

Return exactly the shared Zod response contract. Do not wrap success responses in `{ data: ... }` unless all contracts and native clients are intentionally migrated together.

Use:

- `200` for reads and updates;
- `201` for newly created resources;
- `204` for successful deletes or actions without response content.

### 5.3 Error response

Standardize all new v1 errors:

```json
{
  "error": {
    "code": "MEMORY_NOT_FOUND",
    "message": "Memory not found",
    "details": null,
    "requestId": "req-..."
  }
}
```

Before implementing routes, update the shared error contract to support:

```ts
{
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  }
}
```

The client currently tolerates a legacy string error. Existing `/api/me` and `/api/account` may keep it temporarily, but all v1 routes must use the structured form.

Recommended status mapping:

- `400 INVALID_INPUT`
- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`
- `410 INVITE_EXPIRED`
- `413 PAYLOAD_TOO_LARGE`
- `422 BUSINESS_RULE_VIOLATION`
- `429 RATE_LIMITED` or `QUOTA_EXCEEDED`
- `500 INTERNAL_ERROR`
- `502 PROVIDER_ERROR`
- `503 FEATURE_UNAVAILABLE`

Never send Prisma errors or provider stack traces to clients.

### 5.4 Validation

For every route:

1. parse params;
2. parse query;
3. parse body;
4. run authorization;
5. call the service;
6. parse the service output with the response schema;
7. send it.

Use `safeParse` for request data. Convert the first useful validation issue into `INVALID_INPUT`. Keep full validation details out of production logs when they may contain free text.

### 5.5 Dates and time zones

- Store timestamps in UTC.
- Return timestamps as ISO 8601 strings.
- Store calendar-only values as PostgreSQL `date` where time is irrelevant.
- `eventDate`, due date, and birth date must be normalized server-side.
- Treat a supplied date-only string as a calendar date, not midnight in the server timezone.
- Reject impossible or unreasonably future dates.
- Add nullable IANA `timeZone` to `User`.
- Native sends `X-Time-Zone` (for example `Asia/Kolkata`) on authenticated requests. Validate it with `Intl.DateTimeFormat`; persist valid changes without blocking the request.
- Calculate “today,” gestational week, age bucket, quiet hours, and weekly boundaries in the user’s timezone.
- If timezone is absent, use UTC temporarily and record a non-sensitive warning metric. Pregnancy acceptance is not complete until a real timezone has been recorded.

### 5.6 Pagination

Use cursor pagination:

```text
?cursor=<opaque-id>&limit=20
```

- default limit: 20;
- maximum limit: 50;
- response: `{ items, nextCursor }`;
- cursor should encode the final item’s sort tuple;
- memories sort by `(eventDate DESC, id DESC)`;
- posts sort by `(createdAt DESC, id DESC)`;
- never use offset pagination for user timelines.

For MVP, a base64url JSON cursor is sufficient. It is opaque to the client.

### 5.7 Idempotency

Add an `IdempotencyRecord` table:

```text
id
userId
routeKey
idempotencyKey
requestHash
statusCode
responseJson
createdAt
expiresAt
unique(userId, routeKey, idempotencyKey)
```

Use it for:

- memory creation;
- invite acceptance;
- challenge completion;
- data request creation;
- any webhook event using provider event ID.

Behavior:

1. same key + same request returns original response;
2. same key + different request returns `409 IDEMPOTENCY_CONFLICT`;
3. transaction creates business row and idempotency row together;
4. retain records for at least 24 hours; webhooks longer.

Accept the key from `Idempotency-Key`. For memory creation, temporarily also accept the contract body’s `idempotencyKey`, but prefer the header and remove duplication in a later coordinated contract cleanup.

### 5.8 Rate limits and quotas

Do not add Redis for MVP.

- Run one server instance initially.
- Use `@fastify/rate-limit` in memory for the coarse 120 requests/minute/user protection.
- Enforce important business quotas in PostgreSQL transactions:
  - AI: 5/day free, 30/day premium per family;
  - AI hard cap: 20/hour per user;
  - community: 10 posts/day/user;
  - comments: 50/day/user;
  - family seats: 2 free adults, 6 premium;
  - media quota from entitlement cache.

If the server later runs multiple instances, move only coarse request limiting to the hosting gateway or Redis. Database-backed business quotas already remain correct.

### 5.9 Logging

Log:

- request ID;
- route;
- status;
- duration;
- authenticated internal user ID when available;
- error code;
- provider request ID where safe.

Redact:

- authorization headers;
- cookies;
- webhook signatures;
- invite/share tokens;
- request/response bodies on private routes;
- signed URLs;
- emails except in controlled account troubleshooting;
- all child/pregnancy/memory/community/AI text.

### 5.10 Transactions and concurrency

These rules prevent the most common production failures in this kind of backend.

**Never call an external service inside a database transaction.** No object storage, LLM, Clerk, RevenueCat, or push provider calls between `prisma.$transaction(...)` open and close. A slow provider inside a transaction exhausts the connection pool and takes the whole API down. Correct order: read/validate, call the provider outside the transaction, then open a short transaction to persist.

**Keep transactions short.** A transaction should contain only database statements that must succeed or fail together.

**Row locking.** Prisma has no lock helper, so where the specification says “lock,” use one of these two patterns inside an interactive transaction:

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "FamilyInvite"
    WHERE "tokenHash" = ${tokenHash}
    FOR UPDATE
  `;
  // ...validate and update inside the same transaction
});
```

Or prefer a **unique constraint** and treat the unique-violation error as the conflict signal. For `FamilyMember`, `ChallengeCompletion`, `BadgeAward`, `CommunityReaction`, `UserBlock`, `DailyPlan`, and `IdempotencyRecord`, the constraint is the correct mechanism and no explicit lock is needed. Use `FOR UPDATE` only for invite acceptance, pregnancy conversion, quota counters, and data-request claiming.

**Quota counters.** Increment with a conditional atomic statement rather than read-then-write:

```sql
UPDATE "AiUsageDaily"
SET count = count + 1
WHERE "familyId" = $1 AND day = $2 AND count < $3
```

Zero updated rows means the quota is exhausted; return `429`.

**Reserve then settle for provider calls.** For AI chat: reserve one unit of quota, call the provider outside the transaction, then commit the message. If the provider fails, release the reservation so the user is not charged for a failed request. Never increment usage after a successful generation only, because a crash between the two steps would give away free requests.

**Idempotency ordering.** Write the business row and the `IdempotencyRecord` in the same transaction. Never write the idempotency record first.

### 5.11 Quota and rate-limit responses

When a limit blocks a request, return `429` with enough information for the UI to explain the situation without guessing:

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "You have used your daily assistant messages.",
    "details": {
      "limitKey": "ai_daily",
      "used": 5,
      "limit": 5,
      "resetsAt": "2026-07-30T00:00:00.000Z",
      "upgradeAvailable": true
    },
    "requestId": "req-..."
  }
}
```

`upgradeAvailable` tells the client whether a paywall is the correct next screen. Never expose another user's usage.

---

## 6. Authentication, user provisioning, and request context

### 6.1 `requireAuth`

Implement one helper that:

1. calls Clerk `getAuth(request)`;
2. returns 401 when `userId` is absent;
3. loads or creates the local `User` by Clerk ID;
4. attaches this safe context:

```ts
type AuthContext = {
  clerkUserId: string;
  userId: string;
  defaultFamilyId: string | null;
  isAdmin: boolean;
};
```

Do not fetch Clerk on every route after local provisioning. `/api/me` may repair missing local data by fetching Clerk.

### 6.2 Current family resolution

Add `defaultFamilyId` to `User`.

`resolveCurrentFamily(userId)`:

1. use `User.defaultFamilyId` when it has an active membership;
2. otherwise choose the oldest active membership;
3. update `defaultFamilyId` to that membership;
4. return `null` if no active membership exists.

This supports multiple families later while preserving the current singular UI.

### 6.2.1 Active child resolution

Add `activeChildId` to `User` and one helper next to the family resolver, because several routes need the same answer and must not each invent their own.

`resolveActiveChild(userId, familyId)`:

1. use `User.activeChildId` when it points to a non-archived child in this family;
2. otherwise choose the youngest non-archived child by date of birth, tie-broken by `birthOrder` then `id` so twins resolve deterministically;
3. persist that choice to `activeChildId`;
4. return `null` when the family has no children, which is normal during pregnancy.

Every route that needs "the child" calls this helper. See Section 7.2.1 for the rules it implements.

This helper answers "which child," not "which stage." Stage and all Today content selection go through `computeStage()`, which checks for an active pregnancy first and only then consults the active child. Never branch on `activeChildId` to decide stage.

Re-resolve `activeChildId` whenever the household context changes: when the referenced child is archived, when the user leaves or is removed from the family, or when the current family changes. Treat it exactly like `defaultFamilyId` — a stale pointer to another family's child is a cross-family data leak.

### 6.3 Family membership authorization

All family-scoped reads must include membership proof in the query or immediately before it.

Safe pattern:

```ts
const membership = await prisma.familyMember.findFirst({
  where: {
    familyId,
    userId,
    status: "ACTIVE",
  },
});
```

Then apply role rules. Never fetch a private object first and check membership afterward if the error would reveal its existence.

### 6.4 Role permissions

- `OWNER`: all family operations and billing.
- `PARENT`: invite/remove non-owner members, memories, challenges, AI, export.
- `CONTRIBUTOR`: create memories, edit/delete own memories, challenges, AI.
- `VIEWER`: view family content only and participate personally in community.

Owner cannot be removed. A family must always have exactly one owner in MVP. Ownership transfer is post-MVP; owner account deletion must require full family deletion or return a clear blocking error.

---

## 7. Database design

### 7.0 Which schema is authoritative

Product blueprint Section 6.1 contains real Prisma code. **Start from that code**, then apply the deltas in this section. Where the two documents differ, this section wins, because it reflects the shipped API contracts.

Use explicit Prisma enums instead of free-form strings wherever values are known, even where product Section 6.1 shows a `String`.

Deltas from product Section 6.1 that an implementer must not miss:

| Change | Detail |
|---|---|
| `User` additions | `defaultFamilyId`, `activeChildId`, `timeZone`, `primaryGoal`, `onboardingCompletedAt` |
| `ChildProfile` additions | `birthOrder`, `archivedAt` (Section 7.2.1) |
| `MemoryEntry` addition | explicit `title` column (the API returns a title that create input does not accept) |
| `MediaAsset` addition | `status` enum `PENDING` / `ATTACHED` / `DELETED` |
| AI usage split | replace `AiUsageCounter` with `AiUsageDaily` (per family/day) and `AiUsageHourly` (per user/hour) |
| Community groups | replace `StageGroup` / `StageGroupMember` with `CommunityGroup` / `CommunityGroupMember` (Section 7.8) |
| New models | `ContentBookmark`, `MilestoneObservation` statuses as enum, `IdempotencyRecord`, `WebhookEvent`, `ProductEvent`, `CommunityGroupInvite` |
| Free-form strings to enums | memory visibility, pregnancy status, challenge kind, report status/priority, data request type/status, member role/status |
| Moderation priority | add `CRITICAL` to the enum |

Every model in this section needs a migration, not `db:push`.

### 7.1 Identity and family

#### `User`

Required:

- existing identity fields;
- `defaultFamilyId?`;
- `activeChildId?` for the child this user is currently focused on (Section 7.2.1). It selects *which child* among siblings, but it does not override an active pregnancy: all stage and content selection goes through `computeStage()`, which puts pregnancy first;
- `timeZone?` as a validated IANA identifier;
- `primaryGoal?` enum: `MEMORIES`, `WELLNESS`, `CONNECT`, `LEARN`;
- `onboardingCompletedAt?`;
- `isAdultAttested`;
- `adultAttestedAt?`;
- `createdAt`, `updatedAt`.

#### `Family`

- `id`;
- required `name` with server fallback such as `"My household"`;
- `ownerUserId`;
- timestamps;
- relations to members, invites, profiles, memories, recaps, subscription.

#### `FamilyMember`

- unique `(familyId, userId)`;
- indexed `userId`;
- role enum;
- status enum;
- timestamps;
- optional `removedAt`.

#### `FamilyInvite`

- `tokenHash` unique;
- role cannot be `OWNER`;
- optional normalized lowercase email;
- `expiresAt` = creation + 7 days;
- `acceptedAt?`;
- `acceptedByUserId?`;
- creator;
- timestamps.

### 7.2 Profiles

#### `PregnancyProfile`

- family;
- due date;
- status enum: `ACTIVE`, `CONVERTED`, `ARCHIVED`;
- `primaryConvertedChildId` pointing at the first child created by conversion. It is a convenience pointer only; a twin conversion creates several children, so never treat it as the complete set. Query `ChildProfile` by family for that;
- timestamps;
- only one active pregnancy per family for MVP.

#### `ChildProfile`

- family;
- display name, validated as `trim().min(1).max(80)` to match `createChildInputSchema` in `packages/contracts`;
- date of birth, rejected when in the future or absurdly old (before 1900);
- `birthOrder` integer for stable sibling ordering;
- premature/adjusted due date fields may remain nullable;
- `archivedAt?` so a profile created by mistake can be hidden without destroying attached memories;
- timestamps;
- index `(familyId, archivedAt, dateOfBirth)`.

Keep pregnancy and child as separate models. Do not create a generic JSON profile.

### 7.2.1 Multiple children (required, not optional)

A household can have several children: twins from one birth, or siblings at different stages. The database already allows this, and Premium sells "unlimited children," but the shipped API contracts are single-child. That mismatch must be closed in Phase 1, not after launch.

**Why this cannot wait.** `createMemoryInputSchema` has no `childId`. If the backend ships without it, every memory captured is stored with no idea which child it is about, and the information needed to fix it does not exist anywhere. Retrofitting would mean guessing. Media and memories are the data users would be most upset to lose the meaning of, so child attribution is a launch requirement.

Rules:

- a family has zero or more `ChildProfile` rows and at most one `ACTIVE` `PregnancyProfile`;
- add `activeChildId?` to `User`, resolved exactly like `defaultFamilyId`: use it if it points to a non-archived child in the current family, otherwise fall back to the **youngest non-archived child** (the most stage-relevant one), then persist that choice;
- stage computation uses the active child, never an arbitrary row; with an active pregnancy **and** existing children, pregnancy wins for the Today stage, because the pregnancy is the time-sensitive context;
- memory target resolution, in strict order: use the explicit `childId` or `pregnancyId` from the request; otherwise if the family has an `ACTIVE` pregnancy, attach to that pregnancy; otherwise attach to the caller's active child; otherwise leave both null as a household-level memory. The pregnancy branch matters because during pregnancy `resolveActiveChild` returns `null`, and without it every pregnancy journal entry would be stored untargeted;
- a memory may reference a child **or** a pregnancy, never both;
- `childId` must be validated to belong to the caller's family before use, like every other family-scoped ID;
- memories list accepts an optional `childId` filter; with no filter it returns the whole household timeline so nothing disappears for existing users;
- milestone observations are already unique per `(childId, definitionId)`, so each child tracks milestones independently and no comparison between siblings is ever computed or returned;
- archiving a child hides them from pickers and stage selection but keeps their memories readable in the household timeline;
- deleting a child profile outright is not supported in MVP; archive instead.

**Twins.** A twin pregnancy is one `PregnancyProfile` that converts into two `ChildProfile` rows. The current convert contract accepts a single `childName` and `birthDate`, so it cannot express this. Extend it to accept an array of babies sharing one birth date, and keep single-baby input working. Memories captured during the pregnancy stay attached to the pregnancy record and remain visible to the whole household rather than being arbitrarily assigned to one twin.

**Entitlement.** Free allows up to `FREE_CHILDREN_LIMIT` children; Premium is unlimited. Set the free limit to at least 2 so that twins and a second sibling never hit a paywall at the moment a baby is born. Enforce the limit on child creation only, never on reading existing children, and never block a pregnancy conversion because of it — a family that reaches the limit through birth keeps their data and sees the upgrade prompt afterward.

### 7.3 Memories and media

#### `MemoryEntry`

- family;
- optional child or pregnancy target;
- author;
- `title` stored explicitly;
- body;
- event date;
- visibility enum;
- optional prompt/milestone reference;
- timestamps;
- `deletedAt?`;
- index `(familyId, eventDate, id)`.

Title rule on create: first non-empty body line, truncated to 120 characters. The user can edit it later.

#### `MediaAsset`

- family;
- uploader;
- optional memory;
- storage key unique;
- content type;
- byte size;
- dimensions;
- status enum: `PENDING`, `ATTACHED`, `DELETED`;
- timestamps;
- deleted timestamp.

Create the pending media row when issuing an upload URL. A memory may attach only a pending asset belonging to the same family and uploader. This prevents clients from attaching another family’s object key.

### 7.4 Today, challenges, badges

#### `DailyPlan`

One per `(userId, planDate)`.

Store selected IDs for:

- memory prompt;
- wellness action;
- learn item;
- community prompt;
- stage key used during generation.

Generation must be deterministic for the same user/date/stage.

#### `ChallengeCompletion`

Unique `(userId, planDate, kind)`.

Kinds:

- `STORY`;
- `WELLNESS`;
- `LEARN`;
- `CONNECT`.

Only story and wellness affect weekly story/wellness counts. Active day is the union of story and wellness dates.

#### `BadgeAward`

Unique `(userId, badgeKey)`. Awards are cosmetic and idempotent.

### 7.5 Milestones

Milestones are required by the Journey product. Keep the backend narrow:

- `MilestoneDefinition`: stable slug, title, non-diagnostic guidance, stage tags, domain, reviewer, reviewed date, publication state.
- `MilestoneObservation`: family, child, definition, status, observed timestamp, optional linked memory.
- statuses: `NOT_OBSERVED`, `EMERGING`, `OBSERVED`, `SKIPPED`;
- unique `(childId, definitionId)`;
- seed 30 reviewed definitions;
- never calculate developmental delay or compare children.

### 7.6 Content

#### `ContentItem`

Store:

- slug;
- type enum;
- title;
- summary;
- body markdown;
- reading minutes;
- stage tags;
- source;
- reviewer;
- reviewed date;
- publication state;
- withdrawal timestamp;
- timestamps.

Exercise/pregnancy content cannot publish without reviewer and reviewed date.

#### `ContentBookmark`

Unique `(userId, contentItemId)`.

Bookmark endpoint must behave as a toggle for the current native UI or contracts must be changed to explicit `PUT`/`DELETE`. Pick one behavior and test it; do not silently create duplicate rows.

### 7.7 Community core

Use `CommunityGroup`, `CommunityGroupMember`, `CommunityGroupInvite`, `CommunityPost`, `CommunityComment`, `CommunityReaction`, `UserBlock`, `ModerationReport`, and `ModerationAction`.

There is exactly **one** group model. Seeded stage cohorts and member-created groups are the same table with a different `kind`, so posts, comments, reactions, reports, blocks, moderation, and feed filtering have a single code path. Do not build a parallel set of models for user groups.

#### `CommunityGroup`

- `id`;
- `slug` unique (generated server-side; for user groups use a random slug, never the user's title);
- `title`;
- `description?`;
- `kind` enum: `STAGE` (seeded cohort) or `USER` (member-created);
- `visibility` enum: `STAGE_DISCOVERABLE` (listed to matching stage) or `LINK_ONLY` (never listed, joinable only with an invite);
- `stageKey?` (only for `STAGE`);
- `createdByUserId?` (required for `USER`);
- `postingEnabled` boolean default `true`;
- `memberLimit` integer;
- `isActive` boolean;
- `archivedAt?`;
- timestamps.

**All `USER` groups are `LINK_ONLY`.** There is no browse, search, or public directory for member-created groups. This keeps the product inside the "no public feed" non-goal and keeps the moderation surface bounded.

#### `CommunityGroupMember`

- `groupId`, `userId`;
- `role` enum: `HOST`, `MEMBER`;
- `status` enum: `ACTIVE`, `LEFT`, `REMOVED`, `BANNED`;
- `joinedAt`, `removedAt?`;
- unique `(groupId, userId)`;
- index `(userId, status)`.

Seeded `STAGE` groups have no `HOST`; a designated system account authors the daily prompt. `USER` groups always have exactly one `HOST`.

#### `CommunityGroupInvite`

Mirror the family invite design so there is one token pattern in the codebase.

- `id`;
- `groupId`;
- `createdByUserId`;
- `tokenHash` unique (SHA-256 of a 32-byte random token; plaintext returned once and never stored);
- `maxUses` integer, default 25;
- `useCount` integer, default 0;
- `expiresAt` (creation + 14 days, capped at 30);
- `revokedAt?`;
- timestamps;
- index `(groupId, revokedAt)`.

Unlike family invites, a group invite link is **reusable up to `maxUses`** so a host can share one link with a group chat. It is still hashed, expiring, revocable, and rate-limited.

#### Other constraints

- no media columns on posts, comments, groups, or invites;
- soft delete and hide fields on posts and comments;
- unique reaction `(postId, userId, emoji)`;
- unique block `(blockerUserId, blockedUserId)`;
- indexes for feed reads `(groupId, deletedAt, hiddenAt, createdAt)` and moderation `(status, priority, createdAt)`;
- account creation timestamp used for the new-account link restriction.

### 7.8 Member-created groups

This extends the product blueprint. Treat it as an approved founder amendment with the following guardrails, which exist because user-generated spaces are the highest legal and safety risk in the product.

Rules:

- gated by `FEATURE_USER_GROUPS`; when off, the create and invite routes return `503 FEATURE_UNAVAILABLE`;
- creator must be an adult-attested account with accepted current community rules;
- creator becomes `HOST`;
- link-only, never listed or searchable;
- text only, exactly like stage groups, including the child-photo ban;
- `USER_GROUP_MEMBER_LIMIT` members per group;
- `USER_GROUPS_CREATED_LIMIT_FREE` / `USER_GROUPS_CREATED_LIMIT_PREMIUM` active groups created per user;
- `USER_GROUP_JOINED_LIMIT` group memberships per user, to cap moderation exposure and feed cost;
- host powers apply **only inside their own group**: rename/describe, revoke invites, remove or ban a member, hide a post in that group, disable posting, archive the group;
- host powers never include reading reports, seeing reporter identity, unhiding content an admin hid, or moderating other groups;
- every report from a user group still enters the single founder moderation queue with group context, and admin decisions override the host;
- deleting a group is an archive, not a hard delete: `isActive=false`, `archivedAt` set, posting disabled, feed hidden from members, content retained for the moderation and legal retention window;
- if the host's account is deleted, the group is archived automatically rather than left unowned.

### 7.9 AI

Use:

- `AiConversation`;
- `AiMessage`;
- `AiUsageDaily`;
- `AiUsageHourly`;
- optional `AiMessageReport`.

Store citations and safety category. Default message retention is 30 days. Do not store vendor prompts containing secrets. Never retrieve community or another family’s data for AI.

### 7.10 Recaps, billing, notifications, operations

Required:

- `WeeklyRecap`;
- `RecapShareToken` or hashed token fields on recap;
- `Subscription`;
- `EntitlementCache`;
- `PushDevice`;
- `NotificationPreference`;
- `ConsentRecord`;
- `AuditEvent`;
- `DataRequest`;
- `IdempotencyRecord`;
- `WebhookEvent`.
- `ProductEvent`.

`WebhookEvent.providerEventId` must be unique to make Clerk and RevenueCat processing idempotent.

`ProductEvent` stores only an event enum, actor/family IDs, safe numeric/boolean metadata, and timestamp. It never stores user-authored text.

### 7.11 Entitlement defaults

`EntitlementCache` is the single place the API reads limits from. Seed it on family creation and update it only from the RevenueCat webhook or an explicit admin action.

| Field | Free | Premium |
|---|---|---|
| `isPremium` | false | true |
| `maxMembers` | `FREE_FAMILY_SEATS` (2) | `PREMIUM_FAMILY_SEATS` (6) |
| `maxChildren` | `FREE_CHILDREN_LIMIT` (2) | unlimited (`null`) |
| `mediaUploadsPerMonth` | `FREE_MEDIA_UPLOADS_PER_MONTH` (100) | `PREMIUM_MEDIA_UPLOADS_PER_MONTH` (1000) |
| `aiDailyLimit` | `FREE_AI_MESSAGES_PER_DAY` (5) | `PREMIUM_AI_MESSAGES_PER_DAY` (30) |
| `userGroupsCreatedLimit` | `USER_GROUPS_CREATED_LIMIT_FREE` (1) | `USER_GROUPS_CREATED_LIMIT_PREMIUM` (5) |

**Resolve the media quota unit now.** Product blueprint Section 6.1 stores `mediaQuotaBytes`, but the shipped `todayResponseSchema` and `entitlementsResponseSchema` expose `mediaUploadsUsed` and `mediaUploadsLimit`, which are **counts**. Implement counts as the enforced quota because that is what the UI displays, and count uploads per calendar month per family in the family timezone. Keep a `byteSize` column on `MediaAsset` so a byte-based quota can be added later without a data migration, but do not enforce bytes in MVP.

### 7.12 Deletion behavior

Use explicit service transactions; do not rely on blind cascade for sensitive deletions.

- Memory delete: soft-delete memory immediately, revoke media access, mark media deleted, queue/best-effort object deletion.
- User deletion: delete devices, AI, community authorship or anonymize where moderation evidence must remain, memberships, blocks, bookmarks, consents; archive any group they host.
- Family deletion: owner-only; delete/revoke media first, then family data.
- Group archive: retain posts for the moderation/legal window; hide from members immediately.
- Expired invites: purge family and group invites after 30 days past expiry.
- AI messages: purge after 30 days unless user deletes sooner.
- Security/audit metadata: retain 12 months without content bodies.

---

## 8. Contract corrections required before route work

Complete **all** of these in Phase 0, including the multi-child block (corrections 26–35), so server and native do not encode known gaps. Contract edits are cheap in Phase 0 and expensive once routes and native screens depend on them. Where a correction names a later phase, that is the phase which *consumes* the schema, never permission to postpone writing it.

1. Add structured v1 error schema.
2. Add `GET /api/v1/posts/:id` response containing a post and paginated comments, or add a comments-list endpoint. Current live client cannot reliably load a thread from the feed contract alone.
3. Add `GET /api/v1/invites/:token/preview` with safe household display name, inviter display name, role, and expiry. Do not reveal member emails or child birth dates.
4. Add `GET /api/v1/blocks` and `DELETE /api/v1/blocks/:userId`; the UI currently has no live list/unblock contract.
5. Decide reaction semantics. Recommended:
   - `PUT /api/v1/posts/:id/reaction` adds the single MVP heart;
   - `DELETE /api/v1/posts/:id/reaction` removes it.

   The shipped native client calls `POST /api/v1/posts/:id/reactions` (plural, `apps/native/lib/api/community.ts`). Implement the new routes **and** keep the plural POST registered as a thin alias that toggles the heart, then migrate native in Phase 8 and only remove the alias after that. Do not ship the new pair alone; it would break the released Connect screen.
6. Add `GET /api/v1/notification-preferences` to the canonical endpoint inventory (native already calls it).
7. Add optional signed media download URL to memory responses (already optional in the current contract).
8. Add `expiresAt` to the media upload URL response.
9. Add pagination query schemas (`cursor`, `limit`) rather than parsing raw strings ad hoc.
10. Add content reviewer/review date fields to detail responses because the UI and AI safety requirements need them.
11. Remove client-controlled `acceptedAt` from consent input. The server records its own clock.
12. Keep contract casing explicit at the API boundary:
    - Prisma `ACTIVE` maps to contract `"active"`;
    - data request `PENDING` maps to contract `"queued"`;
    - moderation `HIGH` maps to contract `"high"`;
    - entitlement source uses `"free"`, `"revenuecat"`, or `"manual"`.
13. Add milestone list and observation-upsert contracts limited to Section 7.5.
14. Add `GET /api/v1/community/usage` so UI quotas/account age/link permission/posting availability come from the server.
15. Add `GET /api/v1/data-requests/:id` so the export UI can poll queued work.
16. Support literal pregnancy ID `"current"` in conversion because native currently sends it. Resolve the family’s active pregnancy; never store `"current"` as an ID.
17. Keep `/api/me` identity-only for MVP and use the already-wired family/Today/entitlement queries in parallel. Do not create an overlapping bootstrap endpoint.
18. Expand `todayResponseSchema` with server-selected card payloads. The current response has a capture prompt but no Care action ID/content, Learn item, or Connect prompt, forcing live screens to use mock product data.
19. Add `GET/PATCH /api/v1/preferences` for persisted `primaryGoal` and timezone. Store these fields on `User`; do not create a generic JSON settings dump.
20. Add `critical` to moderation priority and add the pre-launch moderation actions in Phase 8.
21. Extend `groupSchema` for one unified group model: add `kind` (`stage` | `user`), `role` (`host` | `member` | null), `description`, `postingEnabled`, `memberLimit`, and `archived`. The current schema cannot express a member-created group or host permissions.
22. Add member-created group contracts: create group, update group, archive group, create invite link, revoke invite, preview invite, join by token, list my groups, list group members, remove member, leave group.
23. Add `POST /api/v1/families/current/leave` input/response. A contributor or viewer currently has no way to leave a household, and the family delete path does not cover it.
24. Add a group-scoped host moderation input (`hide post`, `remove member`, `ban member`, `disable posting`) that is separate from the admin moderation contract. Hosts must never receive the admin queue schema.
25. Add `groupId` and `groupKind` to moderation queue items so the founder can see whether a report came from a seeded cohort or a member-created group.

#### Multi-child corrections (Section 7.2.1; write these in Phase 0, consumed in Phases 1–2)

26. Add optional `childId` **and optional `pregnancyId`** to `createMemoryInputSchema`, and add both to `memorySchema`. **This is the highest-priority correction in this section**: a memory created without a target can never be attributed to the right child or pregnancy later, because the information to reconstruct it will not exist anywhere.
27. Add optional `childId` and `pregnancyId` to `updateMemoryInputSchema` so a mis-attributed memory can be corrected. Phase 2 permits this edit, so the contract must allow it.
28. Add optional `childId` to the memories list query schema so a per-child timeline is possible. Absent filter means the whole household.
29. Add `GET /api/v1/children` returning an array of `childSchema`, ordered youngest first, excluding archived children by default with an `includeArchived` query flag. There is currently no way to read the children a family already has.
30. Extend `childSchema` additively with `birthOrder: number`, `isActive: boolean`, and `archivedAt: string | null`. Do not invent a second `childSummary` shape; one child contract is easier to keep correct.
31. Add `children: childSchema[]` to `familySummarySchema` alongside the existing `childDisplayName`. Keep the singular field populated with the active child so already-shipped screens keep working; new UI reads the array. Same additive approach for `stageResponseSchema` and `recapSchema`.
32. Add `activeChildId` to the preferences contract from correction 19, plus `POST /api/v1/children/:id/activate` so switching child context is one call. Return the resolved `activeChildId` on `stageResponseSchema` so the client never has to guess which child the stage describes. Expose `activeChildId` as read-only on `GET /api/v1/preferences`, and have `PATCH /api/v1/preferences` reject it with `422 UNSUPPORTED_FIELD` rather than silently ignoring it. `POST /api/v1/children/:id/activate` is the only writer, so exactly one code path validates family ownership and archived state.
33. Extend pregnancy conversion for twins **without breaking the shipped client**. The live native screen sends `{ childName, birthDate }` and parses a single `childSchema` (`apps/native/lib/api/profiles.ts`), so an array-only response would fail Zod parse on a screen that is already released. Use a union input and a superset response:

    ```ts
    export const convertPregnancyInputSchema = z.union([
      z.object({
        childName: z.string().trim().min(1).max(80),
        birthDate: z.string().min(1),
      }),
      z.object({
        birthDate: z.string().min(1),
        babies: z
          .array(z.object({ displayName: z.string().trim().min(1).max(80) }))
          .min(1)
          .max(4),
      }),
    ]);

    export const convertPregnancyResponseSchema = childSchema.extend({
      children: z.array(childSchema),
    });
    ```

    The response keeps the first child's fields at the top level so the existing screen still parses, and adds the full `children` array for multi-baby UI. Cap `babies` at 4; higher-order multiples are rare enough to handle by adding children manually.
34. Add `PATCH /api/v1/children/:id/archive`. Do not add a child delete route in MVP.
35. Add `maxChildren` to `entitlementsResponseSchema` (nullable, where `null` means unlimited) so the UI can show the add-child limit without hardcoding it.

---

## 9. Complete route inventory

This is the server checklist. Every current native client route appears here. Added routes marked **contract addition** close known frontend gaps.

### Identity and setup

- `GET /api/me` — Clerk auth; existing `meResponseSchema`; extend only through a coordinated versioned contract.
- `PATCH /api/account` — Clerk auth; existing account contract.
- `DELETE /api/account` — Clerk auth; confirmation input; 204.
- `POST /api/v1/consents` — auth; `createConsentInputSchema` → `consentRecordSchema`.
- `POST /api/v1/data-requests` — auth; `createDataRequestInputSchema` → `dataRequestSchema`.
- `GET /api/v1/data-requests/:id` — requester only → `dataRequestSchema`. **Contract addition.**
- `GET /api/v1/preferences` — auth → primary goal/timezone preference contract. **Contract addition.**
- `PATCH /api/v1/preferences` — auth; partial preference input → preference contract. **Contract addition.**

### Families and profiles

- `POST /api/v1/families` — auth; `createFamilyInputSchema` → `familySummarySchema`.
- `GET /api/v1/families/current` — auth/current membership → `familySummarySchema`.
- `POST /api/v1/families/current/invites` — owner/parent; `createInviteInputSchema` → `createInviteResponseSchema`.
- `GET /api/v1/invites/:token/preview` — auth adult; safe preview schema. **Contract addition.**
- `POST /api/v1/invites/:token/accept` — auth adult; token from path → `familySummarySchema`.
- `PATCH /api/v1/families/current/members/:id` — owner/parent; `updateMemberInputSchema` → `familySummarySchema`.
- `DELETE /api/v1/families/current/members/:id` — owner/parent; 204.
- `POST /api/v1/families/current/leave` — non-owner active member; 204. **Contract addition.**
- `POST /api/v1/pregnancies` — owner/parent; `createPregnancyInputSchema` → `pregnancySchema`.
- `PATCH /api/v1/pregnancies/:id` — owner/parent; `updatePregnancyInputSchema` → `pregnancySchema`.
- `POST /api/v1/pregnancies/:id/convert` — owner/parent; `convertPregnancyInputSchema` (one baby or a `babies` array) → `convertPregnancyResponseSchema` (first child's fields plus a `children` array; see correction 33).
- `GET /api/v1/children` — active member; optional `includeArchived` → array of `childSchema`, youngest first. **Contract addition.**
- `POST /api/v1/children` — owner/parent; `createChildInputSchema` → `childSchema`. Enforces `maxChildren`.
- `PATCH /api/v1/children/:id` — owner/parent; `updateChildInputSchema` → `childSchema`.
- `PATCH /api/v1/children/:id/archive` — owner/parent → `childSchema`. **Contract addition.**
- `POST /api/v1/children/:id/activate` — active member; sets caller's `activeChildId` → `childSchema`. **Contract addition.**
- `GET /api/v1/stage` — active member → `stageResponseSchema`, resolved by `computeStage()` (active pregnancy first, else the caller's active child).

### Memories and media

- `POST /api/v1/media/upload-url` — contributor+; `mediaUploadUrlInputSchema` → `mediaUploadUrlResponseSchema`.
- `POST /api/v1/memories` — contributor+; `createMemoryInputSchema` → `memorySchema`.
- `GET /api/v1/memories` — active member; cursor query → `listMemoriesResponseSchema`.
- `GET /api/v1/memories/:id` — active member → `memorySchema`.
- `PATCH /api/v1/memories/:id` — allowed editor; `updateMemoryInputSchema` → `memorySchema`.
- `DELETE /api/v1/memories/:id` — allowed deleter; 204.

### Today and content

- `GET /api/v1/today` — contributor+ or viewer read → `todayResponseSchema`.
- `POST /api/v1/challenges/complete` — contributor+; `completeChallengeInputSchema` → `todayResponseSchema`.
- `GET /api/v1/badges` — active member → `listBadgesResponseSchema`.
- `GET /api/v1/milestones` — active member; optional `childId`, defaulting to `resolveActiveChild`; returns stage definitions plus that child's observations and echoes the resolved `childId`. Returns an empty definition set when the family has no children yet. **Contract addition.**
- `PUT /api/v1/milestones/:definitionId/observation` — contributor+; requires an explicit `childId` so an observation is never silently recorded against the wrong sibling; upsert one four-state observation. **Contract addition.**
- `GET /api/v1/content` — auth; cursor query → `listContentResponseSchema`.
- `GET /api/v1/content/:slug` — auth → `contentDetailSchema`.
- `POST /api/v1/content/:id/bookmark` — auth; idempotent/toggle behavior documented; 204.

### Recaps, billing, and notifications

- `GET /api/v1/recaps/current` — active member → `recapSchema`.
- `POST /api/v1/recaps/current/share-link` — active member → `shareLinkResponseSchema`.
- `GET /api/v1/public/recaps/:token` — public limited recap contract. **Contract addition.**
- `GET /api/v1/entitlements` — active member → `entitlementsResponseSchema`.
- `POST /webhooks/revenuecat` — provider signature; provider event response.
- `POST /api/v1/devices/push-token` — auth; `pushTokenInputSchema`; 204.
- `GET /api/v1/notification-preferences` — auth → `notificationPreferencesSchema`.
- `PATCH /api/v1/notification-preferences` — auth; `updateNotificationPreferencesInputSchema` → `notificationPreferencesSchema`.

### AI

- `POST /api/v1/ai/chat` — contributor+; `aiChatInputSchema` → `aiChatResponseSchema`.
- `GET /api/v1/ai/usage` — contributor+ → `aiUsageResponseSchema`.
- `DELETE /api/v1/ai/conversations/:id` — conversation owner; 204.
- `POST /api/v1/ai/messages/:id/report` — message owner; `reportAiMessageInputSchema`; 204.

### Community and moderation

- `GET /api/v1/groups` — auth + feature flag → `listGroupsResponseSchema`. Returns discoverable stage groups plus every group the caller belongs to. Never returns another user's link-only groups.
- `POST /api/v1/groups/:id/join` — auth + rules consent; stage groups only; 204.
- `GET /api/v1/groups/:id/posts` — active group member; cursor query → `listGroupPostsResponseSchema`.
- `POST /api/v1/groups/:id/posts` — active group member; `createGroupPostInputSchema` → `groupPostSchema`.
- `GET /api/v1/posts/:id` — visible post + comments detail. **Contract addition.**
- `POST /api/v1/posts/:id/comments` — visible active group member; `createCommentInputSchema` → `commentSchema`.
- `PUT /api/v1/posts/:id/reaction` — visible active group member; 204. **Contract correction.**
- `DELETE /api/v1/posts/:id/reaction` — visible active group member; 204. **Contract correction.**
- `POST /api/v1/posts/:id/reactions` — visible active group member; 204. Legacy alias the shipped native client calls; toggles the heart. Remove only after native migrates.
- `POST /api/v1/reports` — auth; `reportInputSchema`; 204.
- `POST /api/v1/blocks` — auth; `blockInputSchema`; 204.
- `GET /api/v1/blocks` — auth → blocked-user summaries. **Contract addition.**
- `DELETE /api/v1/blocks/:userId` — auth; 204. **Contract addition.**
- `GET /api/v1/community/usage` — auth → server usage/limits/link/posting state. **Contract addition.**
- `GET /api/v1/moderation/queue` — admin → `listModerationQueueResponseSchema`.
- `POST /api/v1/moderation/:id/actions` — admin; `moderationActionInputSchema` → `moderationItemSchema`.

### Member-created groups

All routes require `FEATURE_USER_GROUPS`, an adult-attested account, and current community-rules consent. All are **contract additions**.

- `POST /api/v1/groups` — auth; `{ title, description? }` → group; creator becomes `HOST`; enforces the created-group limit; `Idempotency-Key` required.
- `PATCH /api/v1/groups/:id` — host; `{ title?, description?, postingEnabled? }` → group.
- `POST /api/v1/groups/:id/archive` — host; 204; archives instead of deleting.
- `GET /api/v1/groups/:id/members` — active member → member summaries (display name, role, joined date only; never emails).
- `DELETE /api/v1/groups/:id/members/:userId` — host; `?ban=true` to set `BANNED`; 204; host cannot remove themselves.
- `POST /api/v1/groups/:id/leave` — active non-host member; 204.
- `POST /api/v1/groups/:id/invites` — host; `{ maxUses?, expiresInDays? }` → `{ token, inviteUrl, expiresAt, maxUses }`; plaintext token returned once.
- `GET /api/v1/groups/:id/invites` — host → active invite metadata without tokens.
- `DELETE /api/v1/groups/:id/invites/:inviteId` — host; 204; revokes the link.
- `GET /api/v1/group-invites/:token/preview` — auth; `{ groupTitle, hostDisplayName, memberCount, expiresAt }`; no post content, no member list.
- `POST /api/v1/group-invites/:token/accept` — auth + rules consent; `Idempotency-Key` required → joined group.
- `POST /api/v1/groups/:id/host-actions` — host; `{ action: "hide_post" | "unhide_own_hide" | "disable_posting" | "enable_posting", targetId? , note? }`; 204; scoped strictly to that group.

### Operations

- `POST /webhooks/clerk` — Clerk signature; existing route; idempotency must be added.
- `GET /health/live` — public, no sensitive output.
- `GET /health/ready` — public or infrastructure-restricted, no sensitive output.
- `POST /api/cron/weekly-recaps` — cron secret.
- `POST /api/cron/purge-expired` — cron secret.
- `POST /api/cron/process-data-requests` — cron secret.
- `POST /api/cron/community-prompts` — cron secret; one idempotent host prompt per active group/day.

---

## 10. Phase-by-phase implementation

Agents must complete one phase, run its checks, and report the result before starting the next.

### Phase 0 — Foundation and contracts

#### Build

1. Correct contracts listed in Section 8.
2. Add Fastify error handler.
3. Add request IDs.
4. Add `requireAuth`, current-family resolution, role guard, admin guard.
5. Extend database with `defaultFamilyId`, `activeChildId`, family/member/invite, consent, audit, idempotency, webhook event.
6. Register v1 routes from `create-app.ts`.
7. Add health routes:
   - `GET /health/live` returns process health;
   - `GET /health/ready` verifies a short database query.
8. Add bounded request/body limits and CORS.
9. Add a small feature-flag service:
   - global env defaults;
   - optional `COUNTRY_FEATURE_OVERRIDES_JSON`;
   - trusted hosting-provider country header when available;
   - a client country value may disable a feature but may never enable a globally disabled feature.
10. Add `ProductEvent` and `trackProductEvent()`. No external analytics SDK is needed.

#### Tests

- missing auth → 401;
- local user provisioning;
- default family resolution;
- inactive membership denied;
- wrong family denied;
- admin list parsing;
- error shape;
- health readiness database failure.

#### Stop condition

No product route may be implemented before the authorization helpers and isolation tests pass.

### Phase 1 — Onboarding, families, profiles, consents

#### `POST /api/v1/families`

Auth required.

Transaction:

1. validate name;
2. if request retry idempotency record exists, return original;
3. create family;
4. create owner membership;
5. set user default family;
6. create default free entitlement cache;
7. create default notification preference;
8. audit `family.created`;
9. return `familySummarySchema`.

#### `GET /api/v1/families/current`

Resolve current family and active membership. Return 404 `FAMILY_NOT_FOUND` when onboarding has not created one.

Return:

- family name;
- computed stage mode;
- `childDisplayName` set to the caller's active child, for shipped-screen compatibility;
- `children` array of every non-archived child, youngest first, with `isActive` marking the caller's active child;
- due date;
- active/invited members only as allowed by contract.

#### Profile routes

- pregnancy create: owner/parent, one active pregnancy;
- pregnancy update: owner/parent;
- child list: any active member, youngest first, archived excluded by default;
- child create: owner/parent, rejected with `422 CHILD_LIMIT_REACHED` when the family is at `maxChildren`;
- child update: owner/parent;
- child archive: owner/parent, refuse to archive the last non-archived child while no active pregnancy exists, so a household is never left with no stage context. In the same transaction, clear `activeChildId` for every user in the family pointing at that child so nobody is left focused on an archived profile;
- child activate: any active member, sets only that caller's `activeChildId`, never anyone else's; reject an archived child with `422 CHILD_ARCHIVED`;
- convert pregnancy: owner/parent, one transaction.
- when `:id` equals `"current"`, resolve the family’s active pregnancy before conversion.

Pregnancy conversion transaction:

1. lock active pregnancy;
2. reject already converted unless the same idempotency key returns original;
3. create one child per baby in the input, sharing the birth date, with `birthOrder` from input order;
4. leave existing pregnancy memories attached to the pregnancy record. Do not reassign them to a child: with twins there is no correct child to pick, and the household timeline shows them either way;
5. mark pregnancy converted, storing the first child as `primaryConvertedChildId`;
6. set the creator's `activeChildId` to the first new child;
7. award continuity/pregnancy badge if applicable;
8. update stage;
9. audit, one event per child created;
10. return `convertPregnancyResponseSchema`: the first child's fields at the top level so the already-released convert screen still parses, plus the full `children` array.

Bypass `maxChildren` during conversion. A family delivering twins must never be blocked from recording the birth; show the upgrade prompt afterward instead.

#### `GET /api/v1/stage`

Use one pure `computeStage()` service:

- active pregnancy → pregnancy;
- otherwise the **active child's** DOB → postpartum;
- otherwise unknown.

Resolve the active child before computing, using the fallback order in Section 7.2.1, and return the resolved `activeChildId` in the response so the client knows which child the stage describes. Never pick an arbitrary child row: with siblings at different ages the answer would change between requests and Today's content would flicker.

Return gestational week only for active pregnancy. Write unit tests for boundary dates, and one test for a family with two children of different ages asserting the stage follows the active child and stays stable across repeated calls.

Internally calculate detailed stage buckets (`P_T1`, `P_T2`, `P_T3`, `NB_0_3M`, `I_3_6M`, `I_6_12M`, `T_12_24M`, `K_2_6Y`) for content selection. The current public response remains `pregnancy`, `postpartum`, or `unknown`.

#### Consents

`POST /api/v1/consents` is an upsert by `(userId, policyKey, version)`. Never accept client-supplied acceptance time.

#### User preferences

`GET/PATCH /api/v1/preferences` persists primary goal and timezone. Mark `onboardingCompletedAt` only after adult attestation, current policy consents, current family, and a pregnancy/child profile all exist. Emit `onboarding_completed` once.

#### Invites and members

Create invite:

1. require OWNER or PARENT;
2. enforce seat quota;
3. generate 32 random bytes;
4. return plaintext token once;
5. store SHA-256 hash;
6. expire in 7 days;
7. audit `invite.created`.

Preview:

- lookup hash;
- return safe preview;
- expired/used token → 410;
- do not require family membership.

Accept transaction:

1. auth + adult attestation;
2. lock invite;
3. validate unused/unexpired;
4. if email-bound, ensure Clerk/local email matches;
5. upsert active member;
6. mark accepted;
7. set default family;
8. award partner badge where applicable;
9. audit;
10. return family summary.

Member update/remove follows role matrix. Never allow removing/demoting the owner.

Leaving a household (`POST /api/v1/families/current/leave`):

- any active non-owner member may leave;
- the owner receives `422 OWNER_CANNOT_LEAVE` with guidance to delete the family instead;
- set membership `REMOVED` with `removedAt`, clear `defaultFamilyId` if it pointed there, clear `activeChildId` because it now points at a household the user cannot read, then re-resolve both;
- apply the same clearing when a member is removed by an owner or parent, not only when they leave voluntarily;
- memories the leaver authored stay with the household, because they are family content, not personal content;
- a seat is freed for the entitlement check;
- write an audit event.

#### Phase tests

- complete onboarding happy paths for expecting and parent;
- retries do not duplicate family/profile/consent;
- expired/reused invite;
- email mismatch;
- free seat quota;
- unauthorized contributor member management;
- pregnancy conversion preserves memories;
- twin conversion creates two children from one pregnancy, keeps pregnancy memories intact, and is not blocked by the free child limit;
- the legacy single-baby convert payload still parses against `convertPregnancyResponseSchema`, proving the released convert screen is not broken;
- archiving a child clears `activeChildId` for every member who pointed at it;
- activating an archived child returns `422 CHILD_ARCHIVED`;
- leaving or being removed from a household clears `activeChildId`;
- free child limit rejects a third manually added child but never blocks reads of existing children;
- active child fallback picks the youngest non-archived child and persists it;
- activating a child changes only the calling user's context, not a co-parent's;
- archiving the last child with no active pregnancy is refused;
- cross-family profile access.

### Phase 2 — Memories and private media

#### Upload URL

`POST /api/v1/media/upload-url`

1. require family contributor role or above;
2. allow only JPEG/PNG/HEIC inputs supported by product;
3. enforce 20 MB request maximum and entitlement quota;
4. create random family-scoped storage key;
5. create pending `MediaAsset`;
6. sign PUT for 10 minutes;
7. return upload URL, storage key, required headers, expiry.

Storage key example:

```text
families/<family-id>/media/<random-uuid>.jpg
```

Never include child name, email, or original filename.

**EXIF stripping reality.** With presigned direct-to-storage uploads the server never sees the image bytes, so server-side EXIF stripping is impossible in this design. The client strip in `apps/native` is therefore the enforced control, and that is acceptable for MVP. Do not attempt to add server ingest, because proxying image bytes through the API would break the media architecture and the quota model. Record this decision in the privacy documentation, and if server-side verification becomes a requirement later, add it as a post-upload asynchronous check that quarantines the asset rather than as an inline upload path.

#### Create memory

`POST /api/v1/memories`

1. require contributor role or above;
2. require idempotency key;
3. normalize event date;
4. derive title;
5. resolve the memory target using the ordered rule in Section 7.2.1: explicit `childId` or `pregnancyId` (each verified to belong to this family), else the family's active pregnancy, else the caller's active child, else null. Reject a request that sets both `childId` and `pregnancyId` with `422 AMBIGUOUS_MEMORY_TARGET`;
6. if media key exists, prove it is pending, same family, same uploader;
7. transaction creates memory, attaches media, adds STORY completion for event day/current day as product decides, evaluates badges, audits;
8. return signed media URL when media exists.

Do not fail the text memory because the object cannot be inspected after upload. If attachment verification fails, return a clear media validation error and let the client retry text-only.

#### List/detail/update/delete

- list and detail require active membership;
- list accepts optional `childId`; when absent, return the whole household timeline including household-level and pregnancy memories, so nothing becomes invisible for families with several children;
- private visibility still means family-private in current contract; reserve more granular semantics for later;
- contributor edits/deletes own;
- owner/parent may delete any;
- update may change `childId` or `pregnancyId` to fix a mis-attributed memory, each validated against the same family and subject to the same mutual-exclusion check as create (`422 AMBIGUOUS_MEMORY_TARGET`); clearing both back to null is allowed and means household-level; update does not allow changing author/family/media key;
- delete is soft delete and returns 204;
- signed GET URL expires in 15 minutes.

#### Phase tests

- media quota;
- wrong MIME/size;
- cross-family storage key attach;
- cross-family `childId` attach is rejected;
- memory created with no target during an active pregnancy attaches to the pregnancy, not to null;
- memory created with no target and no active pregnancy falls back to the caller's active child;
- `childId` filter returns only that child's memories, and no filter returns every child's memories plus household ones;
- idempotent create;
- event date sorting and cursor;
- edit permissions;
- delete permissions;
- deleted memory absent;
- signed URL not stored in database.

### Phase 3 — Today, challenges, content, badges

#### Content seed first

Create a repeatable seed script. Upsert by slug. Seed only reviewed product content from approved JSON.

Minimum types needed by Today:

- memory prompts;
- wellness actions;
- parenting tips;
- pregnancy week cards;
- safe AI snippets;
- badge definitions if stored as content.

The beta seed validation command must fail when published inventory is below:

- 40 pregnancy week cards;
- 60 parenting tips;
- 30 parent wellness cards;
- 90 memory prompts;
- 60 wellness micro-actions;
- 30 milestone definitions;
- 50 AI safe-answer snippets.

#### Daily plan

`getOrCreateDailyPlan(userId, date)`:

1. compute stage with the same `computeStage()` used by `GET /api/v1/stage`, so Today and the stage header can never disagree: active pregnancy first, else the caller's active child (Section 6.2.1);
2. select published matching content;
3. choose deterministically using hash of user ID + date + content type;
4. create with unique `(userId, date)`;
5. on unique race, read existing plan;
6. return existing plan forever for that date.

**Switching the active child mid-day.** The plan is frozen once created for that date. Switching child does **not** regenerate it, because regenerating would erase the day's completions and let a user farm the streak by toggling children. The switch takes effect on the next date. Keep the plan keyed by `(userId, planDate)` only — do not add the child to the key.

#### `GET /api/v1/today`

After the Phase 0 contract correction, return:

- date;
- capture card: prompt ID and prompt text;
- care card: challenge/content ID, title, summary, duration, steps, safety/stop copy, reviewer metadata;
- learn card: content ID, slug, title, summary, reading minutes;
- connect card: group/prompt IDs, prompt text, and whether partner invite should be suggested;
- completion map;
- weekly story/wellness/active counts;
- media use and limit;
- AI use and limit;
- premium status.

Do not read counters from client state. Compute from database records and entitlement cache.

**Scope with several children.** Card selection follows the frozen daily plan's stage, so it reflects the pregnancy or the active child, never a blend of siblings. Completions, weekly counts, streaks, and badge awards are **per user and household-wide**, not per child: `ChallengeCompletion` and `BadgeAward` are keyed by user, and a parent who completes a wellness action has completed it once regardless of how many children they have. Per-child badge tracks are deferred (Section 18).

Native must stop using `mockToday` for Care/Learn/Connect when mock mode is off. Capture creation, Care completion, Learn completion, and qualifying Connect actions update their loop keys server-side.

#### Complete challenge

`POST /api/v1/challenges/complete`

1. verify challenge belongs to today’s plan or an allowed content item;
2. infer kind server-side;
3. upsert completion;
4. award badges idempotently;
5. return refreshed Today response.

Repeated completion must not increment counts twice.

#### Badges

Return all active badge definitions with nullable award time. Award rules are pure functions with database uniqueness as final protection.

#### Milestones

- list definitions matching the current child’s stage;
- join each definition with the child’s observation when present;
- upsert only the four allowed statuses;
- set `observedAt` when status becomes `OBSERVED`;
- optionally link a memory created from the milestone;
- enforce child/family membership inside the database query;
- never return diagnostic or comparative judgments.

#### Content API

- list only published/non-withdrawn;
- filter by current stage by default;
- detail by slug;
- bookmark is idempotent/toggle according to corrected contract;
- citations/reviewer metadata returned;
- no draft content leaks.

#### Phase tests

- deterministic plan;
- pregnancy/postpartum/unknown stage selection;
- 4-of-7 union counting;
- story and wellness same day count as one active day;
- repeat completion;
- badge uniqueness;
- unpublished content hidden;
- bookmark isolation.
- milestone observation uniqueness and cross-family isolation.

### Phase 4 — Recaps and sharing

Generate recap deterministically from:

- week range;
- eligible memory count;
- story and wellness counts;
- safe highlight snippets;
- child display name only for private authenticated response.

Recap is **household-scoped, not per-child**. One recap per family per week that draws from every child's memories, because a parent of two wants one weekly moment, not two competing ones. Populate the singular `childDisplayName` from the active child for contract compatibility and add the `children` array from correction 31. Never rank or compare siblings in highlights, and never include a child name in the public shared payload.

Eligibility:

- at least 3 memories; or
- at least 2 story days plus 1 wellness day.

Do not require AI for recap generation.

`GET /api/v1/recaps/current` may generate on demand if the scheduled job has not run. This prevents the app from failing because cron was late.

Share link:

1. family member requests link;
2. generate random token;
3. store only hash;
4. set expiry;
5. return web URL;
6. public endpoint returns a limited privacy-safe recap;
7. never include DOB, due date, location, health text, member emails, or raw private memories.

Weekly cron calls the same idempotent service as on-demand generation.

Schedule it for Sunday 16:00 UTC. The service calculates each family’s week using its recorded timezone.

An AI-written recap intro is optional. If later enabled, it may use only explicitly selected text after a current `week_summary` consent. Deterministic recap generation remains the fallback.

Tests:

- eligibility boundaries;
- deterministic duplicate generation;
- unauthorized family;
- expired/revoked share token;
- public payload privacy allowlist.

### Phase 5 — Billing, entitlements, notifications

#### RevenueCat webhook

1. verify secret/signature;
2. derive provider event ID;
3. reject duplicate using `WebhookEvent`;
4. map App User ID to local user/family;
5. transaction updates subscription and entitlement cache;
6. never trust native “purchase success” as backend entitlement proof;
7. log only event ID/type and result.

The provider event ID is also the purchase-sync idempotency key.

Free defaults:

- 2 adult seats;
- 5 AI/day;
- configured media quota;
- standard recap.

Premium defaults:

- 6 seats;
- 30 AI/day;
- higher media quota;
- premium features.

If webhook processing is delayed, retain the last known entitlement until its known expiry. After expiry, fail safely to free limits without deleting data.

#### Push devices

Register token as an upsert. A token can belong to one user. Remove invalid tokens after provider rejection.

#### Notification preferences

Implement GET and PATCH. PATCH merges fields; it does not reset unspecified values. Quiet hours are user-local strings in the current contract; validate `HH:mm`.

Actual push sending can remain minimal:

- recap ready;
- partner activity;
- community reply.

Do not build a complex notification queue before these flows exist.

After native purchase/restore, native may show a pending state but must invalidate and refetch `/api/v1/entitlements`. Server entitlements remain authoritative.

Tests:

- webhook idempotency;
- entitlement expiry;
- seat/media/AI limits;
- preference partial patch;
- token reassignment;
- invalid token cleanup.

### Phase 6 — Data export and deletion

`POST /api/v1/data-requests`:

- `export`: owner/parent;
- `delete`: account owner; family-owner restrictions apply;
- duplicate pending requests return the existing request.

`GET /api/v1/data-requests/:id` returns only the requester’s row so native can poll `queued → processing → ready/failed`.

Use a database-backed request row, not a queue product.

Cron processor:

1. claim a small batch with transaction/locking;
2. mark processing;
3. produce JSON export with private data;
4. store encrypted/private object;
5. issue expiring signed download URL only to requester;
6. mark ready or failed;
7. retries are safe.

Deletion processor requires explicit service steps and audit without private bodies.

Export scope rules:

- a family export contains household content including memories authored by other members, because it is shared family content the requester can already read in the app;
- it must **not** contain another member's AI conversations, community posts, blocks, device tokens, email addresses, or subscription identifiers;
- a personal export contains the requester's own AI conversations, community authorship, consents, and preferences;
- state these boundaries in the privacy policy so the export matches what users are told.

Tests:

- requester authorization;
- duplicate pending request;
- export contains only requester-authorized families;
- signed URL expiry;
- deletion removes devices/AI/memberships and revokes media.

### Phase 7 — AI (do not start before reviewed content exists)

Default `AI_ENABLED=false`.

Request pipeline:

1. auth and family role;
2. database quota transaction;
3. deterministic rule classifier;
4. if emergency/medical request, return fixed escalation/refusal;
5. retrieve reviewed published content by intent/stage/tag;
6. if no reliable source, refuse;
7. send only retrieved snippets and minimal stage context to one LLM;
8. post-check blocked claims;
9. store answer, citations, safety label;
10. increment usage exactly once;
11. return contract.

Never send:

- community posts;
- another family’s data;
- photos;
- exact DOB;
- unnecessary names;
- full memory history without explicit summary consent.

Configure provider training/data retention off where supported and record the exact vendor setting in `services/ai/README.md`.

Week-summary requests require a stored current-version `week_summary` consent before any memory text is retrieved.

Critical categories:

- self-harm;
- infant harm;
- abuse;
- pregnancy emergency;
- infant emergency;
- medication/dosing;
- diagnosis request.

Maintain at least 50 eval cases. Critical escalation/refusal accuracy must reach 95% before enabling AI.

Tests:

- free/premium daily quota;
- hourly user cap;
- no source → refusal;
- citations on factual answer;
- critical fixed response;
- conversation ownership;
- deletion;
- provider failure without usage double charge.

### Phase 8 — Community and moderation (highest operational risk)

Do not enable until report/block/moderation are complete.

#### Groups

- list only active, feature-enabled groups;
- stage group is suggested, not blindly joined;
- joining creates personal membership;
- user may switch primary group;
- the group list must never leak a link-only group the caller does not belong to.

#### Feed

Feed query must exclude:

- deleted/hidden content;
- posts by users blocked in either direction;
- banned/removed group members.

Create post:

- active group member;
- text only;
- 2,000 char maximum;
- no links for accounts younger than 14 days;
- 10/day database quota;
- posting feature flag;
- lightweight high-risk scan;
- audit report-worthy automatic flags without exposing them to other users.

Comments use equivalent checks and 50/day.

Reactions are idempotent.

#### Report and block

Report:

- validate target exists and is visible to reporter;
- create queue item within same request;
- classify priority from fixed rules;
- return 204;
- never notify reported user with reporter identity.

Block:

- idempotent;
- cannot block self;
- immediately filters both directions.

#### Moderation

Admin-only via `ADMIN_USER_IDS`.

Actions supported by current contract:

- review;
- hide;
- escalate.

Before public community launch, extend the contract with:

- warn user;
- remove user from group;
- ban user from community;
- resolve/reject report.

Each action creates immutable `ModerationAction`, updates report/content state in one transaction, and writes an audit event. Do not hard-delete evidence during moderation.

Operational requirements:

- CRITICAL: immediate acknowledgement and escalation log;
- HIGH: target review under one hour during coverage;
- NORMAL: target review under 24 hours;
- when `COMMUNITY_24H_COVERAGE=false`, disable new posting outside configured moderation coverage while keeping read/report/block available;
- record queue-entry time so SLA age can be measured.

#### Community cold start

Seed these active groups:

- Pregnancy;
- 0–6 months;
- 6–18 months;
- Toddler/preschool;
- Parent wellbeing.

Add an idempotent daily prompt cron using a designated system/host author. Return the warm empty state until a group has at least 10 visible posts. Do not fabricate member counts. Apply the 10-post threshold to seeded stage groups only; a member-created group shows its real content from the first post.

#### Phase 8b — Member-created groups and invite links

Build this only after stage groups, report, block, and the admin queue all work. It reuses those systems; it must not fork them.

**Create group** (`POST /api/v1/groups`):

1. require feature flag, adult attestation, and current community-rules consent;
2. count the caller's active `USER` groups where they are `HOST`; reject with `422` when at the entitlement limit and set `upgradeAvailable: true`;
3. validate title 3–60 characters and description up to 300, both text-only, and run the same high-risk text scan used for posts;
4. generate a random slug; never derive it from the title;
5. in one transaction create the group with `kind=USER`, `visibility=LINK_ONLY`, `memberLimit=USER_GROUP_MEMBER_LIMIT`, plus the creator's `HOST` membership;
6. write an audit event and a `group_created` product event.

**Create invite link** (`POST /api/v1/groups/:id/invites`):

1. require `HOST`;
2. cap active invites per group at 5 and creations at 10 per host per day;
3. generate 32 random bytes, return the plaintext token exactly once, store only the SHA-256 hash;
4. default `maxUses` 25 and expiry 14 days, hard cap 30 days;
5. build `inviteUrl` from `WEB_BASE_URL` so the link opens the web page and deep-links into the app;
6. never log the token or the URL.

**Join by link** (`POST /api/v1/group-invites/:token/accept`):

1. require auth, adult attestation, and current community-rules consent;
2. hash the token and look up the invite;
3. reject revoked, expired, or exhausted invites with `410 INVITE_EXPIRED`;
4. reject when the group is archived or posting-disabled by an admin;
5. reject when the caller is `BANNED` from that group, with a generic message that does not confirm the ban;
6. reject when the group is at `memberLimit` (`422 GROUP_FULL`) or the caller is at `USER_GROUP_JOINED_LIMIT`;
7. in one transaction, take a row lock on the invite, re-check `useCount < maxUses`, upsert the membership as `ACTIVE`, and increment `useCount`;
8. a user who already belongs returns their existing membership successfully, so a double tap is safe;
9. write an audit event and a `group_joined` product event.

**Host actions** (`POST /api/v1/groups/:id/host-actions`):

- verify `HOST` membership on that exact group before anything else;
- `hide_post` sets `hiddenAt` and records a `ModerationAction` with the host as actor and a `HOST` scope marker;
- a host may reverse only a hide the host performed; hides performed by an admin are immutable to hosts;
- `disable_posting` / `enable_posting` flips `postingEnabled` for that group only, and cannot re-enable posting that an admin disabled;
- removing a member sets `REMOVED`, banning sets `BANNED`; banned users lose read access immediately and cannot rejoin with any link;
- every host action writes an audit event; hosts never see reports, reporter identities, or other groups.

**Interaction with the founder queue:**

- reports from member-created groups enter the same `ModerationReport` queue with `groupId` and `groupKind`;
- admin actions always override host actions;
- an admin may archive a member-created group and ban its host from creating groups;
- if the same host accumulates repeated critical reports, surface that count in the queue item so the founder can act on the group, not just the post.

Tests:

- posting disabled;
- age-based links;
- quotas;
- block both directions;
- hidden/deleted filtering;
- report priority;
- non-admin denied;
- moderation audit;
- no media accepted;
- feature flag off returns 503 for create/invite/join;
- created-group limit and joined-group limit enforced;
- member limit enforced;
- link-only group absent from another user's group list and post reads;
- invite reuse up to `maxUses`, then 410;
- expired and revoked invite rejected;
- banned user cannot rejoin with a fresh valid link;
- concurrent joins on the last remaining seat do not exceed `maxUses` or `memberLimit`;
- host cannot act on a group they do not host;
- host cannot unhide an admin hide or re-enable admin-disabled posting;
- host account deletion archives the group;
- archived group rejects new posts and disappears from member group lists.

---

## 11. Jobs and cron

Use authenticated HTTP cron routes calling ordinary services.

Jobs:

- weekly recap generation;
- expired invite/idempotency/pending-upload purge;
- data request processing;
- AI retention purge;
- deleted media cleanup.
- community daily host prompts.

Rules:

- each job is idempotent;
- process bounded batches;
- record counts and duration, not private content;
- one item failure does not abort the whole batch;
- retry failed items with capped attempts;
- on-demand recap remains available if cron fails.

Do not introduce a job framework until database batch processing becomes inadequate.

---

## 12. Deployment shape

Recommended MVP:

- one Node/Fastify service;
- one managed PostgreSQL database;
- one private R2 bucket;
- hosting-provider cron;
- HTTPS only;
- minimum two database connections reserved for operations;
- connection pool sized for the hosting plan, not Prisma defaults guessed blindly.
- automated PostgreSQL backups with a tested restore procedure before beta;
- graceful `SIGTERM`/`SIGINT`: stop accepting requests, wait for in-flight work, close Fastify and Prisma;
- separate staging and production databases/buckets/secrets;
- deploy migrations before new code only when the migration is backward compatible.

Scaling sequence:

1. optimize/index slow queries;
2. increase server/database size;
3. add a second server instance;
4. move coarse rate limiting to gateway/Redis only then;
5. split jobs only when measured workload requires it.

Do not split domains into services preemptively.

Rollback rule: if a release risks data isolation, unsafe AI, unmoderated community posting, or billing access, disable that feature flag first and then roll back code. Never “fix forward” while private data may be exposed.

---

## 13. Testing strategy

### 13.1 Unit tests

Pure logic:

- stage/date calculation;
- title derivation;
- weekly progress;
- badge rules;
- quota rules;
- report priority;
- AI safety rules;
- cursor encode/decode;
- token hash/expiry.

### 13.2 Service tests

Use a real test PostgreSQL database for Prisma behavior. Mock only external providers:

- Clerk API calls;
- object storage signer/delete;
- RevenueCat;
- LLM;
- push provider.

### 13.3 Route tests

Use `fastify.inject`. For every private domain:

- no auth;
- no current family;
- wrong family;
- insufficient role;
- invalid body;
- happy path;
- service failure mapped safely.

### 13.4 Required isolation regression

Create Family A and Family B. For every family resource endpoint, attempt access from the other family. This suite is a release gate.

### 13.5 Provider/webhook tests

- invalid signature;
- duplicate event;
- unknown user/app ID;
- out-of-order billing events;
- provider timeout;
- safe logging.

### 13.6 Product events and launch metrics

Emit first-party events from successful services:

```text
onboarding_completed
memory_created
wellness_completed
today_viewed
invite_sent
invite_accepted
recap_opened
recap_shared
ai_message_sent
ai_escalated
group_joined
group_created
group_invite_created
post_created
report_created
paywall_viewed
purchase_completed
export_requested
account_deleted
```

Do not add an external analytics SDK. Store only event name, IDs, enums, booleans, numbers, and timestamps.

Server services emit authoritative mutation/read events. `paywall_viewed` is UI-only and may remain uncollected until a privacy-reviewed first-party client telemetry path exists; do not add an analytics vendor just for it.

Provide one tested query for Weekly Active Families: families with at least two meaningful actions on at least two distinct days in the previous seven days, including at least one memory or wellness completion.

---

## 14. Agent execution instructions

Copy this section into Grok/Composer tasks.

### Before coding a phase

1. Read this entire document.
2. Read the matching product blueprint sections.
3. Read current contracts and native API client.
4. Inspect existing server conventions.
5. List files to change.
6. Confirm no unrelated feature is being introduced.

### While coding

1. Change contracts first.
2. Add Prisma models and migration.
3. Run Prisma generate.
4. Write service logic.
5. Write route handlers.
6. Register routes.
7. Write tests.
8. Update native only when contract changed.
9. Do not use mock data in server routes.
10. Do not silently swallow database/provider errors.

### After each phase

Run from repository root:

```bash
pnpm db:generate
pnpm check-types
pnpm test
pnpm --filter server test
pnpm --filter @bumpatlas/contracts test
```

When a migration was added, run it against a disposable development database.

Report:

- implemented endpoints;
- migration name;
- tests added;
- commands and results;
- known blockers;
- anything intentionally deferred.

Do not report “done” if any required test is skipped.

---

## 15. Exact recommended build order

1. Phase 0: contracts, errors, auth, family isolation, schema foundation.
2. Phase 1: onboarding, family, profiles, consents, invites.
3. Phase 2: memory CRUD and media.
4. Phase 3: content seed, Today, challenges, badges.
5. Phase 4: recaps and private sharing.
6. Phase 5: billing entitlement cache and notification preferences.
7. Phase 6: export/delete processing.
8. Phase 7: bounded AI.
9. Phase 8: stage-group community and founder moderation.
10. Phase 8b: member-created groups and invite links, behind `FEATURE_USER_GROUPS`.
11. End-to-end native integration with mock mode disabled per completed slice.

Do not wait until the entire backend is complete to integrate. After each phase:

1. point native to the server;
2. turn off mock data for that slice;
3. test loading/error/empty states;
4. fix contract mismatches immediately;
5. persist one stable idempotency key per offline draft/user action; never generate a new timestamp key on each retry;
6. wire cursor pagination so lists do not silently stop after page one;
7. invalidate/refetch server-owned counters after mutations;
8. continue only when the slice works end to end.

---

## 16. Final backend release gate

The backend is ready for beta only when:

- every route in Section 9 exists or its feature flag is safely off;
- mock mode can be disabled;
- all migrations apply to an empty database;
- seed command is repeatable;
- every family endpoint passes cross-family tests;
- media is private and quota checked;
- retrying memory/invite/challenge requests does not duplicate data;
- invite reuse/expiry fails safely;
- Today progress is database-derived;
- Today cards no longer fall back to mock product data;
- timezone boundary tests pass for pregnancy and child stages;
- a household with two children of different ages works end to end: both appear in the children list, memories attribute to the right child, stage follows the active child, and milestones are tracked separately with no sibling comparison anywhere in the response;
- twins can be recorded from one pregnancy without hitting a paywall;
- milestone observations persist and remain non-diagnostic;
- launch content seed minimums pass;
- content exposes reviewer metadata;
- recap public payload is privacy-allowlisted;
- RevenueCat webhook is idempotent;
- export and account deletion pass end to end;
- AI is disabled or passes safety eval;
- community is disabled or report/block/moderation all work;
- member-created groups are disabled or every Phase 8b test passes;
- a link-only group is provably invisible to non-members;
- host powers cannot reach another group or the admin queue;
- geo feature overrides cannot bypass global safety flags;
- moderation coverage/SLA state is observable before community launch;
- product events contain no free text;
- logs contain no private text;
- readiness health check works;
- `pnpm check-types` and `pnpm test` pass.

---

## 17. Reference slice (copy this shape)

This is the canonical example. Every route in this backend should look structurally like this. It shows the contract, the service, the route with test-injectable dependencies, and the test, using the conventions already in `apps/server`.

**Contract** — `packages/contracts/src/v1/community.ts`:

```ts
export const createGroupInputSchema = z.object({
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(300).optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
```

**Service** — `apps/server/src/services/community/groups.ts`. Prisma lives here, never in a route:

```ts
import prisma from "@bumpatlas/db";
import type { CreateGroupInput } from "@bumpatlas/contracts/v1";

import { env } from "@bumpatlas/env/server";
import { ServiceError } from "@/services/errors";
import { randomSlug } from "@/services/slug";

export async function createUserGroup(
  userId: string,
  isPremium: boolean,
  input: CreateGroupInput,
) {
  const limit = isPremium
    ? env.USER_GROUPS_CREATED_LIMIT_PREMIUM
    : env.USER_GROUPS_CREATED_LIMIT_FREE;

  const hosted = await prisma.communityGroupMember.count({
    where: {
      userId,
      role: "HOST",
      status: "ACTIVE",
      group: { kind: "USER", isActive: true },
    },
  });

  if (hosted >= limit) {
    throw new ServiceError(422, "GROUP_LIMIT_REACHED", "You have reached your group limit.", {
      used: hosted,
      limit,
      upgradeAvailable: !isPremium,
    });
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.communityGroup.create({
      data: {
        slug: randomSlug(),
        title: input.title,
        description: input.description ?? null,
        kind: "USER",
        visibility: "LINK_ONLY",
        createdByUserId: userId,
        memberLimit: env.USER_GROUP_MEMBER_LIMIT,
        isActive: true,
      },
    });

    await tx.communityGroupMember.create({
      data: { groupId: group.id, userId, role: "HOST", status: "ACTIVE" },
    });

    return group;
  });
}
```

**Route** — `apps/server/src/routes/v1/community.ts`. Thin: parse, authorize, call service, parse response:

```ts
export type CommunityRouteDeps = {
  requireAuth: typeof requireAuth;
  createUserGroup: typeof createUserGroup;
  getEntitlements: typeof getEntitlements;
};

export async function registerCommunityRoutes(
  fastify: FastifyInstance,
  deps: Partial<CommunityRouteDeps> = {},
) {
  const d = { requireAuth, createUserGroup, getEntitlements, ...deps };

  fastify.post("/api/v1/groups", async (request, reply) => {
    if (!env.FEATURE_USER_GROUPS) {
      return reply.code(503).send(featureUnavailable(request.id));
    }

    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createGroupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const entitlements = await d.getEntitlements(auth.userId);
    const group = await d.createUserGroup(auth.userId, entitlements.isPremium, parsed.data);

    return reply.code(201).send(groupSchema.parse(serializeGroup(group, "host")));
  });
}
```

**Test** — `apps/server/src/routes/v1/community.test.ts`, matching the existing `account.test.ts` style:

```ts
test("POST /api/v1/groups returns 401 without auth", async () => {
  const app = Fastify({ logger: false });
  await app.register((f) => registerCommunityRoutes(f, {
    requireAuth: async (_req, reply) => {
      reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Unauthorized" } });
      return null;
    },
  }));

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/groups",
    payload: { title: "Night feeds crew" },
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});
```

Rules this example encodes:

1. contracts are shared, never duplicated in the server;
2. Prisma appears only in services;
3. routes never contain business rules beyond parse and authorize;
4. limits come from env through the entitlement service, never from the client;
5. errors are structured and carry a request ID;
6. dependencies are injectable so route tests need no database;
7. responses are parsed with the response schema before sending.

---

## 18. Explicitly deferred items

Do not build these while implementing this blueprint:

- public social feed;
- public discovery, browse, or search of member-created groups;
- group-to-group or stranger direct messages;
- community media;
- symptom checker;
- medication dosing;
- child accounts;
- sleep/feeding tracker product;
- voice memories unless founders promote P1;
- full-text/semantic journal search;
- multi-language;
- wearable integrations;
- microservices;
- custom admin platform beyond the moderation queue;
- real-time sockets;
- Redis;
- advanced recommendation ML;
- printed books/marketplace/ads;
- per-child weekly recaps, per-child badge tracks, and one user belonging to multiple households. Multi-child support itself in Section 7.2.1 is **not** deferred; only these extensions on top of it are.

If a future request requires one of these, add a separate approved post-MVP design before coding.

---

## 19. Reviewer checklist after Grok/Composer finishes

The reviewer must verify code, not trust the implementation summary:

1. Compare route registration against every native client path.
2. Compare every response against its Zod schema.
3. Inspect every family Prisma query for membership proof.
4. Inspect every transaction boundary.
5. Test duplicate POSTs.
6. Test Family A attempting Family B reads and writes.
7. Inspect logs for body/token leakage.
8. Inspect storage keys and signed URL expiry.
9. Verify webhook signatures and event idempotency.
10. Run migrations from an empty database.
11. Run all tests.
12. Run native with `EXPO_PUBLIC_USE_MOCK_DATA=false`.
13. Confirm no external provider call happens inside a database transaction.
14. Confirm the group feed query filters by membership, block, hidden, deleted, and archived state in one query.
15. Create a group as user A, then confirm user B cannot see it, read its posts, or guess it by ID.
16. Confirm invite tokens appear nowhere in logs, error messages, or database plaintext.
17. Grep the codebase for any query that reads a family's child with `findFirst` and no ordering or active-child resolution. That pattern silently breaks households with more than one child and is the single easiest multi-child bug to ship.
18. Confirm `childId` and `pregnancyId` are persisted on memory create, are validated against the caller's family, are mutually exclusive, and appear in the memory response. Create one memory during pregnancy and confirm it is attached to the pregnancy rather than stored with no target.
19. Do not approve AI/community until their safety gates pass.

This review is the final protection against a backend that appears complete but fails with real users.
