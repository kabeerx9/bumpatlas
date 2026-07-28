# Plan 005: Migrate screens and wire API-backed CRUD/read flows

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- src/screens src/components src/hooks src/routes src/constants src/types src/Axios`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/004-providers-design-navigation.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

Most user value is in screen rendering and API-backed school data: dashboard, attendance, subjects, grades, announcements, homework, library, profile, SOA, and leave applications. The codebase is not huge, but moving everything blindly into the fresh Expo template makes regressions hard to find. This plan batches screens by route area with verification after each batch.

## Current state

- Recon found about 47 files under `src/screens`.
- Components live under `src/components`, including reusable cards, notifications, file selection UI, shimmer/loading components, and APQ detail cards.
- Data fetching uses axios client plus TanStack Query providers.
- `package.json:20-24` uses React Navigation stacks/drawers/tabs.
- `package.json:31-37` uses i18n, NativeBase, React Hook Form, and validation libraries.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` or Expo template lint command | exit 0 or known warnings |
| Screen list | `find <expo-target>/src/screens -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.js' -o -name '*.jsx' \\) | sort` | Migrated screens listed |
| Native usage scan | `rg "react-native-cashfree-pg-sdk|@react-native-firebase|@notifee/react-native|react-native-document-picker|react-native-image-picker|react-native-blob-util|react-native-pdf" <expo-target>/src -n` | Only deferred/allowed usages remain |

## Scope

**In scope**:
- `src/screens`, `src/components`, `src/hooks`, `src/constants`, `src/types`.
- API calls needed by migrated screens.
- Shimmer/loading/empty/error states.

**Out of scope**:
- Cashfree payment implementation.
- Notification implementation.
- Deep-link implementation.
- Large visual redesigns.
- Editing this RN CLI repo's source files.

## Steps

### Step 1: Migrate shared UI components first

Move components that many screens depend on:
- `src/components/Shimmer/*`
- `src/components/Button/*`
- `src/components/Card/*`
- `src/components/SubjectCard/*`
- `src/components/APQCard/*`
- `src/components/APQDetails/*`
- `src/components/common/*`
- `src/components/CustomAlert`, `ShowAlert`, `SubHeading`, `CategoryButton`

Replace icon imports with `@expo/vector-icons` where the inventory requires it. Keep icon families/names where possible.

**Verify**: `npx tsc --noEmit` -> no unresolved component imports.

### Step 2: Migrate core authenticated screens

Move and wire:
- Dashboard
- Profile
- Notifications list UI without Expo notification side effects
- Attendance
- Grades
- Announcement
- School calendar
- Teacher messages
- Homework planner

Each screen must keep its current API call behavior and loading/empty state.

**Verify**: manually open each route from drawer; no red screen; data loads or an expected empty/error state renders.

### Step 3: Migrate subject screens

Move and wire:
- My Subjects
- Subject home/details
- Subject announcement
- Subject grades/detail
- Modules
- Syllabus
- Homework
- Class tests
- Quizzes
- Assessments
- Projects
- People

Preserve route expectations around `subjectId`, `subjectName`, and `subjectColorObj` stored in MMKV.

**Verify**: select a subject from dashboard/My Subjects, then open each subject tab/section.

### Step 4: Migrate library, SOA, leave application, and file-dependent screens

Move:
- Library and issued tabs.
- SOA, fee details/logs, bus logs.
- Leave application UI.
- Previous exams.
- File viewer screens.

Stub or hide Cashfree payment button if payment is currently reachable. The user stated Cashfree is not required immediately. If the screen must keep a button, show a product-approved disabled/maintenance state, not a broken payment attempt.

**Verify**: `rg "react-native-cashfree-pg-sdk|CFPaymentGatewayService" <expo-target>/src -n` -> no active production import unless owner re-scoped payment.

### Step 5: Remove dead RN CLI-only imports from migrated code

Scan and replace/disallow:
- `@react-native-firebase/*` outside future analytics decisions.
- `@notifee/react-native`.
- `react-native-push-notification`.
- `react-native-restart`.
- Cashfree active imports.

Do not remove APIs owned by other plans, such as file picker/download/PDF, until Plan 006 handles them.

**Verify**: native usage scan command above -> only explicitly deferred modules remain.

## Test plan

- Manual route checklist for every drawer route and subject route.
- Login with a test account and load real data.
- Pull-to-refresh routes that use `RefreshControl`.
- Empty/error states by testing a school/account with minimal data if available.

## Done criteria

- [ ] Every route reachable in the old app has a corresponding route in Expo unless explicitly deferred.
- [ ] Cashfree is not active in first release.
- [ ] No screen imports Firebase/Notifee directly.
- [ ] Typecheck passes.
- [ ] Android dev build can navigate the main app without crashes.

## STOP conditions

- A screen requires a native dependency that is not in `plans/migration-inventory.md`.
- Payment is business-critical for first release.
- API contracts differ from current app assumptions.

## Maintenance notes

Do not optimize or redesign during this phase. Keep diffs boring so QA can compare old and new app behavior screen by screen.
