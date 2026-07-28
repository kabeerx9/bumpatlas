# Plan 007: Replace Firebase/Notifee with Expo Notifications and backend token rollout

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- App.tsx index.js src/services/deep-link-service src/services/local-notifications src/context/notification-context.tsx src/hooks/useRegisterDevice.tsx src/storage/mmkvStorage.ts`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: plans/003-storage-api-auth.md, plans/004-providers-design-navigation.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

Notifications are one of the largest behavior changes in the migration. The old app receives FCM through React Native Firebase and displays through Notifee. The new app should use Expo Notifications, but the backend must support both old FCM tokens and new Expo push tokens during rollout.

## Current state

- `index.js:5-12` registers the app, sets Firebase background message handler, and calls Notifee background handlers.
- `App.tsx:1-2` imports Notifee and Firebase Messaging.
- `App.tsx:41-159` requests Firebase/Android permissions and cancels Notifee scheduled notifications.
- `App.tsx:244-271` subscribes to FCM foreground messages, stores notification records, and displays them.
- `src/services/deep-link-service/NotificationService.tsx` wraps Notifee and Firebase Messaging.
- `src/services/deep-link-service/messaging.tsx` stores background FCM messages into MMKV.
- `src/storage/mmkvStorage.ts:4-10` defines local notification record shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Native usage scan | `rg "@react-native-firebase|@notifee/react-native|react-native-push-notification" <expo-target>/src <expo-target>/App.tsx <expo-target>/index.* -n` | No active imports |
| Expo package check | `npx expo install --check` | No mismatched packages |
| Device build | `npx expo run:android` and `npx expo run:ios` | Notification permission/token works on real devices |

## Scope

**In scope**:
- `expo-notifications` setup.
- Permission request and Expo push token registration.
- Local notification record storage in MMKV.
- Foreground receive/listener behavior.
- Notification channel/category config.
- Backend contract documentation for registering Expo tokens.

**Out of scope**:
- Backend implementation unless this repo contains that backend.
- Cashfree/payment.
- Deep-link tap routing details; Plan 008 owns routing.
- Marketing/local scheduled notification strategy unless product requires it.

## Steps

### Step 1: Replace root notification initialization

Remove Firebase/Notifee startup from the Expo app root. Add an Expo Notifications service module with functions:
- `requestNotificationPermissions()`.
- `getExpoPushToken()`.
- `registerNotificationListeners({ onReceive, onResponse })`.
- `displayOrStoreForegroundNotification()` if needed.

Continue storing local notification records in MMKV using the existing `Notification` shape.

**Verify**: native usage scan -> no Firebase/Notifee imports remain in active Expo code.

### Step 2: Register Expo push tokens after auth

Find the current device-registration flow in `src/hooks/useRegisterDevice.tsx` and port it so authenticated users send an Expo push token to the backend. The backend must know whether the token is an Expo token or legacy FCM token.

Required rollout behavior:
- New Expo app sends Expo push token.
- Backend sends through Expo Push Service for Expo tokens.
- Backend continues sending through old FCM path for users who have not updated/opened the Expo app.
- Token registration should update/replace prior token for the same user/device when appropriate.

**Verify**: with a logged-in test user, server/device registration call includes an Expo push token and platform metadata.

### Step 3: Preserve notification inbox behavior

When a push arrives in foreground or app response handler, store:
- `id`
- `title`
- `body`
- ISO `date`
- `link`
- `read: false`

Keep existing notification list and unread badge behavior through `NotificationProvider`.

**Verify**: send a test notification; `Notifications` screen shows it and unread count increments.

### Step 4: Remove old local scheduled notification behavior unless product requires it

The current app cancels previously scheduled local notifications in `App.tsx:78-104`. Recreate one-time cleanup if Expo Notifications exposes old scheduled notifications to the new binary, or document that Notifee-scheduled triggers cannot be managed after removing Notifee. Do not introduce new daily local notifications unless product requests them.

**Verify**: old local notification service files are either deleted from Expo target or clearly not imported.

### Step 5: Document backend payload contract

Create or update a plan/docs file with expected push payload:
- title
- body
- link, preferably `goreeva-student://HomeDrawer/...`
- notification id/server id if available
- route metadata if the backend sends structured fields

**Verify**: test payload from backend or Expo push tool opens app and stores notification.

## Test plan

- Android real device: permission prompt, token registration, foreground push, background push, killed-app push tap.
- iOS real device/TestFlight: same cases.
- Denied permission: app continues without crash.
- Logged-out user taps notification: app should ignore protected routing or land on login.

## Done criteria

- [ ] Expo app has no active Firebase/Notifee/push-notification imports.
- [ ] Expo push token registers after login.
- [ ] Backend rollout contract is documented.
- [ ] Notification inbox still works.
- [ ] Foreground and tap responses work on Android and iOS real devices.

## STOP conditions

- Backend cannot support Expo Push Tokens in the migration window.
- Product requires old FCM tokens to keep working in the same updated binary.
- Expo Notifications cannot support a required notification behavior.

## Maintenance notes

Expect a dual-token backend period. Do not delete legacy FCM backend sending until app adoption is high enough and old app versions are unsupported.
