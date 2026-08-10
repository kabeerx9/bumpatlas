# Living Memory Album Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static onboarding presentation with a persistent, semantically animated living-memory-album scene while preserving the existing onboarding contracts and final-write boundary.

**Architecture:** `OnboardingScreen` remains the owner of form state and side effects. A pure model maps the active step and answers into a serializable scene model; one mounted `OnboardingAlbumScene` renders and animates the keepsake, thread, chapter tabs, and Today-shaped completion. Reanimated 4 drives in-route transforms; no navigation shared-element library is introduced.

**Tech Stack:** Expo 57, React Native 0.86, Reanimated 4.5, React Native Worklets, Node test runner, TypeScript 6.

## Global Constraints

- Keep `FEATURES.onboardingPreview` enabled for local review.
- Preview mode performs no server read/write, SecureStore completion write, push permission request, or navigation.
- Real onboarding performs mutations and push registration only from final submission.
- Do not add Rive, Lottie, Skia, or experimental Reanimated Shared Element Transitions.
- Respect system Reduced Motion.
- Do not redesign backend contracts or the unresolved partner/caregiver invite workflow.
- Do not commit or push; leave changes unstaged for review.

---

### Task 1: Pure scene model and completion state

**Files:**
- Create: `apps/native/features/onboarding/lib/album-scene-model.ts`
- Create: `scripts/onboarding-album-scene.test.ts`

**Interfaces:**
- Consumes: existing `OnboardingRole`, `OnboardingGoal`, and onboarding step identifiers.
- Produces: `AlbumStage`, `AlbumDirection`, `ArtifactKey`, `ChapterKey`, `AlbumSceneModel`, `deriveAlbumSceneModel()`, and `nextAlbumDirection()`.

- [ ] **Step 1: Write failing tests for semantic mapping**

```ts
assert.deepEqual(
  deriveAlbumSceneModel({
    stage: "profile",
    direction: "forward",
    role: "expecting",
    householdName: "The Rivera family",
    childName: "",
    childDob: "",
    dueDate: "2026-11-18",
    goal: "memories",
  }),
  {
    stage: "profile",
    direction: "forward",
    artifact: "expecting",
    chapter: "memories",
    householdLabel: "The Rivera family",
    profileLabel: "Due Nov 18, 2026",
  },
);
```

Also cover parent/caregiver artifact keys, absent answers, chapter mapping, and forward/back direction.

- [ ] **Step 2: Run the focused test and verify the missing module fails**

Run: `node --import tsx --test scripts/onboarding-album-scene.test.ts`

Expected: FAIL because `album-scene-model.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure model**

```ts
export type AlbumStage =
  | "welcome"
  | "privacy"
  | "role"
  | "household"
  | "profile"
  | "goal"
  | "notifications"
  | "invite"
  | "complete";

