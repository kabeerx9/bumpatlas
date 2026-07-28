# BumpAtlas Integrated MVP — Product & Engineering Blueprint

**Status:** Canonical implementation source of truth  
**Audience:** Coding agents (Grok / Cursor) and founders  
**Prepared:** 28 July 2026  
**Launch window:** 8 weeks  
**Market:** Global English app-store distribution  
**Business model:** Freemium (household subscription)  
**Community model:** Invite-only private stage groups  

> This document supersedes chat context. Implement exactly what is specified here. Do not expand scope into items listed under Non-Goals unless a founder explicitly amends this file.

---

## 0. How to use this document

1. Read Sections 1–3 before writing any code.  
2. Implement in the vertical-slice order in Section 14.  
3. For every slice: contracts → Prisma → server → native → tests → definition of done.  
4. Never invent medical advice, public community feeds, cash rewards, or tracker features not listed here.  
5. Prefer extending existing patterns in this monorepo (Clerk, Fastify, Zod contracts, Prisma, Expo Router, React Query).

### Agent rules (non-negotiable)

- Do not edit this blueprint casually; treat scope changes as product decisions.  
- Do not add advertising, session-replay, or behavioral analytics SDKs.  
- Do not ship AI that diagnoses, doses medicine, or reassures/alarm about symptoms.  
- Do not auto-post private memories to community.  
- Do not paywall basic family invite, basic journal, export, or deletion.  
- Run tests listed for each slice before marking the slice complete.  
- Keep copy calm, inclusive, adult-facing; no child login.

---

## 1. Product positioning

### 1.1 One-line promise

> Capture one meaningful moment, take one small step for yourself, learn one relevant thing, and stay connected with your stage — in a few calm minutes a day.

### 1.2 Category

Stage-adaptive **private parenting companion** covering pregnancy through early childhood, launched as a synchronized daily experience.

### 1.3 Primary users

- Expecting parents (global English).  
- First-time parents of infants/toddlers.  
- Co-parents / partners who want to contribute memories and see the weekly recap.  
- Close family invited into a private household (grandparents as contributors or viewers later).

### 1.4 Jobs-to-be-done (MVP)

| Job | MVP answer |
|---|---|
| Preserve the child’s / pregnancy story | Memory journal + milestones + weekly recap |
| Return daily without guilt | Soft dual challenge (story + wellness) |
| Feel less alone | Invite-only stage groups |
| Get quick, safe guidance | Bounded AI over reviewed content |
| Stay oriented in pregnancy | Due date, week card, pregnancy journal |
| Care for the parent | Short wellness actions and articles |
| Share without WhatsApp spam | Private household + shareable recap cards |

### 1.5 Competitive gaps we exploit

- Private family rhythm (memory + parent wellness), not only baby tracking.  
- Continuity from pregnancy → baby under one Today ritual.  
- Recap as emotional synthesis, not a photo dump.  
- Visibly bounded AI with citations and refusal.  
- Low-pressure challenges (Finch-style), not loyalty catalogues or shame streaks.

### 1.6 Non-goals (explicitly out of MVP)

- Public global feed or stranger DMs.  
- Child-photo posting in community.  
- Video community uploads.  
- Medical AI, symptom checker, medicine dose calculator.  
- Full newborn care tracker (sleep prediction, feeding timers as a product).  
- Real cash/physical prizes or leaderboards that score children.  
- Full gym program / wearable integrations.  
- Printed books, marketplace, ads.  
- Multi-language content at launch (UI English only).  
- Child-facing mode / accounts.

---

## 2. Feature package (all seven themes, synchronized)

All themes appear on or from the **Today** screen. They share one profile stage, one household, one progress system, and one privacy model.

### 2.1 Memory concept + challenges (Theme 1 — DEEP)

**Purpose:** Primary habit and long-term moat.

**Capabilities:**
- Capture: text, compressed photo, optional short voice note (P1 if time; text+photo is P0).  
- Age/stage-aware daily memory prompt.  
- Backdate entries.  
- Milestone mark → optional memory.  
- Private timeline chronological by event date.  
- Soft weekly goal: complete **4 of 7** story days (not a rigid unbroken streak).  
- Streak freeze: missing a day does not destroy weekly progress; messaging is “Welcome back,” never “You lost your streak.”  
- Badges (cosmetic): First Capture, Week of Stories, Voice Collector (if voice ships), Pregnancy Journal Started, Partner Joined.  
- Weekly recap eligibility when ≥3 memories OR ≥2 story days + ≥1 wellness day in the week.

**Acceptance criteria:**
- First memory capturable within 2 minutes of completing onboarding.  
- Photo uploads strip EXIF/GPS before leave-device or at server ingest (both preferred; client strip required).  
- Memories default visibility = household only.  
- User can export and delete their memories.  
- Challenge completion updates Today and awards badge without guilt copy.

### 2.2 Bounded AI chat (Theme 2 — BOUNDED)

**Purpose:** Convenience and modern differentiator; not the core product.

**Allowed:**
- Explain app features.  
- Suggest a memory prompt or wellness action.  
- Summarize the user’s selected week of text memories (explicit consent).  
- Answer general parenting/pregnancy/wellness questions using **reviewed knowledge base only**.  
- Always show citation title + review date for factual answers.

