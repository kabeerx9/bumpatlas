# Plan 006: Replace file picking, viewing, and download flows with Expo-safe paths

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat 60bbc6f..HEAD -- src/hooks/useFileSelection.ts src/components/FileViewer src/services/file-downloads src/components/FileSelection src/screens/Student/Leave-Application`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/005-screen-migration.md
- **Category**: migration
- **Planned at**: commit `60bbc6f`, 2026-07-08

## Why this matters

File upload, preview, and download flows are native-heavy and easy to break during Expo migration. They should be migrated as one feature area so permissions, returned file shapes, and UI expectations stay consistent.

## Current state

- `src/hooks/useFileSelection.ts:1-3` imports `react-native-document-picker` and `react-native-image-picker`.
- Document picker currently accepts PDF, Office docs, CSV, and ZIP in `src/hooks/useFileSelection.ts:13-28`.
- Camera/gallery currently return `{ name, type, uri }` objects in `src/hooks/useFileSelection.ts:38-89`.
- `src/components/FileViewer/FileViewer.tsx:4-5` uses `react-native-pdf` and `react-native-webview`.
- Downloads use `react-native-blob-util` in `src/services/file-downloads/DownloadManager.ts:1-2`.
- Android Download Manager path may crash on Android 14+ based on comment at `src/services/file-downloads/DownloadManager.ts:143-149`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| File module scan | `rg "react-native-document-picker|react-native-image-picker|react-native-blob-util|react-native-pdf" <expo-target>/src -n` | No first-release disallowed imports |
| Expo package check | `npx expo install --check` | No mismatched Expo packages |
| Android runtime | `npx expo run:android` | File flows work on device/emulator |

## Scope

**In scope**:
- `src/hooks/useFileSelection.ts`.
- `src/components/FileSelection/*`.
- `src/components/FileViewer/*`.
- `src/services/file-downloads/*`.
- Permissions in Expo config if needed.

**Out of scope**:
- Backend upload API changes.
- Cashfree/payment files.
- Notification attachments.

## Steps

### Step 1: Replace picker APIs while preserving file shape

Use `expo-document-picker` and `expo-image-picker`. Preserve the upload object shape expected by screens:

```ts
{
  name: string;
  type: string;
  uri: string;
}
```

Map document picker cancellation to the same `setFilePickerMode(null)` behavior. Preserve accepted extensions from the old document picker.

**Verify**: `rg "DocumentPicker|ImagePicker|setUploadFile|FilePickerMode" <expo-target>/src/hooks/useFileSelection.ts -n` -> Expo picker imports are used and returned shape exists.

### Step 2: Replace or contain PDF viewing

Preferred first-release options, in order:
1. If PDF URLs are remote and public/signed, render PDFs via WebView/Google/Office viewer or platform browser fallback.
2. If local PDF rendering is required, keep a compatible native PDF library only if it has a working Expo config/prebuild path.

Do not spend more than half a day making `react-native-pdf` work unless product says in-app PDF rendering is critical.

**Verify**: open a PDF URL from the app; it either renders in-app or opens through an approved external viewer without crashing.

### Step 3: Replace downloads with Expo FileSystem/Sharing or simplify

Use `expo-file-system` plus `expo-sharing` where possible. For Android, do not recreate the unsafe Android Download Manager behavior from the old code. If saving to public Downloads is mandatory, document that Android-specific behavior and test API 28, 33, and 34+.

**Verify**: download a PDF/doc file on Android and iOS; user receives a visible share/open/save flow and no crash.

### Step 4: Update permissions

Ensure Expo config includes camera and photo permissions equivalent to `ios/Goreeva_Native/Info.plist:26-29`, and Android media/camera permissions as required by Expo modules.

**Verify**: first camera/gallery use prompts with sensible copy; denial does not crash.

## Test plan

- Upload document from file picker.
- Capture camera photo and submit.
- Select gallery image and submit.
- Preview PDF.
- Preview Office document.
- Download/share file on Android and iOS.
- Permission denied paths.

## Done criteria

- [ ] File upload object shape matches current screens.
- [ ] Old picker modules are not imported.
- [ ] Download path works or is explicitly downgraded to share/open with product approval.
- [ ] PDF flow works or opens externally with product approval.

## STOP conditions

- Backend requires `content://` or file metadata that Expo picker cannot provide.
- Product requires native public Downloads behavior on Android and Expo APIs cannot satisfy it quickly.
- PDF rendering is mandatory and no Expo-compatible path is available.

## Maintenance notes

File behavior varies heavily by OS version. Treat real-device testing as mandatory, especially Android 13/14+.
