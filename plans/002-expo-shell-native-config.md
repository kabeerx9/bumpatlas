# Plan 002: Create Expo app shell with production identity

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- app.json package.json android/app/build.gradle android/app/src/main/AndroidManifest.xml ios/Goreeva.xcodeproj/project.pbxproj ios/Goreeva_Native/Info.plist plans/migration-inventory.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-migration-baseline.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

The store update behavior depends on app identity, signing, and monotonically increasing versions. This phase configures the owner's fresh Expo template/new Expo app while preserving production identity before any feature migration starts. Do not convert this RN CLI repo in place.

## Current state

- Current root config is minimal: `app.json` has only `name` and `displayName`.
- Current Android production identity is `com.goreeva_native`, versionCode `27`, versionName `2.1.9` in `android/app/build.gradle:87-93`.
- Current iOS production identity is `com.goreeva.goreeva`, build `25`, marketing version `2.1.9` in `ios/Goreeva.xcodeproj/project.pbxproj:552-568` and `590-605`.
- Android permissions and deep-link/app-link filters are in `android/app/src/main/AndroidManifest.xml:5-13` and `35-49`.
- iOS permission strings, URL scheme, fonts, background modes, and payment query schemes are in `ios/Goreeva_Native/Info.plist:26-107`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps in Expo target | `npm install` or the template's package-manager install command | exit 0 |
| Check Expo config | `npx expo config --type public` | Shows `ios.bundleIdentifier` and `android.package` |
| Expo health | `npx expo-doctor` | No blocking errors |
| Package version compatibility | `npx expo install --check` | No mismatched Expo SDK packages |
| Android dev build | `npx expo run:android` | App installs and opens |
| iOS dev build | `npx expo run:ios` | App builds and opens on simulator/device |

## Scope

**In scope**:
- Expo template package/config files in the fresh Expo app (`<expo-target>`).
- `app.config.ts` or `app.json`.
- `eas.json`.
- Assets required by app icon/splash.
- Native config plugins only when needed.

**Out of scope**:
- Do not migrate feature screens in this plan.
- Do not configure production EAS credentials in this plan; only prepare config.
- Do not install Expo into this RN CLI repo.
- Do not delete or edit this RN CLI project's source/native files.

## Steps

### Step 1: Decide project layout

Use the owner's fresh Expo template as `<expo-target>`. It may live outside this repository. Keep this RN CLI repo available as the reference app for copying behavior and checking production identity. Do not create a second Expo app inside this repo unless the owner explicitly chooses that layout.

The Expo app must use:
- `name`: a stable internal app name.
- Display name: `Goreeva`.
- `ios.bundleIdentifier`: `com.goreeva.goreeva`.
- `android.package`: `com.goreeva_native`.
- `scheme`: `goreeva-student`.
- Runtime/version fields suitable for EAS Update after first binary release.

**Verify**: `npx expo config --type public` -> output includes `com.goreeva.goreeva`, `com.goreeva_native`, and `goreeva-student`.

### Step 2: Encode native config in Expo config

Move native manifest/plist facts into Expo config:
- Android permissions from `android/app/src/main/AndroidManifest.xml:5-13`.
- Android intent filters for scheme `goreeva-student` and web host after Plan 008 confirms the final host.
- iOS camera/photo permission strings from `ios/Goreeva_Native/Info.plist:26-29`.
- iOS URL scheme from `ios/Goreeva_Native/Info.plist:97-107`.
- iOS query schemes from `ios/Goreeva_Native/Info.plist:88-95` only if payment/deep link integrations still need them. Since Cashfree is deferred, keep them only if harmless and required by current store behavior.

**Verify**: `npx expo config --type prebuild` -> config includes the expected Android permissions and iOS infoPlist keys.

### Step 3: Configure first production version gates

Set first Expo production build values:
- Android `versionCode` must be `28` or higher.
- iOS `buildNumber` must be `26` or higher.
- App `version` can be `2.2.0` or another owner-approved marketing version.

If using EAS `autoIncrement`, do not rely on it blindly for the first build. Explicitly confirm the generated Android and iOS build numbers exceed current production.

**Verify**: `npx expo config --type public` -> Android and iOS version fields are visible and above the current production values.

### Step 4: Add EAS profiles without submitting

Create `eas.json` profiles:
- `development`: dev client/internal only.
- `preview`: internal QA builds.
- `production`: store-ready builds, `autoIncrement` may be enabled after first successful explicit version gate.

Do not run a production submit from this plan.

**Verify**: `npx eas-cli config` or `npx eas build:configure` as appropriate for the environment -> config is valid without submitting.

## Test plan

- Run Expo config commands and Expo doctor.
- Build/run dev Android first.
- Build/run iOS after Android shell works.

## Done criteria

- [ ] Expo config prints the exact production Android and iOS IDs.
- [ ] Expo config prints scheme `goreeva-student`.
- [ ] First Expo version/build values exceed Android `27` and iOS `25`.
- [ ] `npx expo-doctor` has no blocking errors.
- [ ] Android and iOS dev builds launch to a placeholder/shell screen.

## STOP conditions

- Expo config prints any Android package other than `com.goreeva_native`.
- Expo config prints any iOS bundle ID other than `com.goreeva.goreeva`.
- The Expo template requires replacing React Navigation or NativeBase before the app shell can run.
- Store signing credentials are needed to proceed; defer to Plan 010.

## Maintenance notes

Do not treat generated `ios/` and `android/` as source of truth after adopting Expo prebuild/CNG. Source of truth should be Expo config plus config plugins.