**Disallowed:**
- Diagnosis, treatment, medication dosing.  
- Interpreting symptoms as safe/unsafe beyond escalation.  
- Saying baby/pregnancy is “normal,” “delayed,” or “healthy.”  
- Analyzing child photos for health.  
- Using community posts or other families’ data.

**Limits:**
- Free: 5 assistant messages / day / household.  
- Premium: 30 / day / household.  
- Hard rate limit: 20 requests / hour / user.  
- Safety classifier runs before generation; urgent topics return escalation card, not free-form advice.

**Acceptance criteria:**
- ≥95% correct escalate/refuse on fixed red-team suite before beta.  
- 100% of health-adjacent factual answers include source + review date.  
- Training on user data disabled in vendor config.  
- User can delete conversation history.

### 2.3 Sharing / daily attention (Theme 3 — DEEP)

**Purpose:** Organic growth without ads.

**Capabilities:**
- Invite partner/family to household (owner / contributor).  
- Per-memory visibility (household).  
- Weekly recap: deterministic template first; optional AI intro from selected text only.  
- Share recap via private link (web) and native share sheet (image card).  
- “On this day” resurfacing after 30+ days of history (P1).  
- Invite CTA after 3rd memory.

**Acceptance criteria:**
- Invites are single-use, expire in 7 days, require adult account.  
- Recap never auto-posts publicly.  
- Share cards omit exact birth date, location, and health facts by default.  
- Invited contributor can add memories without paying.

### 2.4 Pregnancy slice (Theme 4 — FUNCTIONAL)

**Purpose:** Acquisition entry and continuity.

**Capabilities:**
- Due date → current gestational week (computed).  
- Weekly educational card from reviewed content.  
- Pregnancy memory prompts and bump/photo journal.  
- Personal checklist (hospital bag, questions for clinician — non-clinical).  
- Mood / reflection prompt (optional).  
- One-tap convert pregnancy journal → child profile after birth (birth date entry).

**Out of scope:** kick counters with clinical interpretation, contraction timers with triage, symptom checkers, medication advice.

**Acceptance criteria:**
- Week calculation correct across time zones using due date.  
- All pregnancy educational cards have reviewer + review date.  
- Conversion preserves memories under the new child profile.

### 2.5 Community — private groups (Theme 5 — FUNCTIONAL / HIGH RISK)

**Purpose:** Belonging and retention with controllable moderation.

**Model:** Invite-only **private stage groups** (not open public feed).

**Launch cohorts (seed 3–5):**
- Pregnancy  
- 0–6 months  
- 6–18 months  
- Toddler / preschool  
- Parent wellbeing  

**Capabilities:**
- Join one primary stage group based on profile (can switch).  
- Text posts, optional reactions, threaded comments.  
- Report + block.  
- Founder moderation queue.  
- Daily seeded prompt post per group.  
- Rate limits: 10 posts / day, 50 comments / day per user.

**Hard bans at launch:**
- No child photos in community.  
- No DMs between strangers.  
- No links in first 14 days for new accounts (link allowlist later).  
- No anonymous posting.

**Acceptance criteria:**
- Report creates moderation queue item within 5s.  
- Block prevents seeing each other’s posts.  
- Community rules accepted before first post.  
- Groups hidden/empty-state until seeded activity exists.  
- High-risk reports (self-harm, abuse, CSAM language) escalate with dedicated UI and logging.

### 2.6 Parenting content (Theme 6 — FUNCTIONAL)

**Purpose:** Trust and “Learn” card on Today.

**Capabilities:**
- Short articles / tips by stage tags.  
- Bookmark.  
- Open from Today “Learn” card and from AI citations.  
- Content versioning with source + reviewer + reviewedOn.

**Seed inventory (launch):**
- 40 pregnancy week cards (approx. weeks 4–40 compressed as available).  
- 60 parenting tips (0–24 months).  
- 30 wellness / parent self-care cards.  
- 90 memory prompts.  
- 60 wellness micro-actions.  
- 30 milestone definitions (non-diagnostic windows).  
- 50 AI safe-answer knowledge snippets mapped to intents.

### 2.7 Fitness / wellness challenges (Theme 7 — FUNCTIONAL, reframed)

**Purpose:** Second daily reason to open; parent care.

**Reframe:** Parent wellness, not gym product.

**Capabilities:**
- Daily 2–5 minute wellness action (breathing, stretch, short walk, hydration, rest cue).  
- Stage-gated: pregnancy vs postpartum vs general parent.  
- Contraindication disclaimer and “stop and seek care” copy on exercise cards.  
- Same weekly progress system as story days (4 of 7 optional; completing either story or wellness counts toward “active day”).  
- Tutorial cards (same content system).  

**Out of scope:** personalized workout plans, biometric tracking, calorie counting, competitive fitness leaderboards.

**Acceptance criteria:**
- Exercise content has named reviewer fields populated before publish flag.  
- Users reporting complications see clearance reminder before exercise actions.  
- Skipping wellness never reduces memory progress punitively.

---

## 3. Synchronized Today experience

### 3.1 Information architecture (5 tabs)

| Tab | Route | Purpose |
|---|---|---|
| Today | `/(tabs)/` | Daily plan — product home |
| Journey | `/(tabs)/journey` | Memories, milestones, recaps, pregnancy/child timeline |
| Connect | `/(tabs)/connect` | Private stage group |
| Guide | `/(tabs)/guide` | Content library + AI entry |
| Family | `/(tabs)/family` | Household, invites, subscription, privacy, support |

