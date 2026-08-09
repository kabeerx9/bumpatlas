# CONTEXT.md — BumpAtlas Domain Glossary

Terms as the code uses them. Model names refer to `packages/db/prisma/schema/*.prisma`
(one file per domain, Prisma merges them); contract files live in `packages/contracts/src/v1/`.

## Identity & household

- **User** — local mirror of a Clerk account, created just-in-time on first authenticated
  request with only `clerkId`; email/name arrive later via `/api/me` and the Clerk webhook.
  Every FK in the schema points at `User.id`, never the Clerk ID. Model `User`
  (`identity.prisma`).
- **Family / household** — the same thing. The model and contracts say **family**
  (`Family`, `families.ts`); comments and user-facing copy say **household** ("No household
  yet.", `MemoryVisibility.HOUSEHOLD`). One owner, members, children, pregnancies, one
  entitlement cache. Every family-scoped query must prove active membership inside the query.
- **Member role** — `OWNER | PARENT | CONTRIBUTOR | VIEWER` on `FamilyMember`
  (`family.prisma`; `familyMemberRoleSchema` in `families.ts`). Exactly one OWNER per family
  in MVP; invites can never grant OWNER. Status: `ACTIVE | INVITED | REMOVED`.
- **Invite (family)** — single-use, role-carrying, optionally email-locked token. Plaintext
  returned once; only the SHA-256 hash is stored (`FamilyInvite.tokenHash`). Acceptance is
  idempotent via `@@unique([familyId, userId])`. Model `FamilyInvite`; `createInviteInputSchema`
  / `acceptInviteInputSchema` in `families.ts`.
- **Default family** — `User.defaultFamilyId`, the household the user is currently reading.
  A pointer, never trusted: `resolveCurrentFamily()` (`apps/server/src/services/family.ts`)
  revalidates membership on every request.
- **Active child** — `User.activeChildId`, per-user (co-parents may point at different
  children). Selects *which child*, never the stage. Revalidated against family and archive
  state on every read to prevent cross-family leaks.

## Profiles & stage

- **Pregnancy** — `PregnancyProfile` (`profiles.prisma`; `pregnancySchema` in `profiles.ts`).
  Status `ACTIVE | CONVERTED | ARCHIVED`. "At most one ACTIVE per family" is enforced in
  Postgres via the `activeFamilyKey` partial-unique trick (set to familyId while active,
  null otherwise). A pregnancy **converts into** children (twins → several); its memories
  stay attached to it, never reassigned.
- **Child** — `ChildProfile`. Archived, never deleted (deleting would orphan memory meaning).
  `birthOrder` disambiguates same-day siblings; `adjustedDueDate` supports adjusted-age
  guidance for premature births. Contract `childSchema` in `profiles.ts`.
- **Stage** — computed, never stored on the user. `computeStage()` in
  `apps/server/src/services/stage.ts`: an active pregnancy always wins over children.
  Two vocabularies: public `stageMode` = `pregnancy | postpartum | unknown` (`common.ts`),
  internal **stage key** = `P_T1…P_T3, NB_0_3M, I_3_6M, I_6_12M, T_12_24M, K_2_6Y, UNKNOWN`,
  kept server-side so content targeting can be re-tuned without a client release.
  `stageTags: String[]` on content rows are stage keys.

## Memories & media

- **Memory** — user-authored moment. `MemoryEntry` (`memories.prisma`; `memorySchema` in
  `memories.ts`). Attributed to exactly one child OR one pregnancy OR neither
  (household-level) — enforced in service + contract, not by Postgres. `eventDate` is a
  calendar date ("when it happened"), distinct from `createdAt`. Visibility
  `HOUSEHOLD | PRIVATE`. Soft-deleted (`deletedAt`) with a recovery window.
- **Media asset** — photo attached to a memory, uploaded via signed URL directly to object
  storage, never through the API process. Lifecycle `PENDING → ATTACHED → DELETED`. Quota
  is upload *counts* per month, not bytes (bytes stored for a future byte quota). Model
  `MediaAsset`; `mediaUploadUrlInputSchema` in `memories.ts`.

## Content & milestones

- **Content item** — reviewed editorial content: `MEMORY_PROMPT`, `PARENTING_TIP`,
  `PREGNANCY_WEEK_CARD`, `PARENT_WELLNESS_CARD`, `AI_SNIPPET`. Anything health-adjacent
  (everything except MEMORY_PROMPT) requires `reviewerName` + `reviewedOn` before
  `isPublished` — enforced by the seed script (`packages/db/seed/seed.ts`) and query layer.
  Model `ContentItem` (`content.prisma`); `contentItemSchema` in `content.ts`.
- **Wellness action** — a guided "Care" activity with ordered steps and mandatory safety
  copy (`clearanceCopy`, `stopCopy`). Its own model (`WellnessAction`) because the structure
  would otherwise be untyped JSON. `wellnessActionSchema` in `content.ts`.
- **Milestone definition vs observation** — the split matters. `MilestoneDefinition` is
  shared, reviewed, observational content ("guidance", never pass/fail); `MilestoneObservation`
  is a per-child record (`@@unique([childId, definitionId])`) with status
  `NOT_OBSERVED | EMERGING | OBSERVED | SKIPPED`. Deliberately **no "expected by" column,
  no delay computation, no sibling comparison** — the product is non-diagnostic. Contracts
  in `milestones.ts`.
- **Bookmark** — `ContentBookmark`, per user per content item, toggle-safe via unique
  constraint.

## Today loop & recaps

- **Daily plan** — the day's four cards (`capture | care | learn | connect`,
  `todayLoopKeySchema` in `today.ts`), chosen once per `(userId, planDate)` and frozen —
  keyed deliberately *not* by child, so switching active child mid-day can't regenerate the
  plan or farm progress. Model `DailyPlan` (`today.prisma`).
