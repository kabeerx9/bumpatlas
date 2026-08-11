# Invite-first caregiver onboarding implementation plan

> Leave every change unstaged and uncommitted for review.

**Goal:** Make an inbound household invite a complete guest-to-member onboarding path without
creating a second household or leaking prior household state.

**Architecture:** Keep existing family/consent contracts. Add a public allowlisted preview,
invite-only auth return target, dependency-injected join coordinator, and tenant-context cache
reset. Harden the existing acceptance transaction while it is in scope.

## Task 1: Define the access and auth-return contracts

**Files**

- Modify: `apps/native/hooks/app-access-state.ts`
- Modify: `apps/native/hooks/useAppAccess.ts`
- Modify: `apps/native/app/_layout.tsx`
- Modify: `apps/native/features/auth/utils/navigation.ts`
- Modify: `apps/native/navigation/routes.ts`
- Modify: `apps/native/features/auth/screens/sign-in-screen.tsx`
- Modify: `apps/native/features/auth/screens/sign-up-screen.tsx`
- Modify: `apps/native/features/auth/components/google-sign-in-button.tsx`
- Test: `scripts/onboarding-preview.test.ts`
- Create: `scripts/auth-navigation.test.ts`

1. Write failing tests for guest/familyless/ready invite access and loading-state isolation: only
   the public invite/legal gateways remain permitted while identity resolves.
2. Write failing tests for invite-only return-target parsing, encoded auth URLs, encoded invite
   tokens, and preservation of decorated URL search parameters.
3. Run the two focused scripts and observe the expected failures.
4. Add pure capabilities and auth-navigation helpers.
5. Move only inbound invite acceptance and legal documents outside the ready-only stack.
6. Thread the sanitized target through password, MFA, sign-up, Google, and auth-mode links.
7. Re-run the focused scripts and native type check.

## Task 2: Make preview public but information-minimal

**Files**

- Modify: `apps/server/src/routes/v1/families.ts`
- Modify: `apps/native/lib/api/families.ts`
- Test: `apps/server/src/routes/v1/families.itest.ts`

1. Change the existing preview integration test to omit authentication and assert that no local
   recipient user is provisioned.
2. Assert the exact response allowlist and existing child/email/token non-disclosure.
3. Run the invite-pattern server integration test and observe 401.
4. Remove authentication from preview only; leave acceptance authenticated.
5. Re-run the focused integration test.

## Task 3: Harden invite acceptance

**Files**

- Modify: `apps/server/src/services/invite.ts`
- Modify: `apps/server/src/routes/v1/families.ts`
- Test: `apps/server/src/routes/v1/families.itest.ts`

1. Add failing tests for response-loss replay, canonical operation identity, active-member
   self-promotion/owner-demotion denial, different-token concurrency, current verified-email
   authorization, public-preview non-disclosure, and removed-member reactivation.
2. Pass an idempotency writer into the locked acceptance transaction and use the token hash as
   the sole operation key.
3. Re-prove active membership before serving a replay and recover the concurrent same-key race
   by checking for the winning record after an error.
4. Lock the recipient row so different tokens cannot race the same membership; reject acceptance
   when the recipient already has an active membership in the target family;
   retain removed-member reactivation.
5. Resolve verified Clerk addresses only for active email-bound invites, fail closed when the
   locked row disagrees with the preflight, and redact tokens from request logs.
6. Re-run the focused invite integration tests and server type check.

## Task 4: Add the join-only client coordinator

**Files**

- Add: `apps/native/features/family/lib/complete-invite-onboarding.ts`
- Modify: `apps/native/lib/api/account.ts`
- Modify: `apps/native/lib/api/hooks.ts`
- Modify: `apps/native/features/family/screens/invite-accept-screen.tsx`
- Modify: `apps/native/lib/api/errors.ts` or override the invite mutation error handler locally
- Test: `scripts/invite-first-onboarding.test.ts`

1. Write failing dependency-injected coordinator tests for account sync, three ordered consent
   writes, acceptance, local completion only after success, and no `createFamily` dependency.
2. Add `GET /api/me` to the native account API and implement the minimal coordinator.
3. Add signed-out sign-up/sign-in actions and a signed-in current-policy legal checklist to the
   invite screen for every recipient.