Stack screens (examples): capture, memory detail, challenge detail, assistant chat, post composer, moderation (admin), paywall, invite accept, onboarding.

### 3.2 Today cards (max 4 primary)

1. **Capture** — today’s memory prompt + one-tap compose.  
2. **Care** — today’s wellness action.  
3. **Learn** — one stage-aware content card.  
4. **Connect** — one group prompt or “invite partner” if alone.

Plus: progress ring (active days this week), streak-safe messaging, quick AI button.

### 3.3 Stage computation

```
if pregnancy.active && !child.born:
  stage = pregnancy.weekBucket  // e.g. P_T1, P_T2, P_T3, or week number
else if child.dob:
  stage = ageBucket(child.dob)  // NB_0_3m, I_3_6m, I_6_12m, T_12_24m, K_2_6y
else:
  stage = UNKNOWN → prompt onboarding completion
```

Stage drives prompts, wellness, learn card, and default community group.

---

## 4. UX specification (screen inventory)

### 4.1 Onboarding (replace travel demo)

Max 8 required screens:

1. Welcome + adult 18+ attestation.  
2. Privacy plain-language summary + accept Terms / Privacy / Community Rules (community acceptance can be deferred until first Connect visit).  
3. Role: expecting / parent / partner-caregiver.  
4. Create household name (optional default).  
5. Pregnancy due date **or** child name + DOB.  
6. Primary goal: memories / wellness / connect / learn.  
7. Notification preference (ask after first value; optional here).  
8. Invite partner CTA (skippable).

**First-session success:** create profile + complete one Capture or Care action within 10 minutes.

### 4.2 Key screens (acceptance-level)

| Screen | Must support |
|---|---|
| Today | 4 cards, progress, pull-to-refresh, offline banner |
| Capture | prompt, text, photo pick/compress, save, visibility note |
| Journey timeline | infinite scroll, filters (memories / milestones / recaps) |
| Memory detail | edit, delete, share-to-household only |
| Wellness detail | steps, duration, stop-now, complete / skip |
| Guide list + detail | bookmark, citation metadata |
| Assistant | composer, citations, quota meter, escalate cards, report answer |
| Connect feed | posts, composer (text), reactions, comments, report, block |
| Family | members, invite, roles, subscription, export, delete account |
| Paywall | annual/monthly clear pricing, restore, what remains free |

### 4.3 Empty / error / loading

- Empty Journey: illustrate first prompt CTA.  
- Empty Connect: “Your group is warming up” + daily prompt composer for seed hosts.  
- Offline: allow local draft memory; queue upload.  
- API 401: force re-auth.  
- API 403 family: clear “no access” state.  
- Media fail: retry + keep text memory.

### 4.4 Accessibility

- Dynamic type support for primary text.  
- Minimum 44pt tap targets.  
- Labels on icon-only buttons.  
- Respect reduce-motion where animations exist.  
- Color contrast AA for text on surfaces.

### 4.5 Notifications

Categories (all opt-in per category): daily prompt, wellness reminder, partner activity, weekly recap ready, community reply (muted by default for beta), subscription.

Rules: quiet hours default 21:00–08:00 local; no shame language; group related alerts.

---

## 5. Monetization (freemium)

### 5.1 Free forever

- Today loop (prompt + wellness + learn).  
- Core journal (text + compressed photos) with free media quota.  
- Household with **2 adults** (owner + 1).  
- Weekly standard recap.  
- Stage group participation.  
- 5 AI messages / day.  
- Export + delete.  
- Safety content always free.

### 5.2 Premium (household)

**Pricing test:** US$6.99/mo or US$59/yr (founding US$49/yr for first 90 days). Localize via stores.

Includes:
- Higher media quota / original quality option.  
- Unlimited children / journals in household.  
- Advanced recap themes + “on this day”.  
- 30 AI messages / day.  
- Extra household seats (up to 6).  
- Premium guided wellness packs.  
- Advanced search across journal.

### 5.3 Paywall moments (contextual)

- After first weekly recap preview of premium theme.  
- When adding 3rd adult.  
- When AI quota exhausted (soft).  
- When free media quota nearing limit.

### 5.4 Billing tech

- RevenueCat + App Store / Play Billing.  
- Server entitlement cache via RevenueCat webhooks.  
- Restore purchases required on Family → Subscription.  
- Never use Stripe for digital IAP features on mobile.

---

## 6. Data model (Prisma)

Extend `packages/db/prisma/schema/`. Prefer split files if Prisma multi-file is configured; otherwise one schema with clear sections. **Use migrations (`db:migrate`), not only `db:push`, before beta.**

### 6.1 Core models (required fields abbreviated)