- **Challenge** — a completable card kind: `STORY | WELLNESS | LEARN | CONNECT`
  (`ChallengeKind`). "Story" is the completion name for the capture/memory card; "wellness"
  for care. One `ChallengeCompletion` per user per day per kind, household-wide (not
  per-child). Note: **no "streak" concept anywhere** — recaps count `storyDays` /
  `wellnessDays`, and badges (`BadgeAward`, cosmetic, idempotent) are the only meta-reward.
- **Recap** — `WeeklyRecap` (`recaps.prisma`; `recapSchema` in `recaps.ts`). One per family
  per week (`@@unique([familyId, weekStart])`, Monday in the family's time zone), which makes
  cron + on-demand generation idempotent. Highlights are derived short strings, never memory
  bodies verbatim. **Share token** (`RecapShareToken`): hashed like invites; public payload
  is an allowlist (`publicRecapSchema`), and only a view *count* is kept — never who viewed.

## Community

- **Group** — exactly ONE model (`CommunityGroup`, `community.prisma`) for both kinds:
  `STAGE` (seeded cohort, discoverable by stage key) and `USER` (member-created, always
  `LINK_ONLY`), so every safety filter has a single code path. Server-generated random slug
  for USER groups. Contract `groupSchema` in `community.ts`.
- **Group invite** — `CommunityGroupInvite`: same hashed-token pattern as family invites but
  reusable up to `maxUses`.
- **Post / comment / reaction** — `CommunityPost` / `CommunityComment` /
  `CommunityReaction`. Text only — **no media columns exist in community by design** (child
  photos are banned; nowhere to put one). Hides carry `hiddenByAdmin` so a host cannot
  reverse an admin hide. Reactions: one emoji, idempotent by unique constraint.
- **Block** — `UserBlock`: asymmetric storage, symmetric effect (neither side sees the other).
- **Host vs admin** — `CommunityGroupRole.HOST` moderates inside their group;
  admin = founder, resolved from `ADMIN_USER_IDS` env (Clerk IDs), surfaced as 404 not 403
  to non-admins (`apps/server/src/middleware/require-admin.ts`).

## Moderation & safety

- **Moderation queue** — `ModerationReport` (`community.prisma`): reporter, denormalised
  target author, priority `NORMAL | HIGH | CRITICAL` (safety-of-life), status
  `OPEN | REVIEWING | ESCALATED | RESOLVED | REJECTED`, explicit `queuedAt` for SLA age.
  Contract `moderation.ts` (lowercase enums).
- **Moderation action** — `ModerationAction`: append-only decision record;
  `actorScope: ADMIN | HOST` is what distinguishes an admin hide from a host hide.
- **Consent** — `ConsentRecord` (`identity.prisma`; `consents.ts`): legal evidence that a
  policy version (`TERMS | PRIVACY | COMMUNITY | AGE_ATTESTATION | WEEK_SUMMARY`) was
  accepted. Server stamps `acceptedAt`; re-accepting the same version upserts, a new version
  is a new row. Adult attestation (`User.isAdultAttested`) gates community.

## Billing & entitlements

- **Entitlement** — `EntitlementCache` (`billing.prisma`): the *single* place routes read
  limits from (seats, children, media uploads/month, AI daily, groups-created). Denormalised
  on purpose — hot-path quota checks must not recompute provider state. Written only by the
  RevenueCat webhook or admin action; source `FREE | REVENUECAT | MANUAL`. Contract
  `entitlementsResponseSchema` in `billing.ts`. `maxChildren` is never enforced during
  pregnancy conversion (twins must not hit a paywall at birth).
- **Subscription** — `Subscription` (`subscriptions.prisma`): mirror of RevenueCat truth,
  the audit trail behind the cache; `lastEventAt` discards out-of-order webhook events.

## AI

- **AI conversation / message** — `AiConversation` / `AiMessage` (`ai.prisma`; `ai.ts`).
  Bounded assistant: off by default, answers only from reviewed content, every answer carries
  `citationSlugs` and a `safetyLabel` (`NORMAL | SOURCED | REFUSED_NO_SOURCE | ESCALATED |
  REFUSED_OUT_OF_SCOPE`).
- **AI usage** — `AiUsageDaily` (per family) and `AiUsageHourly` (per user, anti-burn):
  counters incremented by conditional UPDATE so check + increment are one atomic statement.

## Operations

- **Data request** — `DataRequest` (`operations-requests.prisma`; `data-requests.ts`):
  GDPR-style `EXPORT | DELETE` as a DB row worked by cron, not a queue product. DB status
  `PENDING` is renamed **`queued`** in the contract. `claimedAt`/`attempts` make crashed
  runs retryable; export links are signed per request, never stored.
- **Audit event** — `AuditEvent` (`operations.prisma`): IDs and enums only, never
  user-authored text or tokens. 12-month retention.
- **Idempotency record** — `IdempotencyRecord`: replay protection for retryable POSTs,
  keyed `(userId, routeKey, idempotencyKey)`; same key + different body → 409
  `IDEMPOTENCY_CONFLICT`. Written in the same transaction as the business row, business
  row first.
- **Webhook event** — `WebhookEvent`: provider dedupe (`CLERK | REVENUECAT`), no payload
  column by design.
- **Product event** — `ProductEvent`: first-party analytics enum; metadata is numbers and
  booleans only ("adding a string field here is a privacy decision").

## Vocabulary the code avoids

- **"Streak"** — doesn't exist; days-counted (`storyDays`) and badges instead.
- **"Delayed" / expected-by ages** on milestones — deliberately absent; non-diagnostic.
- **"Post photo" in community** — no media columns at all in `community.prisma`.
- **Clerk ID as a foreign key** — always the local `User.id`.
- Contract enums are lowercase (`"active"`, `"queued"`, `"stage"`); Prisma enums are
  SCREAMING_CASE. The mapping happens in services, never in the client.
