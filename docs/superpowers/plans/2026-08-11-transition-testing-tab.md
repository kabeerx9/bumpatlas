# Transition Testing Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible Testing tab that demonstrates a continuous image transition from a source card into a bottom sheet.

**Architecture:** The tab screen measures source, root, and destination frames in one React Native hierarchy. A temporary Reanimated image interpolates between those frames while the sheet and backdrop enter; React state owns the interaction phase so repeated taps cannot overlap.

**Tech Stack:** Expo Router, React Native 0.86, Reanimated 4.5, react-native-worklets, Node test runner.

## Global Constraints

- Add `Testing` immediately after `Family`; do not use a feature flag.
- Reuse the local expecting keepsake asset; do not add a network request or persistence.
- Do not use experimental shared-element APIs or a third-party sheet dependency.
- Respect Reduce Motion and preserve a minimum 44-point close target.
- Do not commit or push without a separate user request.

---

### Task 1: Transition geometry contract

**Files:**
- Create: `scripts/shared-image-transition.test.ts`
- Create: `apps/native/features/testing/lib/transition-geometry.ts`

**Interfaces:**
- Produces: `Frame`, `clampProgress(progress)`, and `interpolateFrame(from, to, progress)`.

- [ ] **Step 1: Write failing geometry tests**

  Cover literal start, midpoint, end, and progress clamping expectations. These tests catch reversed coordinates, incorrect size interpolation, and overshoot.

- [ ] **Step 2: Verify the tests fail for the missing module**

  Run `node --import tsx --test scripts/shared-image-transition.test.ts` and confirm a module-not-found failure.

- [ ] **Step 3: Implement the minimal pure geometry helper**

  Clamp progress to `[0, 1]` and linearly interpolate `x`, `y`, `width`, and `height`.

- [ ] **Step 4: Verify the geometry tests pass**

  Run `node --import tsx --test scripts/shared-image-transition.test.ts`.

### Task 2: Measured shared-image sheet

**Files:**
- Create: `apps/native/features/testing/screens/transition-testing-screen.tsx`

**Interfaces:**
- Consumes: `Frame` and `interpolateFrame(from, to, progress)`.
- Produces: `TransitionTestingScreen`.

- [ ] **Step 1: Build the screen around an explicit transition phase**

  Use `closed | measuring | opening | open | closing`, root/source/destination refs, and `measureInWindow`. Convert window frames to root-relative coordinates before animation.

- [ ] **Step 2: Add the same-tree backdrop and sheet**

  Render the bottom sheet absolute in the screen hierarchy, block underlying touches, add backdrop dismissal and a labelled 44-point close control, and reserve a wide destination image frame.

- [ ] **Step 3: Add the Reanimated handoff**

  Drive overlay frame, radius, backdrop opacity, and sheet translate/opacity from one progress shared value. Use `scheduleOnRN` for animation completion, lock re-entry by phase, and fade instead of morphing when Reduce Motion or measurement fallback applies.

### Task 3: Route registration and verification

**Files:**
- Create: `apps/native/app/(tabs)/testing.tsx`
- Modify: `apps/native/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `TransitionTestingScreen`.
- Produces: Expo Router route `testing` and the sixth custom tab item.

- [ ] **Step 1: Register the Testing route after Family**

  Add the `testing` icon mapping, the route component, and the `Tabs.Screen` entry after `family`.

- [ ] **Step 2: Run automated verification**

  Run the focused geometry test, native type-check, and `git diff --check`.

- [ ] **Step 3: Verify in iOS Simulator**

  Confirm all six tabs fit, open reaches the settled sheet, both close paths reverse cleanly, and repeated taps do not overlap transitions.