export function deriveAlbumSceneModel(input: AlbumSceneInput): AlbumSceneModel {
  return {
    stage: input.stage,
    direction: input.direction,
    artifact: input.role ?? "unselected",
    chapter: input.goal,
    householdLabel: input.householdName.trim() || "Our household",
    profileLabel: deriveProfileLabel(input),
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --import tsx --test scripts/onboarding-album-scene.test.ts`

Expected: PASS.

### Task 2: Cohesive prototype keepsake assets

**Files:**
- Create: `apps/native/assets/onboarding/expecting-keepsake.png`
- Create: `apps/native/assets/onboarding/parent-keepsake.png`
- Create: `apps/native/assets/onboarding/caregiver-keepsake.png`

**Interfaces:**
- Produces: three local `require()`-compatible raster assets with identical aspect ratio and art direction.

- [ ] **Step 1: Generate the three prototype assets**

Use the approved living-memory-album direction: warm ivory, sage, muted clay, linen paper, adult-facing editorial composition, no identifiable faces, no text, and no cartoon objects.

- [ ] **Step 2: Inspect each generated image**

Verify subject, crop, lighting, palette, and safe central framing. Reject any image with malformed anatomy, readable generated text, medical gore, or mismatched visual treatment.

- [ ] **Step 3: Copy selected assets into the native bundle**

Keep the same pixel dimensions and portrait aspect ratio for all three assets. Preserve source outputs outside the repo; add only selected derivatives to `apps/native/assets/onboarding/`.

### Task 3: Persistent album scene

**Files:**
- Create: `apps/native/features/onboarding/components/onboarding-album-scene.tsx`
- Modify: `apps/native/features/onboarding/components/onboarding-shell.tsx`

**Interfaces:**
- Consumes: `model: AlbumSceneModel`.
- Produces: `OnboardingAlbumScene`, a presentation-only component with no callbacks or side effects.
- `OnboardingShell` adds `scene?: ReactNode` and keeps that scene mounted above its body.

- [ ] **Step 1: Add a compile-time scene fixture before the component exists**

Add a temporary import/use in `OnboardingShell` or the focused model test so TypeScript requires the planned `OnboardingAlbumScene` interface, then run native typecheck.

Run: `pnpm --filter native check-types`

Expected: FAIL because the component/interface does not exist.

- [ ] **Step 2: Implement the scene’s stable native layer tree**

The component contains one mounted tree:

```tsx
<View style={styles.scene}>
  <Animated.View style={albumPageStyle} />
  <Animated.View style={threadStyle} />
  <Animated.View style={artifactStyle}>
    <Animated.Image source={artifactSource} style={styles.artifactImage} />
    <Animated.View style={profileCopyStyle}>...</Animated.View>
  </Animated.View>
  <Animated.View style={chapterTabsStyle}>...</Animated.View>
  <Animated.View style={inviteFrameStyle}>...</Animated.View>
  <Animated.View style={todayCardsStyle}>...</Animated.View>
</View>
```

Use native views for paper, frames, ribbon, chapter tabs, labels, and Today cards. Only the keepsake image is raster.

- [ ] **Step 3: Drive stage changes with one shared progress value**

Map `AlbumStage` to ordered numeric positions. On model stage changes, animate `progress.value` with `withTiming` and a restrained easing. Derive artifact position, dimensions, rotation, thread reveal, tab reveal, invite frame, and completion layout with `interpolate`.

Use `useReducedMotion()` to select immediate/crossfade behavior. Do not use bouncy presets. Never use `runOnJS`; if a worklet must notify React, use `scheduleOnRN` from `react-native-worklets`.

- [ ] **Step 4: Make role artwork swap inside the stable wrapper**

The artifact wrapper stays mounted. When `artifact` changes, crossfade the image content while keeping the wrapper’s identity and frame stable.

- [ ] **Step 5: Mount the scene through `OnboardingShell`**

Place the scene between the top bar and scrollable question body. Use a fixed maximum height with a smaller compact height for short screens and keyboard-heavy profile states. The scene must not cover form controls or the footer.

- [ ] **Step 6: Run native typecheck**

Run: `pnpm --filter native check-types`

Expected: PASS.

### Task 4: Integrate semantic state and completion into onboarding

**Files:**
- Modify: `apps/native/features/onboarding/screens/onboarding-screen.tsx`
- Modify: `apps/native/features/onboarding/components/steps/welcome-step.tsx`
- Modify: `apps/native/features/onboarding/components/onboarding-shell.tsx`
- Test: `scripts/onboarding-album-scene.test.ts`

**Interfaces:**
- Consumes: `deriveAlbumSceneModel()` and `OnboardingAlbumScene`.
- Produces: preview-visible `complete` stage, explicit restart, and final-only push registration.

- [ ] **Step 1: Add failing completion behavior tests**

Extract/test a pure `resolveOnboardingCompletion(preview: boolean)` result:

```ts
assert.equal(resolveOnboardingCompletion(true), "show-preview-completion");
assert.equal(resolveOnboardingCompletion(false), "submit-and-show-completion");
```

Run the focused test and observe the expected failure.

- [ ] **Step 2: Track transition direction and construct the scene model**

Store `direction` when `goNext()` or `goBack()` runs. Derive the scene model from the current step and existing form state with `useMemo`. Pass it to the shell’s stable `scene` slot.

- [ ] **Step 3: Replace the welcome hero duplication**

Remove the remote Unsplash hero from `WelcomeStep`; the mounted album scene becomes the visual anchor. Keep welcome copy and age attestation accessible.

- [ ] **Step 4: Add the explicit completion stage**

Preview final action changes to `complete` without calling APIs. The completion UI exposes `Restart preview`, which resets step index and form values only when pressed.

Real final action performs `applyOnboardingProfile()`, then shows the completion state. After the match-cut duration it calls `completeOnboarding()` and routes to Today. A submission failure preserves values and remains retryable.

- [ ] **Step 5: Move push registration to final submission**

Remove `enablePushAndRegister()` from advancing beyond Notifications. Invoke it non-blockingly from the successful real final action. Never invoke it in preview.

- [ ] **Step 6: Keep legal and form controls stable**

Question content may use a restrained forward/back fade/translation, but legal controls, inputs, toggles, and navigation buttons do not morph.

- [ ] **Step 7: Run focused tests and native typecheck**

Run:

```bash
node --import tsx --test scripts/onboarding-album-scene.test.ts scripts/onboarding-preview.test.ts
pnpm --filter native check-types
```

Expected: all pass.

### Task 5: Full verification and manual review handoff

**Files:**
- Verify all modified files and generated assets.

- [ ] **Step 1: Run repository tests**

Run: `pnpm test`

Expected: exit 0 with no failed tests.

- [ ] **Step 2: Run diff hygiene checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only onboarding implementation, tests, assets, research/spec/plan, and visual-companion artifacts are present.

- [ ] **Step 3: Start the native dev server if it is not already running**

Use the repo’s existing `pnpm dev:native` workflow. Do not kill or replace a user-owned process without checking first.

- [ ] **Step 4: Manual tap-through**

Verify Welcome → Privacy → Role → Household → Profile → Goal → Notifications → Invite → Complete. Verify Back, keyboard/date interruption, each role asset, each goal tab, preview restart, and Reduce Motion.

- [ ] **Step 5: Report verification boundaries**

Separate automated verification from simulator/device paths that were not personally observed. Do not commit or push.
