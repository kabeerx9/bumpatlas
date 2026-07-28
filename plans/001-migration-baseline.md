# Plan 001: Freeze migration baseline and dependency decisions

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- package.json package-lock.json App.tsx index.js app.json android/app/build.gradle android/app/src/main/AndroidManifest.xml ios/Goreeva.xcodeproj/project.pbxproj ios/Goreeva_Native/Info.plist src`
> If any in-scope file changed since this plan was written, compare the "Current state" facts below against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

This migration has two risks: app-store identity and native dependency churn. Before moving code into the fresh Expo template, create a written inventory that every later agent must follow. The inventory prevents one agent from keeping Firebase/Notifee while another replaces them, or one agent replacing MMKV while another expects login persistence. This repo is the source app for reference; it is not the Expo target.

## Current state

- `package.json:13-66` contains the native dependency surface. Notable native modules: Notifee, React Native Firebase app/analytics/messaging, Sentry, blob-util, Cashfree, date picker, device info, document picker, image picker, MMKV, PDF, push-notification, restart, vector-icons, webview.
- `App.tsx:1-18` imports Notifee, Firebase Messaging, Sentry, NativeBase, React Navigation providers, local notifications, MMKV, and app update wrapper at the root.
- `src/storage/mmkvStorage.ts:35-38` defines the MMKV instance that must be preserved for the first Expo update. Do not copy secret/key material into plans or logs; read it from the source file during implementation.
- `android/app/build.gradle:87-93` sets `namespace`, `applicationId`, `versionCode`, and `versionName`.
- `ios/Goreeva.xcodeproj/project.pbxproj:552-568` and `590-605` set production iOS build number, marketing version, team, and bundle identifier.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inventory files | `rg --files -g '!node_modules/**' -g '!ios/Pods/**' -g '!android/.gradle/**'` | Lists repo files |
| Native dependency usage | `rg "@react-native-firebase|notifee|cashfree|blob-util|pdf|mmkv|device-info|document-picker|image-picker|date-picker|fast-image|push-notification|restart|Sentry|sentry" src App.tsx index.js -n` | Shows usage sites |
| Screen count | `find src/screens -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.js' -o -name '*.jsx' \\) | wc -l` | Around 47 screen files unless repo changed |

## Scope

**In scope**:
- Create or update `plans/migration-inventory.md`.
- Update `plans/README.md` status row for this plan.
- Read this RN CLI repo to identify required behavior, APIs, native identity, and migration risks.

**Out of scope**:
- Do not edit source code.
- Do not install Expo or change dependencies.
- Do not delete `ios/` or `android/`.
- Do not make final library decisions without the owner's Expo template constraints and approval.

## Steps

### Step 1: Create the dependency inventory

Create `plans/migration-inventory.md` with a table:

| Package/feature | Current files using it | Decision | Expo replacement/config | First-release requirement |

Start with these candidate decisions, then update them to match the owner's Expo template choices:
- `@react-native-firebase/app`, `@react-native-firebase/messaging`, `@notifee/react-native`, `react-native-push-notification`: likely replace with `expo-notifications` for new push token registration and notification display.
- `@react-native-firebase/analytics`: owner decision; defer or replace with an Expo-compatible analytics strategy unless required by the business.
- `react-native-cashfree-pg-sdk`, `cashfree-pg-api-contract`: defer based on owner direction; do not block the first Expo production update.
- `react-native-mmkv`: strongly prefer keeping for first release with the same instance config as current app, unless the owner accepts a logout/storage migration risk.
- `react-native-document-picker`, `react-native-image-picker`: likely replace with the owner's selected Expo-compatible file/image picker libraries.
- `react-native-device-info`: likely replace with an Expo-compatible version/build API such as `expo-application`.
- `react-native-restart`: remove or replace with a UX fallback; do not add custom native restart code for first release.
- `react-native-vector-icons`: likely use the template's icon system; preserve icon families/names where practical.
- `react-native-webview`: keep if the Expo template supports it.
- `react-native-pdf` and `react-native-blob-util`: decide in Plan 006 based on the template's capabilities and product requirements.

**Verify**: `sed -n '1,220p' plans/migration-inventory.md` -> the table exists and includes every native package listed above.

### Step 2: Record production identity facts

Add a "Production identity" section to `plans/migration-inventory.md`:
- Android package/application ID: `com.goreeva_native`.
- Android current versionCode/versionName source: `android/app/build.gradle:87-93`.
- iOS bundle ID: `com.goreeva.goreeva`.
- iOS current build/marketing version source: `ios/Goreeva.xcodeproj/project.pbxproj:552-568` and `590-605`.
- Deep-link scheme: `goreeva-student`, from `android/app/src/main/AndroidManifest.xml:35-40` and `ios/Goreeva_Native/Info.plist:97-107`.
- App link hosts currently differ: Android manifest has `app.goreeva.com`, JS linking prefixes include `student.goreeva.com`; flag this for Plan 008 validation.

**Verify**: `rg "com.goreeva_native|com.goreeva.goreeva|goreeva-student|app.goreeva.com|student.goreeva.com" plans/migration-inventory.md` -> all values appear.

### Step 3: Update the plan index

Mark Plan 001 as DONE in `plans/README.md` after the inventory exists.

**Verify**: `rg "001 .* DONE|001\\|.*DONE" plans/README.md` -> one status row for Plan 001 is DONE.

## Test plan

This is a planning-only phase. No app tests are expected.

## Done criteria

- [ ] `plans/migration-inventory.md` exists.
- [ ] Every native dependency from `package.json:13-66` has a decision.
- [ ] Production identity and version facts are documented.
- [ ] No source files outside `plans/` are modified.

## STOP conditions

- The owner decides Cashfree must ship in the first Expo release.
- The current production app IDs differ from those listed here.
- The Expo template already has incompatible package decisions that cannot be changed by the migration owner.

## Maintenance notes

Every later plan should treat `plans/migration-inventory.md` as the package decision source. If a later agent needs to change a decision, update the inventory and explain why in that plan's status notes.
