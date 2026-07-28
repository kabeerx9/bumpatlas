# Plan 003: Port storage, API client, and JWT auth without logging users out

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- src/storage src/Axios src/jwt src/screens/LoginScreen src/screens/WelcomeScreen src/screens/OnBoardingScreen RootNavigation.ts plans/migration-inventory.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: plans/002-expo-shell-native-config.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

Existing users should experience the fresh Expo binary as a normal app update. The first Expo release should preserve tokens, school selection, language, and notification read state where possible. A storage mismatch here will look like a forced logout or broken school API routing.

## Current state

- MMKV schema keys are declared in `src/storage/mmkvStorage.ts:13-26`.
- The MMKV instance is created in `src/storage/mmkvStorage.ts:35-38`. Preserve the existing `id` and encryption key by reading them from source; do not print or copy key material into logs or plan files.
- `src/Axios/axios.js:24-68` defines token reads/writes, logout, and dynamic `schoolUrl` fallback from `selectedSchoolUrl`.
- `src/Axios/axios.js:128-186` sets request `baseURL`, `Authorization`, and `X-School-URL`.
- `src/Axios/axios.js:291-327` refreshes expired access tokens on 401 and logs out on refresh failure.
- `src/routes/AppNavigator.tsx:54-79` currently starts at `Login`, while `WelcomeScreen` decides whether tokens route into the app.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 after migration fixes |
| Lint | `npm run lint` or Expo template lint command | exit 0 or only known pre-existing warnings |
| Unit tests | `npm test -- --runInBand` | exit 0 |
| API import scan | `rg "src/Axios|../Axios|../../Axios|mmkvStorage|getItem\\('accessToken'|getItem\\(\"accessToken\"" src -n` | All usage points accounted for |

## Scope

**In scope**:
- Storage adapter files in the Expo target.
- API client and auth helpers.
- Login, onboarding, welcome/session bootstrap.
- Root navigation ref if still used.

**Out of scope**:
- Replacing MMKV with SecureStore/AsyncStorage.
- Redesigning login UI.
- Changing backend API contracts.
- Changing token names or school URL storage keys.
- Editing this RN CLI repo's source files.

## Steps

### Step 1: Port storage unchanged first

Copy the storage API shape into the Expo app so callers can keep importing `mmkvStorage`. Keep the same storage keys and same MMKV instance config from the current app. Do not rename `accessToken`, `refreshToken`, `schoolUrl`, `selectedSchoolUrl`, `schoolIdentifier`, `lang`, `notifications`, `subjectId`, or `subjectColorObj`.

If `react-native-mmkv` does not build in the Expo dev build, STOP and report. Do not silently switch storage in the first update.

**Verify**: `rg "Goreeva-native-storage|accessToken|selectedSchoolUrl|schoolIdentifier" <expo-target>/src/storage -n` -> storage id reference and key names exist. Do not print encryption key values.

### Step 2: Port API client with the same request behavior

Move the axios client and cache storage used by the app. Preserve:
- Dynamic `baseURL` computed from `schoolUrl`.
- Fallback from `selectedSchoolUrl` to `schoolUrl`.
- `Authorization: Bearer <token>`.
- `X-School-URL` header.
- 401 refresh queue.
- Logout navigation to login.

Remove or gate excessive response-body logging before production if it may leak sensitive student data.

**Verify**: `rg "REFRESH_TOKEN_URL|X-School-URL|selectedSchoolUrl|isRefreshInProgress" <expo-target>/src -n` -> all preserved.

### Step 3: Port login/onboarding/session bootstrap

Move `LoginScreen`, `OnBoardingScreen`, `WelcomeScreen`, auth helper files under `src/jwt`, and any API calls they depend on. Preserve current navigation names used by `AppNavigator`: `Login`, `LoginScreen`, `OnBoarding`, `Welcome`, and `HomeDrawer`.

**Verify**: start dev build, then test:
- Fresh install opens login/onboarding.
- Valid login stores access/refresh tokens.
- App restart routes an authenticated user into the app.
- Logout removes access/refresh tokens and returns to login.

### Step 4: Add minimal characterization tests

Add tests for version-independent logic:
- `isVersionOutdated` stays in Plan 009, not here.
- API auth fallback: when `schoolUrl` is missing and `selectedSchoolUrl` exists, the storage adapter writes `schoolUrl`.
- Token refresh queue behavior if testable without network by mocking axios.

**Verify**: `npm test -- --runInBand` -> all tests pass.

## Test plan

- Manual: login, kill app, relaunch, logout, relogin.
- Manual: use an account with existing `selectedSchoolUrl` but no `schoolUrl` if possible.
- Automated: storage/API helper tests where feasible.

## Done criteria

- [ ] Existing MMKV instance config is preserved in source without exposing secret values in logs/plans.
- [ ] Login works in the Expo dev build.
- [ ] Authenticated app restart works.
- [ ] 401 refresh path still retries requests or logs out on refresh failure.
- [ ] No Cashfree or notification work is mixed into this plan.

## STOP conditions

- Preserving MMKV is impossible with the chosen Expo template.
- Backend API requires a contract change.
- Existing users cannot keep their session without a storage migration that needs product approval.

## Maintenance notes

After the first stable Expo update, a separate migration can move sensitive tokens to more appropriate secure storage. Do not combine that with the first Expo release.
