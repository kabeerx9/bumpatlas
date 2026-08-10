# Editorial Scene Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give onboarding steps 6–8 a 156-point editorial scene while preserving the 184-point opening album and the fixed, non-scrolling screen layout.

**Architecture:** Keep phase sizing in the pure album scene model and consume that value in the React Native scene. This makes spread versus editorial proportions explicit and regression-testable without snapshotting animation frames.

**Tech Stack:** TypeScript, React Native, Reanimated 4, Node test runner.

## Global Constraints

- Steps 1–5 remain 184 points tall.
- Goal, notifications, invite, and completion use one stable 156-point scene height.
- No API, persistence, notification, or navigation behavior changes.
- No new dependency.
- Do not commit or push unless the user asks.

---

### Task 1: Phase-level scene height

**Files:**
- Modify: `apps/native/features/onboarding/lib/album-scene-model.ts`
- Modify: `apps/native/features/onboarding/components/onboarding-album-scene.tsx`
- Test: `scripts/onboarding-album-scene.test.ts`

**Interfaces:**
- Consumes: `AlbumScenePhase`
- Produces: `resolveAlbumSceneHeight(phase: AlbumScenePhase): 184 | 156`

- [x] **Step 1: Write the failing test**

```ts
assert.equal(resolveAlbumSceneHeight("spread"), 184);
assert.equal(resolveAlbumSceneHeight("focus"), 184);
assert.equal(resolveAlbumSceneHeight("editorial"), 156);
assert.equal(resolveAlbumSceneHeight("today"), 156);
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test scripts/onboarding-album-scene.test.ts`

Expected: FAIL because `resolveAlbumSceneHeight` is not exported.

- [x] **Step 3: Implement the phase contract and consume it**

```ts
export function resolveAlbumSceneHeight(phase: AlbumScenePhase): 184 | 156 {
  return phase === "editorial" || phase === "today" ? 156 : 184;
}
```

Apply the returned value to the scene container. Keep the detached page at 152 points and center it with a 2-point top inset, so the taller container adds balanced breathing room without stretching its contents.

- [x] **Step 4: Verify GREEN and native compilation**

Run: `node --import tsx --test scripts/onboarding-album-scene.test.ts scripts/onboarding-preview.test.ts`

Run: `npm run check-types` from `apps/native`.

Expected: all focused tests pass and TypeScript exits 0.

- [x] **Step 5: Verify the rendered result**

Use the local preview in iOS Simulator to inspect goal, notifications, and invite. Confirm the scene is taller, controls remain visible without scrolling, and the footer does not collide with content.

- [x] **Step 6: Verify the bundle and working tree**

Run: `npx expo export --platform ios --output-dir /tmp/bumpatlas-editorial-height-final`

Run: `git diff --check`

Expected: iOS export and whitespace validation exit 0. Leave changes unstaged and uncommitted.
