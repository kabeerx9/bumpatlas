# Plan 004: Port providers, design system, navigation, and onboarding/login shell

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- App.tsx src/context src/routes src/localization src/screens/ErrorBoundaryScreen src/screens/LoginScreen src/screens/WelcomeScreen src/screens/OnBoardingScreen`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-storage-api-auth.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

Before moving dozens of screens into the fresh Expo app, the Expo app needs the same provider stack, theme tokens, localization, error boundary, and route names. This creates a stable target for screen-by-screen migration.

## Current state

- Root provider order is `SafeAreaProvider > NativeBaseProvider > TanstackQueryProvider > AppContextProvider > NotificationProvider > ErrorBoundary > AppUpdateReminder > AppNavigator` in `App.tsx:273-288`.
- NativeBase theme colors and button/input defaults are defined in `App.tsx:166-218`.
- `src/routes/AppNavigator.tsx:18-50` defines the login stack.
- `src/routes/AppNavigator.tsx:54-79` defines root stack route names.
- Localization is initialized by side effect in `App.tsx:12` from `src/localization/config.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` or Expo template lint command | exit 0 or known warnings |
| Route import scan | `rg "createNativeStackNavigator|createDrawerNavigator|NavigationContainer|initialRouteName" <expo-target>/src/routes -n` | Route tree exists |
| Runtime | `npx expo run:android` | Login/welcome shell opens |

## Scope

**In scope**:
- App root file in Expo target.
- `src/context/*`.
- `src/routes/*`.
- `src/localization/*`.
- Error boundary, login, onboarding, welcome shell.
- NativeBase theme extraction if useful.

**Out of scope**:
- Replacing NativeBase.
- Switching to Expo Router.
- Reworking screen UX or route names.
- Notification logic beyond placeholder provider state.
- Editing this RN CLI repo's source files.

## Steps

### Step 1: Recreate provider stack

Move provider components and root app composition into the Expo app. Keep the provider order unless a library requires a wrapper change. Temporarily omit notification side effects that still depend on Firebase/Notifee; Plan 007 owns those.

**Verify**: `rg "NativeBaseProvider|TanstackQueryProvider|AppContextProvider|NotificationProvider|ErrorBoundary|AppNavigator" <expo-target>/App.tsx <expo-target>/src -n` -> all are present.

### Step 2: Preserve theme and localization

Move NativeBase theme values from `App.tsx:166-218` into the Expo app. It is acceptable to extract them into `src/theme/native-base-theme.ts` if the app root stays readable. Move `src/localization` and ensure English/Hindi/Marathi resource files load.

**Verify**: launch login screen and switch any visible language control if available. `rg "primary|brandBtnColor|i18next|react-i18next" <expo-target>/src -n` -> theme and i18n are wired.

### Step 3: Recreate route tree without changing names

Move `RootNavigation.ts`, `AppNavigator`, `HomeDrawer`, `MySubjectsDrawer`, `SubjectNavigator`, and `SubjectGradesNavigator`. Preserve names used by deep links and notification routing:
- `HomeDrawer`
- `Login`
- `LoginScreen`
- `OnBoarding`
- `Welcome`
- `SubjectNavigator`
- `Profile`
- `Notifications`
- `Dashboard`
- `Attendance`
- `Soa`
- `Announcement`

**Verify**: `rg "name=\"HomeDrawer\"|name=\"Login\"|name=\"Notifications\"|name=\"Dashboard\"|name=\"Soa\"" <expo-target>/src/routes <expo-target>/src/screens -n` -> expected route names exist.

### Step 4: Confirm app shell navigation manually

Run Android dev build and navigate:
- Fresh launch -> login/welcome path.
- Login success -> dashboard/home drawer.
- Drawer opens.
- Profile route opens.
- Back behavior does not crash.

**Verify**: `npx expo run:android` -> manual route smoke test passes.

## Test plan

- Add or port a smoke test for `AppNavigator` rendering if the test setup can render React Navigation.
- Manual route smoke test on Android and iOS after build works.

## Done criteria

- [ ] Provider stack is present and stable.
- [ ] Theme colors/defaults match the current app.
- [ ] Localization loads.
- [ ] Route names are preserved.
- [ ] Login/onboarding/welcome shell opens in Expo dev build.

## STOP conditions

- The Expo template's navigation architecture conflicts with React Navigation.
- NativeBase is incompatible with the chosen Expo SDK and cannot be fixed without a redesign.
- Route names must change to continue.

## Maintenance notes

Keep navigation stable until after production migration. Route renames are release-risky because notification payloads and app links depend on them.