```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String?  @unique
  name          String?
  imageUrl      String?
  dateOfBirth   DateTime? // adult verification aid; optional
  isAdultAttested Boolean @default(false)
  adultAttestedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  members       FamilyMember[]
  consents      ConsentRecord[]
  devices       PushDevice[]
  blocksInitiated UserBlock[] @relation("blocker")
  blocksReceived  UserBlock[] @relation("blocked")
  aiConversations AiConversation[]
  moderationActions ModerationAction[]
}

model Family {
  id           String   @id @default(cuid())
  name         String?
  ownerUserId  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  members      FamilyMember[]
  invites      FamilyInvite[]
  children     ChildProfile[]
  pregnancies  PregnancyProfile[]
  subscription Subscription?
  memories     MemoryEntry[]
  // ...
}

enum FamilyRole { OWNER PARENT CONTRIBUTOR VIEWER }
enum MemberStatus { ACTIVE INVITED REMOVED }

model FamilyMember {
  id        String @id @default(cuid())
  familyId  String
  userId    String
  role      FamilyRole
  status    MemberStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  @@unique([familyId, userId])
  @@index([userId])
}

model FamilyInvite {
  id        String @id @default(cuid())
  familyId  String
  email     String?
  tokenHash String @unique
  role      FamilyRole
  expiresAt DateTime
  acceptedAt DateTime?
  createdByUserId String
  createdAt DateTime @default(now())
}

model ChildProfile {
  id        String @id @default(cuid())
  familyId  String
  displayName String
  dateOfBirth DateTime?
  sexOptional String?
  isPremature Boolean @default(false)
  adjustedDueDate DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([familyId])
}

model PregnancyProfile {
  id        String @id @default(cuid())
  familyId  String
  dueDate   DateTime
  status    String   // ACTIVE, CONVERTED, ARCHIVED
  convertedChildId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([familyId])
}

model MemoryEntry {
  id          String @id @default(cuid())
  familyId    String
  childId     String?
  pregnancyId String?
  authorUserId String
  eventDate   DateTime
  bodyText    String?
  promptId    String?
  milestoneId String?
  visibility  String  @default("HOUSEHOLD")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  media       MediaAsset[]
  @@index([familyId, eventDate])
}

model MediaAsset {
  id          String @id @default(cuid())
  familyId    String
  memoryId    String?
  uploaderUserId String
  storageKey  String
  mimeType    String
  byteSize    Int
  width       Int?
  height      Int?
  sha256      String?
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
  @@index([familyId])
}

model MilestoneDefinition {
  id          String @id @default(cuid())
  slug        String @unique
  title       String
  stageTags   String[]
  domain      String
  guidance    String
  reviewedOn  DateTime
  reviewerName String
  isPublished Boolean @default(false)
}

model MilestoneObservation {
  id        String @id @default(cuid())
  familyId  String
  childId   String
  definitionId String
  status    String // NOT_OBSERVED EMERGING OBSERVED SKIPPED
  observedAt DateTime?
  memoryId  String?
  createdAt DateTime @default(now())
  @@unique([childId, definitionId])
}

model DailyPlan {
  id        String @id @default(cuid())
  familyId  String
  userId    String
  planDate  DateTime @db.Date
  stageKey  String
  memoryPromptId String?
  wellnessActionId String?
  contentItemId String?
  communityPromptId String?
  createdAt DateTime @default(now())
  @@unique([userId, planDate])
}

model ChallengeCompletion {
  id        String @id @default(cuid())
  familyId  String
  userId    String
  planDate  DateTime @db.Date
  kind      String // STORY WELLNESS
  sourceId  String?
  createdAt DateTime @default(now())
  @@unique([userId, planDate, kind])
}

model BadgeAward {
  id        String @id @default(cuid())
  userId    String
  familyId  String
  badgeKey  String
  awardedAt DateTime @default(now())
  @@unique([userId, badgeKey])
}

model ContentItem {
  id          String @id @default(cuid())
  slug        String @unique
  type        String // TIP ARTICLE WELLNESS_ACTION PROMPT PREGNANCY_WEEK AI_SNIPPET
  title       String
  bodyMarkdown String
  stageTags   String[]
  sourceName  String?
  reviewerName String?
  reviewedOn  DateTime?
  isPublished Boolean @default(false)
  withdrawnAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WeeklyRecap {
  id        String @id @default(cuid())
  familyId  String
  weekStart DateTime @db.Date
  payloadJson Json
  shareTokenHash String? @unique
  createdAt DateTime @default(now())
  @@unique([familyId, weekStart])
}

model AiConversation {
  id        String @id @default(cuid())
  userId    String
  familyId  String
  createdAt DateTime @default(now())
  messages  AiMessage[]
}

model AiMessage {
  id        String @id @default(cuid())
  conversationId String
  role      String
  content   String
  citationsJson Json?
  safetyLabel String?
  createdAt DateTime @default(now())
}

model AiUsageCounter {
  id        String @id @default(cuid())
  familyId  String
  day       DateTime @db.Date
  count     Int @default(0)
  @@unique([familyId, day])
}

model StageGroup {
  id        String @id @default(cuid())
  slug      String @unique
  title     String
  stageKey  String
  isActive  Boolean @default(true)
}

model StageGroupMember {
  id        String @id @default(cuid())
  groupId   String
  userId    String
  status    String @default("ACTIVE")
  joinedAt  DateTime @default(now())
  @@unique([groupId, userId])
}

model CommunityPost {
  id        String @id @default(cuid())
  groupId   String
  authorUserId String
  bodyText  String
  createdAt DateTime @default(now())
  deletedAt DateTime?
  hiddenAt  DateTime?
  @@index([groupId, createdAt])
}

model CommunityComment {
  id        String @id @default(cuid())
  postId    String
  authorUserId String
  bodyText  String
  createdAt DateTime @default(now())
  deletedAt DateTime?
}

model CommunityReaction {
  id        String @id @default(cuid())
  postId    String
  userId    String
  emoji     String
  createdAt DateTime @default(now())
  @@unique([postId, userId, emoji])
}

model ModerationReport {
  id        String @id @default(cuid())
  reporterUserId String
  targetType String
  targetId  String
  reason    String
  details   String?
  status    String @default("OPEN") // OPEN IN_REVIEW RESOLVED REJECTED
  priority  String @default("NORMAL") // NORMAL HIGH CRITICAL
  createdAt DateTime @default(now())
  resolvedAt DateTime?
}

model ModerationAction {
  id        String @id @default(cuid())
  reportId  String?
  actorUserId String
  action    String
  notes     String?
  createdAt DateTime @default(now())
}

model UserBlock {
  id           String @id @default(cuid())
  blockerUserId String
  blockedUserId String
  createdAt    DateTime @default(now())
  @@unique([blockerUserId, blockedUserId])
}

model Subscription {
  id        String @id @default(cuid())
  familyId  String @unique
  provider  String @default("REVENUECAT")
  status    String
  productId String?
  expiresAt DateTime?
  rawJson   Json?
  updatedAt DateTime @updatedAt
}

model EntitlementCache {
  id        String @id @default(cuid())
  familyId  String @unique
  isPremium Boolean @default(false)
  mediaQuotaBytes Int
  aiDailyLimit Int
  maxMembers Int
  updatedAt DateTime @updatedAt
}

model PushDevice {
  id        String @id @default(cuid())
  userId    String
  token     String @unique
  platform  String
  createdAt DateTime @default(now())
}

model NotificationPreference {
  id        String @id @default(cuid())
  userId    String @unique
  dailyPrompt Boolean @default(true)
  wellness    Boolean @default(true)
  partnerActivity Boolean @default(true)
  weeklyRecap Boolean @default(true)
  communityReply Boolean @default(false)
  quietHoursStart Int @default(21)
  quietHoursEnd Int @default(8)
}

model ConsentRecord {
  id        String @id @default(cuid())
  userId    String
  policyKey String
  version   String
  acceptedAt DateTime @default(now())
  @@index([userId, policyKey])
}

model AuditEvent {
  id        String @id @default(cuid())
  familyId  String?
  actorUserId String?
  action    String
  targetType String?
  targetId  String?
  metaJson  Json?
  createdAt DateTime @default(now())
  @@index([familyId, createdAt])
}

model DataRequest {
  id        String @id @default(cuid())
  userId    String
  type      String // EXPORT DELETE
  status    String @default("PENDING")
  createdAt DateTime @default(now())
  completedAt DateTime?
}
```

