# Plan 009: Recreate soft/hard update config and release identity gates

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- src/services/app-update src/hoc/withAppUpdateReminder.tsx App.tsx android/app/build.gradle ios/Goreeva.xcodeproj/project.pbxproj package.json`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/002-expo-shell-native-config.md, plans/003-storage-api-auth.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

The app already has a backend-controlled update reminder. The Expo migration should preserve or improve this behavior, and also add hard gates that prevent accidentally submitting a build with the wrong package/bundle ID or version numbers.

## Current state

- `src/services/app-update/index.ts:12-26` fetches update config from `https://testapi.goreeva.com/api/update-app-alert/`.
- `src/services/app-update/index.ts:29-44` compares semantic version strings.
- `src/hoc/withAppUpdateReminder.tsx:26-41` reads current app version via `react-native-device-info`.
- `src/hoc/withAppUpdateReminder.tsx:42-67` shows a modal when backend latest version exceeds current version.
- `src/hoc/withAppUpdateReminder.tsx:76-94` opens store URL on update click.
- `App.tsx:279-282` wraps `AppNavigator` in `AppUpdateReminder`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm test -- --runInBand` | `isVersionOutdated` tests pass |
| Expo config check | `npx expo config --type public` | App IDs and version/build visible |
| Identity grep | `rg "com.goreeva_native|com.goreeva.goreeva|versionCode|buildNumber" <expo-target>/app.config.* <expo-target>/eas.json -n` | Correct values present |

## Scope

**In scope**:
- App update service/wrapper.
- Version/build reads using Expo-compatible APIs.
- Test coverage for version comparison.
- Release identity check script if useful.

**Out of scope**:
- Backend endpoint implementation.
- EAS credential submission.
- Store rollout.

## Steps

### Step 1: Replace DeviceInfo for app version/build

Use Expo-compatible APIs (`expo-application`, `expo-constants`, or config values) to obtain the installed app version. Preserve the displayed "Current version" behavior. If build number is needed for hard-update decisions, add support explicitly.

**Verify**: run app and see current version in update modal when backend config is forced to a higher version in a dev/test environment.

### Step 2: Preserve backend update config shape

Keep the existing `AppUpdateConfig` shape unless backend owner approves changes:

```ts
{
  checkEnabled: boolean;
  title?: string;
  message?: string;
  ios?: { latestVersion: string; storeUrl: string };
  android?: { latestVersion: string; storeUrl: string };
}
```

If hard update is needed, extend the backend shape in a backward-compatible way, for example `minimumVersion` or `forceUpdate`, and keep old clients safe.

**Verify**: tests cover disabled config, missing platform config, newer version, same version, older version, and invalid version parts.

### Step 3: Add release identity preflight

Add a script or documented command that fails if Expo config does not match:
- Android package `com.goreeva_native`.
- iOS bundle ID `com.goreeva.goreeva`.
- Android versionCode > 27 for first Expo production release.
- iOS buildNumber > 25 for first Expo production release.
- scheme `goreeva-student`.

This can be a Node script in the Expo target or a checklist if the repo avoids scripts.

**Verify**: running the preflight prints all identity facts and exits 0 only when correct.

### Step 4: Keep wrapper in provider tree

Keep `AppUpdateReminder` around `AppNavigator`, as in `App.tsx:279-282`, unless the new root architecture needs a different wrapper location. It should never block app render if the update endpoint fails.

**Verify**: block network or make endpoint fail; app still opens.

## Test plan

- Unit tests for `isVersionOutdated`.
- Manual modal test with forced higher latest version.
- Manual "Maybe later" and "Update" actions.
- Network failure test.
- Identity preflight test.

## Done criteria

- [ ] App update reminder works in Expo dev build.
- [ ] Version read no longer depends on `react-native-device-info`.
- [ ] Identity preflight exists or is documented in `plans/migration-inventory.md`.
- [ ] App remains usable when update endpoint fails.

## STOP conditions

- Backend update endpoint cannot distinguish Android/iOS correctly.
- The first Expo production build cannot be made higher than current store build numbers.
- Product requires true hard-block update before backend supports it safely.

## Maintenance notes

Soft update reminders are not a replacement for store identity checks. Keep both: user-facing update UX and release-engineering preflight.
