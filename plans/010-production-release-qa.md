# Plan 010: Production QA, EAS credentials, store update rollout, and rollback plan

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- app.json app.config.* eas.json package.json package-lock.json plans`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: plans/005-screen-migration.md, plans/006-files-downloads.md, plans/008-deep-linking.md, plans/009-update-config.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

This is the phase that makes the Expo app a safe update for existing users. The stores will treat it as an update only if identity, signing, and versioning are correct. QA must cover the behaviors most likely to regress during the native migration.

## Current state

- Android current production versionCode is `27`, versionName `2.1.9` in `android/app/build.gradle:87-93`.
- iOS current production build is `25`, marketing version `2.1.9` in `ios/Goreeva.xcodeproj/project.pbxproj:552-568` and `590-605`.
- Android release signing currently references `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_STORE_PASSWORD`, `MYAPP_UPLOAD_KEY_ALIAS`, and `MYAPP_UPLOAD_KEY_PASSWORD` in `android/app/build.gradle:102-108`. Do not print credential values.
- Current app has Firebase config files and keystores in repo paths. Treat any signing material as sensitive; do not copy secrets into plans, logs, or public issues.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Expo health | `npx expo-doctor` | no blocking errors |
| Package compatibility | `npx expo install --check` | no mismatches |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Tests | `npm test -- --runInBand` | all pass |
| Android internal build | `eas build --profile preview --platform android` | build succeeds |
| iOS internal build | `eas build --profile preview --platform ios` | build succeeds |
| Production Android build | `eas build --profile production --platform android` | store-ready artifact |
| Production iOS build | `eas build --profile production --platform ios` | store-ready artifact |

## Scope

**In scope**:
- EAS credentials setup for existing app records.
- Internal QA builds.
- Store update submission checklist.
- Rollout/rollback plan.
- README/release documentation cleanup.

**Out of scope**:
- Large feature fixes discovered during QA; create follow-up plans instead.
- Publishing public GitHub issues with credential/security details.
- Deleting old app records or changing app IDs.

## Steps

### Step 1: Configure existing credentials in EAS

Use EAS credentials for the existing apps:
- Android package: `com.goreeva_native`.
- iOS bundle ID: `com.goreeva.goreeva`.
- Apple team: use the existing team from Xcode project if still valid.
- Android signing: use the existing Play upload key/signing flow. Do not generate a new app identity.

Do not paste credential values into chat, plans, commits, or issues.

**Verify**: EAS credentials screen/command shows credentials attached to the existing package/bundle IDs.

### Step 2: Build internal QA artifacts first

Run preview/internal builds. Install over the existing production app on a test device if possible. The install should be treated as an update, not a second app.

**Verify**:
- Android: installing preview build over production does not create a second launcher icon for a different package.
- iOS: TestFlight/internal build belongs to existing App Store Connect app.

### Step 3: Execute QA checklist

Run this checklist on Android and iOS real devices:
- Existing installed app updates to Expo build.
- Existing login/session persists or migration behavior is owner-approved.
- Fresh install login works.
- Logout and relogin works.
- School selection/school URL routing works.
- Dashboard loads.
- Profile loads.
- Attendance loads.
- Grades loads.
- Subjects and every subject section load.
- Announcements load and modal links work.
- Notifications permission prompt works.
- Expo push token registers.
- Foreground push appears in notification inbox.
- Background/killed notification tap opens expected route.
- Deep links open Dashboard, Notifications, Attendance, SOA.
- Leave application file picker works.
- Camera/gallery upload works.
- PDF/doc viewing works.
- Download/share flow works.
- Language switching works.
- App update reminder works and endpoint failure does not block app.
- Cashfree/payment is hidden, disabled, or clearly deferred per product decision.

**Verify**: save QA evidence in `plans/release-qa-checklist.md` with platform/device/build and pass/fail notes.

### Step 4: Production preflight

Before production build/submission, confirm:
- Android package exactly `com.goreeva_native`.
- Android versionCode > 27.
- iOS bundle ID exactly `com.goreeva.goreeva`.
- iOS buildNumber > 25.
- Version is owner-approved.
- Deep-link scheme `goreeva-student`.
- Backend supports Expo push tokens and legacy FCM tokens simultaneously.
- Backend update config points to correct store URLs.
- Privacy strings and permissions are accurate.

**Verify**: run the identity preflight from Plan 009 and record output summary in `plans/release-qa-checklist.md`.

### Step 5: Roll out gradually

Recommended rollout:
- Android: internal testing -> closed testing -> staged production rollout if Play account allows it.
- iOS: TestFlight -> App Store phased release if appropriate.
- Monitor crash reporting, backend token registration, login failures, notification send errors, and support tickets.

Rollback reality:
- You cannot instantly downgrade users through the stores.
- You can stop rollout, submit a fixed higher-version build, and use backend feature flags/update config to reduce damage.
- Keep old backend FCM sending active during migration.

**Verify**: release owner signs off on rollout and rollback notes before production submission.

## Test plan

This plan is mostly manual QA plus store build verification. Automated gates from prior plans must pass before submission.

## Done criteria

- [ ] Preview Android/iOS builds pass QA.
- [ ] Production builds use exact existing app IDs and higher version/build numbers.
- [ ] Backend Expo notification rollout is confirmed.
- [ ] `plans/release-qa-checklist.md` exists with device/platform evidence.
- [ ] Release owner approves staged rollout.

## STOP conditions

- Build installs as a separate app instead of an update.
- Existing signing credentials cannot be attached.
- Android/iOS app ID differs from production.
- Existing user sessions are lost unexpectedly.
- Push notifications cannot be delivered to updated users.
- Deep links or login are broken on either platform.

## Maintenance notes

Do not delete the RN CLI source app or legacy notification backend immediately after release. Keep them available until adoption and crash metrics prove the fresh Expo update is stable.
