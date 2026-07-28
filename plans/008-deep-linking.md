# Plan 008: Rebuild deep linking, notification tap routing, and app links

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- src/services/deep-link-service src/routes android/app/src/main/AndroidManifest.xml ios/Goreeva_Native/Info.plist plans/007-expo-notifications.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: plans/007-expo-notifications.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

Deep links connect store identity, notifications, and navigation. The old code mixes URL events, Notifee initial notification, FCM payload parsing, and route fallbacks. Expo needs a cleaner routing layer that keeps existing route names and schemes.

## Current state

- React Navigation consumes `linking` from `src/services/deep-link-service/DeepLinkConfig.tsx` in `src/routes/AppNavigator.tsx:56`.
- JS prefixes are `goreeva-student://` and `https://student.goreeva.com` in `DeepLinkConfig.tsx:25-27`.
- Android native app links use host `app.goreeva.com` in `android/app/src/main/AndroidManifest.xml:42-49`.
- iOS URL scheme is `goreeva-student` in `ios/Goreeva_Native/Info.plist:97-107`.
- Current link config maps `HomeDrawer` and `MySubjectsDrawer` paths in `DeepLinkConfig.tsx:6-22`.
- Existing behavior redirects `MySubjectsDrawer` notification links to `HomeDrawer/Notifications` in multiple branches, e.g. `DeepLinkConfig.tsx:80-83` and `144-146`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Config check | `npx expo config --type public` | Shows scheme and app link config |
| Link scan | `rg "goreeva-student|student.goreeva.com|app.goreeva.com|HomeDrawer/Notifications|MySubjectsDrawer" <expo-target>/src <expo-target>/app.config.* -n` | All link facts accounted for |
| Runtime | `npx expo run:android` | Links open expected route |

## Scope

**In scope**:
- React Navigation `linking` object.
- Expo Linking/Notifications response handling.
- Expo config scheme/app links.
- Route fallback rules for notification links.

**Out of scope**:
- Creating backend universal link files unless owner provides domain access.
- Renaming routes.
- Notification token registration.

## Steps

### Step 1: Normalize the link contract

Create a small routing helper such as `src/services/deep-link-service/normalizeDeepLink.ts`. It should accept incoming URL/payload data and return either:
- a valid app URL, e.g. `goreeva-student://HomeDrawer/Notifications`, or
- `null` for no route.

Rules to preserve:
- `MySubjectsDrawer` notification links should route to `HomeDrawer/Notifications` unless product approves direct subject navigation.
- `HomeDrawer` links should route as provided.
- Missing/invalid notification links should default to `HomeDrawer/Notifications` only for notification tap events, not for arbitrary bad URLs.

**Verify**: add tests for `normalizeDeepLink` covering HomeDrawer, MySubjectsDrawer, missing link, and unknown drawer.

### Step 2: Rebuild React Navigation linking

Use the same route names from Plan 004. Replace Notifee-specific `getInitialURL` and `subscribe` code with:
- `Linking.getInitialURL()`.
- Expo Notifications last response / response listener for notification taps.
- Normalization helper from Step 1.

**Verify**: `rg "@notifee/react-native|NotificationService" <expo-target>/src/services/deep-link-service -n` -> no matches.

### Step 3: Resolve web host mismatch

Confirm with product/backend which host should be supported:
- Existing Android native config: `app.goreeva.com`.
- Existing JS prefix: `student.goreeva.com`.

Update Expo config and React Navigation prefixes to include the approved host(s). If both are valid in production, include both. If neither domain has valid Android assetlinks/iOS associated domains configured, keep scheme links as primary and document app links as pending.

**Verify**: `npx expo config --type public` -> approved hosts appear in config.

### Step 4: Manual link tests

Test at least:
- `goreeva-student://HomeDrawer/Dashboard`
- `goreeva-student://HomeDrawer/Notifications`
- `goreeva-student://HomeDrawer/Attendance`
- `goreeva-student://HomeDrawer/Soa`
- `goreeva-student://MySubjectsDrawer/Modules` -> expected fallback or direct behavior per Step 1.

**Verify**: route opens correctly from closed app and running app on Android. Repeat on iOS if available.

## Test plan

- Unit tests for link normalization.
- Manual scheme tests on Android and iOS.
- Notification tap tests from Plan 007 payloads.
- Logged-out user tap behavior.

## Done criteria

- [ ] Deep link scheme is configured in Expo config.
- [ ] Link normalization tests pass.
- [ ] Notification taps route through Expo Notifications response handlers.
- [ ] App link host mismatch is resolved or documented as pending with owner decision.

## STOP conditions

- Route names changed in Plan 004/005.
- Backend sends notification payloads that do not include enough route data.
- Product requires direct subject navigation but payloads do not carry subject context.

## Maintenance notes

Keep link parsing centralized. The old code duplicated parsing in foreground, initial URL, and background handlers; avoid recreating that duplication.
