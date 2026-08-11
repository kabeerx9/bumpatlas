# Invite-first caregiver onboarding design

**Date:** 2026-08-11

**Status:** Approved for implementation

## Purpose

Caregivers must join the household that invited them. They must not pass through the
household-creator onboarding branch, create an orphan household, and then be asked to invite
someone else.

The inbound invite is therefore a separate onboarding entry point. Household creation keeps
only the two roles that can produce a usable first household: Expecting and Parent.

## Chosen flow

1. A link holder opens `/invite/:token` and sees the deliberately minimal invite preview.
2. A signed-out recipient chooses sign in or sign up. The invite path is carried through
   password, MFA, email verification, and Google authentication.
3. Every signed-in recipient confirms adult status and accepts the current Terms and Privacy
   Policy revision. Re-recording the same revision is idempotent for an existing user.
4. The client synchronizes the Clerk account mirror, records those three consent events, and
   accepts the existing single-use invite. It never calls `createFamily()`.
5. Acceptance resets household-scoped query state, adopts the returned household, marks the
   local onboarding gate complete, and enters Family.

The public preview is an allowlist: household name, inviter display name, offered role, and
expiry only. It never returns member emails, child names, birth dates, or the token. Possession
of a preview link grants no household access; acceptance still requires authentication,
adult attestation, optional email-lock matching, and a usable single-use token.

## Navigation and access policy

- `/invite/:token` is the only inbound household route available to guests and signed-in users
  who have not completed onboarding.
- `/invite` remains a ready-user-only outbound invitation screen.
- Terms and Privacy documents are public so a recipient can read them before consenting.
- The public invite and legal gateways remain permitted during transient identity resolution so
  a cold deep link or post-auth return target is not removed with the private route groups.
- Auth return targets use a least-privilege allowlist: only one-segment `/invite/:token` paths
  survive auth. External, protocol-relative, malformed, and unrelated routes fall back to `/`.
- Sign-in and sign-up links preserve the same sanitized target. Clerk-decorated absolute URLs
  retain their path and search parameters.

The shared HTTPS invite URL also needs a web handoff instead of a 404. The web route previews
the invite and offers an explicit `bumpatlas://invite/:token` app-opening action. Verified
universal/app links remain a deployment task because the repository does not yet declare a
production domain or store destinations.

## Legal and identity boundary

The invite coordinator records `age_attestation`, `terms`, and `privacy` using the current
client policy version before acceptance. Each consent write is server-timestamped and
idempotent by user, policy, and version.

`GET /api/me` runs before acceptance to refresh the local identity projection. Authorization
does not trust that projection: the accept route resolves the account's current verified Clerk
addresses only when a preflight identifies an active email-bound invite, then passes those
directly into the constant-time email-lock comparison. The locked transaction re-checks the
boundary and fails closed if the preflight races. Unverified, removed, and stale mirrored
addresses cannot satisfy an email-bound invite; unbound invites do not inherit Clerk latency.

The policy evidence version and the revision date displayed by the legal screens come from one
client policy definition. This prevents storing a version that does not identify the copy the
recipient actually read.

Server-derived `onboardingCompletedAt` remains read-only. The existing completion predicate
runs after acceptance and succeeds only when the invited household already has a child or an
active pregnancy in addition to the required legal records. The client local gate may be
completed from the successful family response because that response proves active membership.

## Invite mutation integrity

Invitation acceptance is both a permission boundary and a retry boundary:

- The invite row stays locked while it is consumed, so only one recipient wins.
- Acceptance writes an idempotency record in the same transaction as membership, default
  household, notification defaults, audit evidence, and invite consumption. The token hash is
  the sole operation key, so a response-loss retry does not become a false 410.
- Replays re-prove active membership before returning household data.
- Replays rerun the idempotent onboarding completion projection, closing the crash window between
  the committed acceptance transaction and post-transaction completion.
- An already-active member of the target household cannot consume another invite to replace
  their role. This closes self-promotion and owner-demotion paths. A removed member may still
  reactivate through a fresh invite.
- A recipient-row lock serializes different invite tokens competing for the same membership, so
  only one token is consumed and the winning role is deterministic rather than last-writer-wins.
- Consumed and expired public previews return the same error, and API request-log serializers
  redact bearer invite tokens from preview and acceptance URLs.