### 6.2 Authorization matrix

| Action | OWNER | PARENT | CONTRIBUTOR | VIEWER |
|---|---|---|---|---|
| Manage billing | Y | N | N | N |
| Invite/remove members | Y | Y | N | N |
| Create memories | Y | Y | Y | N |
| Delete own memories | Y | Y | Y | N |
| Delete any memory | Y | Y | N | N |
| View memories | Y | Y | Y | Y |
| Complete challenges | Y | Y | Y | N |
| Use AI (household quota) | Y | Y | Y | N |
| Join community (personal) | Y | Y | Y | Y |
| Export family data | Y | Y | N | N |
| Delete family | Y | N | N | N |

Every server query for family resources **must** join through `FamilyMember` where `userId = auth.userId` and `status = ACTIVE`.

### 6.3 Retention / deletion

| Dataset | Retention |
|---|---|
| Draft local memories | 7 days client |
| Soft-deleted media | logical delete immediate; backups ≤ 90 days |
| AI chats | user-deletable; default retain 30 days |
| Expired invites | purge after 30 days |
| Security logs | 12 months, no chat/health bodies |
| Moderation evidence | restricted; legal schedule |

Account deletion must remove: user, memberships, authored posts/comments, AI data, devices; owner deletion requires transfer or full family wipe flow.

---

## 7. API contract inventory

Base path: `/api/v1`. Auth: Clerk Bearer JWT. Errors: `{ error: { code, message, details? } }`.

### 7.1 Conventions

- Pagination: `?cursor=&limit=` (default 20, max 50).  
- Idempotency: `Idempotency-Key` on POST capture, invite accept, purchase sync.  
- Rate limits: global 120 req/min/user; AI 20/hour; community write 10 posts/day.  
- All family-scoped routes require `familyId` path or resolved default family.

### 7.2 Endpoints (implement in this order)

**Identity / account (extend existing)**
- `GET /api/me` → user + default family summary + entitlements  
- `PATCH /api/account`  
- `DELETE /api/account`  
- `POST /api/v1/consents`  
- `POST /api/v1/data-requests` (export/delete)

**Families**
- `POST /api/v1/families`  
- `GET /api/v1/families/current`  
- `POST /api/v1/families/current/invites`  
- `POST /api/v1/invites/:token/accept`  
- `PATCH /api/v1/families/current/members/:id`  
- `DELETE /api/v1/families/current/members/:id`

**Profiles**
- `POST /api/v1/pregnancies`  
- `PATCH /api/v1/pregnancies/:id`  
- `POST /api/v1/pregnancies/:id/convert`  
- `POST /api/v1/children`  
- `PATCH /api/v1/children/:id`  
- `GET /api/v1/stage`

**Memories / media**
- `POST /api/v1/media/upload-url` → `{ uploadUrl, storageKey }`  
- `POST /api/v1/memories`  
- `GET /api/v1/memories`  
- `GET /api/v1/memories/:id`  
- `PATCH /api/v1/memories/:id`  
- `DELETE /api/v1/memories/:id`