4. Keep handled email mismatch/expired errors on the invite screen.
5. Await local onboarding completion, reset household context, and route to Family only after
   success.
6. Re-run the coordinator test and native type check.

## Task 5: Make household context switching explicit

**Files**

- Add: `apps/native/lib/api/family-context-cache.ts`
- Modify: `packages/contracts/src/v1/memories.ts`
- Modify: `apps/server/src/routes/v1/memories.ts`
- Modify: `apps/native/lib/drafts/memory-draft-store.ts`
- Modify: `apps/native/lib/drafts/flush-drafts.ts`
- Modify: `apps/native/lib/api/hooks.ts`
- Modify: `apps/native/features/family/screens/invite-accept-screen.tsx`
- Test: `apps/server/src/routes/v1/memories.itest.ts`
- Test: `scripts/invite-first-onboarding.test.ts`

1. Write a failing pure test listing every implicit-current-household query namespace that must
   be removed while preserving user-only content where safe.
2. Remove affected query entries before seeding the accepted family.
3. Block acceptance and account switching until drafts hydrate, no sync is in flight, and the
   queue is empty; allow only an explicitly confirmed clear from the invite screen.
4. Serialize full draft read-modify-write operations with destructive clearing, and commit the
   empty in-memory queue only after device storage deletion succeeds.
5. Treat read/parse/write failures as unknown state; expose retry and strict-clear recovery
   without allowing account or household switches meanwhile.
6. Namespace persisted queues by authenticated identity, reject stale hydration/flush commits,
   and pin in-flight uploads to the token captured for that queue owner.
7. Persist the intended household on each draft. Require `familyId` on memory creation and prove
   active membership plus contribution permission against that explicit target on the server.
8. Apply the same explicit target and permission check to signed media uploads, binding photo
   quota and memory creation to one household.
9. Reject corrupt drafts without a household target instead of resolving the current default at
   flush time, and acknowledge a new local draft only after its serialized upsert.
10. Re-run focused ownership/interleaving/failure tests, server integration tests, and native
    type check.

## Task 6: Remove the false creator-caregiver branch

**Files**

- Add: `apps/native/features/onboarding/lib/onboarding-role.ts`
- Modify: `apps/native/features/onboarding/components/steps/role-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/profile-step.tsx`
- Modify: `apps/native/features/onboarding/lib/album-scene-model.ts`
- Modify: `apps/native/features/onboarding/components/onboarding-album-scene.tsx`
- Modify: `apps/native/features/onboarding/screens/onboarding-screen.tsx`
- Modify: `apps/native/features/shared/providers/app-state-provider.tsx`
- Test: `scripts/onboarding-album-scene.test.ts`

1. Add a failing assertion that creator onboarding exposes only Expecting and Parent.
2. Move that role tuple/type into a pure module.
3. Remove unreachable partner-specific profile, album, and family-creation behavior.
4. Re-run onboarding model tests and native type check.

## Task 7: Add the HTTPS-to-app handoff

**Files**

- Add: `apps/web/src/routes/invite.$token.tsx`
- Modify: `apps/web/src/lib/api.ts`
- Generated: `apps/web/src/routeTree.gen.ts`

1. Add the public preview API to the web client.
2. Render the minimal invite identity and an explicit custom-scheme app-opening link.
3. Render invalid/expired and loading states without exposing the token in visible copy.
4. Run the web build/type check so the route tree regenerates and validates.

## Task 8: Full verification and review

Run:

```bash
node --import tsx --test \
  scripts/auth-navigation.test.ts \
  scripts/invite-first-onboarding.test.ts \
  scripts/onboarding-preview.test.ts \
  scripts/onboarding-album-scene.test.ts

pnpm --filter server exec node --env-file=.env.test --import tsx --test \
  --test-concurrency=1 --test-name-pattern="invites" src/routes/v1/families.itest.ts

pnpm --filter native check-types
pnpm --filter server check-types
pnpm --filter web check-types
pnpm test
pnpm test:integration
git diff --check
git status --short
```

Separate commands that actually passed from paths assessed by reasoning only. Keep the earlier
Testing-tab cleanup isolated in the final file map and do not stage or commit anything.