## Household context switch

React Query keys currently describe an implicit "current household" rather than including a
family ID. Accepting an invite changes that tenant context. The mutation must remove cached
household projections before seeding the returned family; ordinary invalidation can briefly
render data from the prior household.

Pending offline memory drafts are scoped to both the authenticated Clerk user and the household
that was active when the draft was created. `CreateMemoryInput` requires that explicit
`familyId`; the server proves active membership and contribution permission against that named
household instead of resolving the caller's mutable default. Idempotency hashes include the
target, so a retry after another device changes the default cannot be replayed into the new
household. Signed media-upload requests carry and authorize the same target, so a photo cannot
consume quota in a newly selected default before the explicitly targeted memory is created. A
draft without a valid target is unknown state and is never uploaded. A cold offline capture with
no previously verified household context is refused rather than guessed.

A user with queued drafts must still not switch households through this screen until those drafts
are synced or explicitly cleared. The server-side target removes the data-isolation failure; the
barrier also prevents local work from becoming hidden behind a newly selected household.
Acceptance and account switching remain disabled until persistent draft hydration completes and
any in-flight sync finishes. Deletion requires an explicit destructive confirmation and uses a
serialized durability barrier: the device-store clear must succeed before the in-memory queue is
emptied, and an older read-modify-write cannot resurrect drafts after that commit point.
Filesystem read, parse, and write failures remain unknown/non-empty state rather than being
coerced to success. The screen offers retry or a strict confirmed clear; neither household
acceptance nor account switching proceeds until one establishes an authoritative empty queue.
New drafts are acknowledged only after their serialized device-store upsert succeeds; the
"saved locally" state is never driven by a fire-and-forget write. Capture uses a synchronous
single-flight guard and locks the action after success so repeated taps cannot create distinct
durable drafts for the same moment.
Draft files are namespaced by the authenticated Clerk user. App state is readable and flushable
only when its hydrated owner matches the current session, and a flush uses the token captured for
that owner. Signing out therefore retains the first user's queue without exposing or uploading it
as the next user; account deletion strictly clears that owner&apos;s local queue.

This unreleased MVP uses one canonical, unversioned draft format. There is no draft migration
code. Every persisted draft must contain its owner-scoped storage identity and explicit household
target; malformed data is rejected rather than guessed.

## Error behavior

- Invalid or expired previews stay on the invite screen and ask for a new link.
- Email mismatch stays in invite context and explains that the recipient must use the addressed
  account; it must not be converted into the global generic no-access route. The screen exposes a
  return-target-preserving account switch.
- Session expiry still follows the global cache-clear flow, but the public recovery screen signs
  out the stale Clerk session and carries the invite target into sign-in again.
- Consent, account-sync, acceptance, and network failures do not mark onboarding complete and
  remain retryable.
- A consumed invite is reported as expired to a different recipient, preserving the existing
  non-disclosure behavior.

## Rejected alternatives

### Put a token field inside normal onboarding

This duplicates the existing invite endpoint, mixes household creation with household joining,
and still cannot preserve a link through auth cleanly.

### Let a caregiver create a household first and switch later

This leaves an owner household and related entitlement rows behind, creates ambiguous default
family state, and makes local caches vulnerable to cross-household data bleed.

### Store only an in-memory post-auth callback

This works for the shortest password path but is fragile across sign-in/sign-up switching and
OAuth. A URL-carried, sanitized target is inspectable and testable; persistent intent can be
added later if process-death recovery proves necessary.

## Test boundary

- Pure native tests cover route capabilities, safe return-target parsing, auth route builders,
  creator roles, consent ordering, failure behavior, and household-cache reset selection.
- Server integration tests cover public preview minimization, invite-first completion,
  idempotent response-loss retry, role-preservation, removed-member reactivation, the existing
  expiry/email boundaries, and explicit-family memory authorization after a default-family
  change.
- Type checks cover native and web route integration. The full repository unit and integration
  suites remain the completion gate.

## Out of scope

- New invite request/response shapes or a client-writable completion flag.
- A general multi-household switcher.
- App Store / Play Store publishing and verified universal-link association files.
- Community consent, weekly-summary consent, goal selection, or notification customization for
  an invited caregiver.