**Today / challenges**
- `GET /api/v1/today`  
- `POST /api/v1/challenges/complete`  
- `GET /api/v1/badges`

**Content**
- `GET /api/v1/content`  
- `GET /api/v1/content/:slug`  
- `POST /api/v1/content/:id/bookmark`

**AI**
- `POST /api/v1/ai/chat`  
- `GET /api/v1/ai/usage`  
- `DELETE /api/v1/ai/conversations/:id`  
- `POST /api/v1/ai/messages/:id/report`

**Community**
- `GET /api/v1/groups`  
- `POST /api/v1/groups/:id/join`  
- `GET /api/v1/groups/:id/posts`  
- `POST /api/v1/groups/:id/posts`  
- `POST /api/v1/posts/:id/comments`  
- `POST /api/v1/posts/:id/reactions`  
- `POST /api/v1/reports`  
- `POST /api/v1/blocks`  
- `GET /api/v1/moderation/queue` (founder/admin only)  
- `POST /api/v1/moderation/:id/actions`

**Recaps**
- `GET /api/v1/recaps/current`  
- `POST /api/v1/recaps/current/share-link`  
- `GET /api/v1/public/recaps/:token` (limited web)

**Billing / notifications**
- `GET /api/v1/entitlements`  
- `POST /webhooks/revenuecat`  
- `POST /api/v1/devices/push-token`  
- `PATCH /api/v1/notification-preferences`

Contracts live in `packages/contracts/src/**` with Zod schemas exported from `packages/contracts/src/index.ts`. Native and server must import the same schemas.

---

## 8. Repository architecture map

### 8.1 Native (`apps/native`)

Replace starter tabs and travel onboarding.

```
apps/native/
  app/
    _layout.tsx
    (auth)/...
    (onboarding)/index.tsx          # parenting onboarding
    (tabs)/
      _layout.tsx                   # Today Journey Connect Guide Family
      index.tsx                     # Today
      journey.tsx
      connect.tsx
      guide.tsx
      family.tsx
    capture.tsx
    memory/[id].tsx
    assistant.tsx
    paywall.tsx
    invite/[token].tsx
  features/
    onboarding/
    family/
    profiles/
    today/
    memories/
    challenges/
    content/
    assistant/
    community/
    billing/
    notifications/
  design-system/                    # extend; rebrand App Starter → BumpAtlas
  navigation/routes.ts              # update route constants
  lib/api.ts                        # wrap new contract client methods
```

**New native dependencies (add when slice needs them):**
- `expo-image-picker`, `expo-image-manipulator`  
- `expo-file-system`  
- `expo-sharing`  
- `expo-notifications`  
- `react-native-purchases` (RevenueCat)  
- optional: `@react-native-async-storage/async-storage` for drafts if SecureStore size limits bind

### 8.2 Server (`apps/server`)

```
apps/server/src/
  create-app.ts                     # register v1 routes, rate limit, helmet
  middleware/
    requireAuth.ts
    requireFamilyMember.ts
    requireEntitlement.ts
    requireAdmin.ts
  routes/
    me.ts account.ts
    v1/families.ts
    v1/profiles.ts
    v1/memories.ts
    v1/media.ts
    v1/today.ts
    v1/content.ts
    v1/ai.ts
    v1/community.ts
    v1/recaps.ts
    v1/billing.ts
    v1/notifications.ts
    v1/moderation.ts
    webhooks/clerk.ts
    webhooks/revenuecat.ts
  services/
    user.ts
    family.ts
    stage.ts
    memory.ts
    media.ts
    today.ts
    content.ts
    ai/
      chat.ts
      safety.ts
      retrieve.ts
      quota.ts
    community.ts
    moderation.ts
    recap.ts
    entitlements.ts
    exportDelete.ts
    audit.ts
  jobs/
    generateWeeklyRecaps.ts
    purgeExpiredInvites.ts
    processDataRequests.ts
```

### 8.3 Packages

- `packages/db` — schema + migrations  
- `packages/contracts` — all Zod DTOs  
- `packages/env` — add `R2_*` / `S3_*`, `OPENAI_API_KEY` or chosen LLM, `REVENUECAT_WEBHOOK_SECRET`, `ADMIN_USER_IDS`

### 8.4 Web (`apps/web`) — limited surface

- `/invite/:token`  
- `/recap/:token`  
- `/legal/privacy`, `/legal/terms`, `/legal/community`  
- `/support`  
- `/account/delete` (Google requirement companion)

Not a second full product.

### 8.5 Media architecture

1. Client requests `POST /media/upload-url` with mime + size.  
2. Server checks entitlement quota; returns signed PUT URL + `storageKey`.  
3. Client strips EXIF via manipulate; uploads directly to R2/S3.  
4. Client creates memory referencing `storageKey`.  
5. Reads use short-lived signed GET URLs.  
6. Delete removes DB row + object + derivatives.

**Vendor recommendation:** Cloudflare R2 (egress-friendly) with private bucket.

### 8.6 Jobs

On Vercel: use cron routes under `/api/cron/*` protected by secret, or a lightweight worker later. MVP crons: weekly recap generation (Sunday 16:00 UTC batch per timezone later), invite purge nightly, data-request processor.

---

## 9. AI architecture

### 9.1 Pipeline

