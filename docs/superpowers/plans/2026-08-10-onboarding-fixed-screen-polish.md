# Onboarding Fixed-Screen Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-like album container with a true two-page spread that detaches into an editorial sheet after Profile, while fitting every onboarding step into a 360 × 640 logical-pixel viewport without page-level scrolling.

**Architecture:** `OnboardingScreen` continues to own form state and side effects. The pure album scene model gains a phase derived from the active stage; the stable Reanimated scene keeps its cover, left page, right page, fold, thread, and keepsake mounted while transforms move the right page from bound spread to detached sheet. The shell uses a fixed flex composition, while dense steps use compact controls designed for the available height.

**Tech Stack:** Expo 57, React Native 0.86, Reanimated 4.5, TypeScript 6, Node test runner.

## Global Constraints

- All eight resting states fit a 360 × 640 logical-pixel viewport without page-level scrolling.
- The software keyboard is the only permitted temporary overflow case; fields remain reachable through keyboard avoidance.
- Keep `FEATURES.onboardingPreview` enabled and side-effect free.
- Do not add animation or rendering dependencies.
- Preserve accessibility roles, states, Dynamic Type behavior, and 44-point minimum touch targets.
- Do not alter backend contracts or the partner/caregiver workflow.
- Do not commit or push; leave changes unstaged for review.

---

### Task 1: Encode the album-to-editorial phase boundary

**Files:**
- Modify: `apps/native/features/onboarding/lib/album-scene-model.ts`
- Modify: `scripts/onboarding-album-scene.test.ts`

**Interfaces:**
- Consumes: `AlbumStage`.
- Produces: `AlbumScenePhase = "spread" | "focus" | "editorial" | "today"` and `phase` on `AlbumSceneModel`.

- [ ] **Step 1: Write the failing phase tests**

```ts
assert.equal(modelFor("household").phase, "spread");
assert.equal(modelFor("profile").phase, "focus");
assert.equal(modelFor("goal").phase, "editorial");
assert.equal(modelFor("complete").phase, "today");
```

- [ ] **Step 2: Run the focused test**

Run: `node --import tsx --test scripts/onboarding-album-scene.test.ts`

Expected: FAIL because `phase` is absent.

- [ ] **Step 3: Implement the phase derivation**

Map Welcome through Household to `spread`, Profile to `focus`, Goal through Invite to `editorial`, and Complete to `today`. Keep the mapping pure and exhaustive.

- [ ] **Step 4: Re-run the focused test**

Expected: PASS.

### Task 2: Replace the fake container with one continuous physical scene

**Files:**
- Modify: `apps/native/features/onboarding/components/onboarding-album-scene.tsx`

**Interfaces:**
- Consumes: `AlbumSceneModel.phase`.
- Produces: one stable visual tree with `cover`, `leftPage`, `activePage`, `centerFold`, `thread`, `artifact`, `chapterTabs`, `inviteFrame`, and `todayCard` layers.

- [ ] **Step 1: Replace the rounded card/gutter silhouette**

Render a sage cover behind two independent ivory page views. Position the center fold between the pages using layered shadow/highlight strips. Remove the internal left binding gutter and do not wrap the spread in another visible card.

- [ ] **Step 2: Animate the phase transition on the stable tree**

Drive cover, left page, active page, and fold from the existing shared stage progress. Through Household, show the full spread. At Profile, widen the active page and recede the left page. At Goal, move the left page and fold out, expand the active page, and leave the cover subtly offset beneath it. Reverse those transforms on Back.

- [ ] **Step 3: Recompose persistent objects**

Keep the selected keepsake on the active page throughout. Reposition household/profile labels without scaling text. Reveal chapter tabs only after detachment. Preserve the thread as the relationship line across both phases.

- [ ] **Step 4: Verify Reduced Motion**

When `useReducedMotion()` is true, assign the destination stage immediately. The same final scene state must remain legible without spatial motion.

- [ ] **Step 5: Run native typecheck and bundle export**

Run:

```bash
(cd apps/native && npm run check-types)
npx expo export --platform ios --output-dir /tmp/bumpatlas-onboarding-polish
```

Expected: both exit 0.

### Task 3: Convert all eight steps to fixed-height compositions

**Files:**
- Modify: `apps/native/features/onboarding/components/onboarding-shell.tsx`
- Modify: `apps/native/features/onboarding/screens/onboarding-screen.tsx`
- Modify: `apps/native/features/onboarding/components/selection-option.tsx`
- Modify: `apps/native/features/onboarding/components/steps/welcome-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/privacy-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/role-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/household-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/profile-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/goal-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/notifications-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/invite-step.tsx`
- Modify: `apps/native/features/onboarding/components/steps/completion-step.tsx`

**Interfaces:**
- `OnboardingShell` consumes `scenePhase: AlbumScenePhase` and assigns phase-specific scene height.
- `SelectionOption` consumes optional `compact?: boolean` for dense role/goal layouts.

- [ ] **Step 1: Remove page-level scrolling**

Replace the question `ScrollView` with a flex `View`. Keep `KeyboardAvoidingView` for Profile. The shell owns fixed top-bar, scene, body, and footer regions.

- [ ] **Step 2: Compact the shell chrome**

Reduce top-bar, scene-to-body, and footer vertical padding while keeping buttons at least 44 points high. Use a smaller scene height for editorial stages than spread stages.

- [ ] **Step 3: Compact role and goal choices**

Add `compact` selection rows with 44–52 point height, smaller icon containers, and one-line descriptions. Use them only in onboarding’s dense lists.

- [ ] **Step 4: Simplify privacy and notifications**

Reduce privacy summary to two concise bullets while preserving Terms and Privacy controls and links. Group notification preferences as one bordered list with compact rows and switches rather than six separate cards.

- [ ] **Step 5: Simplify invite and completion**

Remove the oversized dark invite hero and redundant perks card. Use one heading, one supporting sentence, and two compact trust points. Keep completion similarly concise.

- [ ] **Step 6: Tighten welcome, household, and profile copy**

Keep one heading and one short support sentence per step. Reduce field margins while preserving input height and labels.

- [ ] **Step 7: Run all focused verification**

Run:

```bash
node --import tsx --test scripts/onboarding-album-scene.test.ts scripts/onboarding-preview.test.ts
(cd apps/native && npm run check-types)
git diff --check
```

Expected: tests pass, typecheck exits 0, and no whitespace errors appear.

- [ ] **Step 8: Report manual verification boundary**

Confirm automated checks separately from device layouts not directly observed. Keep all work unstaged and uncommitted.