```
User message
  → auth + quota
  → safety classifier (rules + model)
  → if CRITICAL: return escalation card (no generative advice)
  → retrieve top-k ContentItem AI_SNIPPET / TIP by embeddings or keyword tags
  → LLM generate with system prompt: answer ONLY from retrieved snippets; cite; refuse if insufficient
  → post-check: blocked phrases / medical claim detector
  → store message + citations + usage++
```

### 9.2 System prompt principles (store server-side)

- Educational only; not a clinician.  
- If user describes emergency symptoms, instruct to seek local emergency care.  
- Never invent sources.  
- Prefer short answers.  
- Ask clarifying non-medical questions when needed.  
- Do not request or analyze child photos.

### 9.3 Escalation categories

`SELF_HARM`, `INFANT_HARM`, `ABUSE`, `PREGNANCY_EMERGENCY`, `INFANT_EMERGENCY`, `MEDICATION_REQUEST`, `DIAGNOSIS_REQUEST`.

Each maps to a fixed response template + resource links (localized later; English MVP uses generic “contact local emergency services / clinician”).

### 9.4 Evaluation suite (gate)

Maintain `apps/server/src/services/ai/eval/cases.json` with ≥50 cases. CI or pre-release script must pass refuse/escalate accuracy ≥95% on labeled critical cases.

---

## 10. Community & moderation operations

### 10.1 Founder workflow

- Admin flag via `ADMIN_USER_IDS` env.  
- Queue UI in native (hidden route) or simple web admin page.  
- Actions: hide content, remove user from group, warn, ban from community, escalate externally.  
- SLA targets: CRITICAL immediate acknowledgement; HIGH < 1 hour during coverage; NORMAL < 24 hours.  
- If no human coverage overnight, disable new posting automatically (`groups.postingEnabled=false`).

### 10.2 Abuse scenarios to test

Grooming language, medical misinformation, doxxing, harassment, non-consensual sharing requests for child photos, spam, self-harm, impersonation.

### 10.3 Cold start

Seed 50–100 founding families into 3–5 groups. Hosts post daily prompts. Hide empty group feeds behind warm empty states until ≥10 posts exist.

---

## 11. Content operations

### 11.1 Workflow

Draft → expert review fields → safety wording → publish → feedback → scheduled re-review.

### 11.2 Minimum launch inventory

See Section 2.6. Store as seed JSON under `packages/db/seed/content/` and import via script `pnpm --filter @bumpatlas/db seed:content`.

### 11.3 Pregnancy / wellness review requirement

Exercise and pregnancy cards require `reviewerName` + `reviewedOn` before `isPublished=true`. Stop-now and seek-care language mandatory on exercise.

---

## 12. Analytics & metrics

### 12.1 North-star

**Weekly Active Families (WAF):** households with ≥2 meaningful actions on ≥2 distinct days in the last 7 days, including ≥1 memory or wellness completion.

### 12.2 Event taxonomy (first-party only)

`onboarding_completed`, `memory_created`, `wellness_completed`, `today_viewed`, `invite_sent`, `invite_accepted`, `recap_opened`, `recap_shared`, `ai_message_sent`, `ai_escalated`, `group_joined`, `post_created`, `report_created`, `paywall_viewed`, `purchase_completed`, `export_requested`, `account_deleted`.

No free-text bodies in analytics. No ads SDKs.

### 12.3 Launch gates (product)

- ≥50% first-session meaningful action.  
- ≥20% send invite within 7 days.  
- D7 retention hypothesis ≥10% (monitor).  
- AI critical escalation accuracy ≥95%.  
- Zero known cross-family data leaks.  
- Moderation queue not backlogged beyond SLA for CRITICAL/HIGH.

---

## 13. Compliance & global-store safeguards

**Not legal advice.** Founders must obtain counsel. Global English distribution is high risk; ship with geo-aware feature flags even if stores are worldwide.

### 13.1 Hard product controls before public release

- [ ] 18+ attestation and adult-only accounts  
- [ ] No child accounts  
- [ ] Privacy / Terms / Community Rules published and linked in-app + web  
- [ ] Private-by-default media; EXIF strip; signed URLs  
- [ ] No ad/session-replay SDKs on sensitive screens  
- [ ] HBNR-oriented breach runbook drafted  
- [ ] AI boundaries + eval suite passed  
- [ ] Community report/block/moderation live  
- [ ] Account export + delete tested end-to-end (DB + object storage)  
- [ ] Subscription disclosures match store policies  
- [ ] Apple/Google privacy nutrition labels match behavior  

### 13.2 Jurisdiction flags

Use `FEATURE_COMMUNITY`, `FEATURE_AI`, `FEATURE_PREGNANCY_EXERCISE` flags per storefront country if counsel requires. UK Online Safety Act, EU GDPR representative, Canada/Quebec, Australia Privacy Act may require delayed enablement of UGC even if app binary is global.

### 13.3 Child photos

Community child-photo uploads remain **feature-flagged OFF**. Household memories only.

---

## 14. Eight-week execution plan

### Week 1 — Foundation
- Rebrand native shell; replace tabs/routes; remove travel demo from primary paths.  
- Prisma: User extensions, Family, Member, Invite, Child, Pregnancy, Consent, Audit.  
- Authz middleware.  
- Parenting onboarding → server-persisted.  
- Tests: member isolation, invite expiry.

### Week 2 — Memory slice
- Media signed upload + Memory CRUD + Journey timeline.  
- Client EXIF strip + compression.  
- Offline draft.  
- Tests: upload authz, delete cascade.

### Week 3 — Today + challenges
- DailyPlan generation by stage.  
- Completions, badges, flexible weekly progress.  
- Push preference model (sending can be Week 4).  
- Tests: stage buckets, 4-of-7 logic.

### Week 4 — Family + recap
- Invites accept flow (native + web).  
- WeeklyRecap generator + share token web page.  
- Native share card.  
- Tests: token access, contributor permissions.

### Week 5 — Content + AI
- Content seed + Guide tab.  
- AI retrieve-and-answer + quota + eval suite.  
- Tests: refuse/escalate cases, citation presence.

### Week 6 — Private community
- Groups, posts, comments, reactions, block, report, admin queue.  
- Rate limits + posting coverage flag.  
- Tests: block filtering, report priority.

### Week 7 — Freemium + hardening
- RevenueCat, entitlements, paywall.  
- Export/delete jobs.  
- Observability (Sentry or equivalent without PII bodies).  
- Accessibility pass.

### Week 8 — Beta + store
- Seed content/cohorts.  
- Closed beta 50–100 families.  
- Red-team AI + moderation drills.  
- Store listings, legal pages, support mailbox.  
- Staged rollout.

### Founder split (suggested)

- **Founder A:** family, memories, media, today/challenges, reliability.  
- **Founder B:** content/AI, community/moderation, billing, growth loops, web share.  
- **Both:** interviews, safety decisions, beta support (30–40% time from Week 6).

---

## 15. Agent execution protocol

### 15.1 Vertical slice order (strict)

1. Contracts for the slice  
2. Prisma models + migration  
3. Server service + routes + tests  
4. Native API methods + UI  
5. Seed/demo data if needed  
6. Run `pnpm check-types` and relevant `pnpm test`  
7. Update this doc only if founders change scope  

### 15.2 Definition of done (every slice)

- Types pass.  
- Unit/route tests for happy path + authz denial.  
- No cross-family access in tests.  
- UI empty/error/loading handled.  
- Privacy defaults correct.  
- No new Non-Goal features introduced.

### 15.3 Commands (from repo root)

```bash
pnpm install
pnpm check-types
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm dev:server
pnpm dev:native
```

### 15.4 Scope drift prevention

If a request is not in Sections 2, 6, 7, or 14: **do not build it**. Add to Post-launch backlog below.

---

## 16. Test matrix (summary)

| Area | Must cover |
|---|---|
| Authz | User without membership gets 403 on all family routes |
| Invites | Expired/reused tokens fail |
| Media | Quota enforcement; unsigned URL rejected |
| Memories | Author edit; non-author contributor cannot delete others (unless OWNER/PARENT) |
| Today | Deterministic plan per stage/date |
| Challenges | Dual completion same day; weekly count |
| AI | Escalation templates; quota; no answer without retrieval for medical-adjacent |
| Community | Block hides; report creates queue; no child photo field accepted |
| Billing | Entitlement cache updates; free limits apply when expired |
| Delete | User delete removes AI + membership; media keys scheduled for purge |

---

## 17. Launch checklist

- [ ] Closed beta metrics reviewed  
- [ ] Critical bugs (data loss, leak, billing restore) at zero  
- [ ] AI eval gate passed  
- [ ] Moderation coverage scheduled  
- [ ] Legal pages live  
- [ ] Support email monitored  
- [ ] Store screenshots reflect Today loop (not feature spam)  
- [ ] Feature flags set for high-risk countries as advised by counsel  
- [ ] Backup + restore drill for Postgres  
- [ ] Incident response contacts listed  

**Rollback criteria:** cross-family leak, media exposure, unsafe AI incident, unhandled CSAM/self-harm report, billing charging without entitlement — disable feature flag or halt store rollout immediately.

---

## 18. Post-launch backlog (ordered)

1. On-this-day + richer recap themes  
2. Voice notes in memories  
3. Viewer role for grandparents + email digest  
4. Additional languages  
5. Solids / light care tracking (only if users demand)  
6. Improved AI knowledge coverage  
7. Physical books  
8. Public community (only with dedicated moderation staffing)  
9. Advanced pregnancy tools after clinical review  
10. Employer / partner distribution  

---

## 19. Copy & brand principles

- Brand: **BumpAtlas**.  
- Replace all “App Starter” / travel / hostel copy.  
- Tone: calm, specific, non-judgmental, inclusive of partners.  
- Prefer “observation” over “assessment.”  
- Prefer “welcome back” over streak-loss language.  

---

## 20. Traceability to founder requirements

| Founder theme | Blueprint home | Depth |
|---|---|---|
| Memory + streak/challenge | §§2.1, 3, Week 2–3 | Deep |
| AI chat limited | §§2.2, 9, Week 5 | Bounded |
| Sharing / daily attention | §§2.3, 4, Week 4 | Deep |
| Pregnancy | §§2.4, Week 1+3 | Functional |
| Community | §§2.5, 10, Week 6 | Private groups |
| Parenting blogs/tutorials | §§2.6, 11, Week 5 | Functional |
| Fitness challenges | §§2.7, Week 3 | Wellness reframed |

All seven ship in one synchronized package; none require separate apps.

---

**End of canonical blueprint.** Implement from this file. When uncertain, choose the narrower interpretation that preserves privacy, adult-only design, and the Today loop.
