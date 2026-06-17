# PIMS Mobile — Release & Build Guide

## Build types

| Profile | Output | When to use |
|---------|--------|-------------|
| **development** | Dev client APK | Daily dev with Metro, hot reload, debugging |
| **preview** | Internal APK | QA on real devices, stakeholders |
| **production** | AAB (App Bundle) | Google Play Store submission |

All profiles point to production Railway API/WebSocket URLs.

---

## Commands

### Development build

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"
eas build --profile development --platform android
```

Then start Metro:

```powershell
npx expo start --dev-client
```

### Preview APK

```powershell
cd apps/mobile
$env:EAS_NO_VCS=1
eas build --profile preview --platform android
```

Use when git metadata or monorepo layout blocks EAS without `EAS_NO_VCS`.

### Production AAB

```powershell
eas build --profile production --platform android
```

Upload resulting `.aab` to Google Play Console.

---

## Pre-build validation

Always run locally before EAS:

```powershell
cd apps/mobile
npm run typecheck
npx expo export --platform android
```

Fix all errors before triggering a cloud build.

---

## Version & build numbers

Edit `apps/mobile/app.json`:

| Field | Location | Notes |
|-------|----------|-------|
| `expo.version` | User-visible version | e.g. `1.4.0` |
| `expo.android.versionCode` | Integer, must increase | e.g. `5` → `6` |
| `expo.ios.buildNumber` | iOS only | Increment per iOS release |

EAS uses `"appVersionSource": "local"` — values come from `app.json`.

---

## Install APK

1. Download APK from Expo build page
2. Transfer to phone (USB, email, link)
3. Open file → Install
4. Allow “Install unknown apps” for your browser/files app if prompted

### Uninstall old APK

If install fails with signature conflict:

```text
Settings → Apps → PIMS → Uninstall
```

Or `adb uninstall com.paramount.pims`

---

## Google “Can’t verify app” warning

Sideloaded APKs **not from Play Store** show this warning on Android. It is **expected** for preview/dev APKs.

- Tap **Install anyway** (wording varies by OEM)
- Play Store AAB distribution removes this for end users

---

## Play Store requirements

- Production **AAB** (not APK) for store upload
- Privacy policy URL
- App signing by Google Play App Signing
- `POST_NOTIFICATIONS` declaration for Android 13+
- Content rating questionnaire
- Service account for automated upload (`google-service-account.json` — keep secret)

---

## Feature set diagnostics

Check `src/constants/features.ts` and EAS env `EXPO_PUBLIC_APP_ENV`:

- `development` — dev client
- `preview` — internal QA
- `production` — store release

Push token registration includes environment in payload.

---

## EAS_NO_VCS

Set when EAS CLI complains about git working tree or monorepo:

```powershell
$env:EAS_NO_VCS=1
eas build --profile preview --platform android
```

Does not skip local typecheck/export — still run those manually.

---

## Branding assets for release

Before store submission, confirm:

| Asset | Path |
|-------|------|
| App icon | `assets/icon.png` (from `logo.png`) |
| Adaptive foreground | `assets/android-icon-foreground.png` |
| Adaptive background color | `#f9f9ff` in `app.json` |
| Splash | `assets/logo.png` |
| Favicon (web) | `assets/favicon.png` |

Regenerate icons from `logo.png` after any branding change (see TECHNICAL_GUIDE.md).

---

## Final pre-release checklist

1. [ ] All QA cases in TESTING_QA.md passed on preview APK
2. [ ] Backend deployed (voice notes `.m4a`, push channelIds)
3. [ ] `versionCode` incremented
4. [ ] Typecheck + export pass
5. [ ] No debug logging of secrets
6. [ ] Preview APK tested on target Android versions
7. [ ] Production AAB built and uploaded to internal track first
8. [ ] Release notes prepared for stakeholders

---

## What this guide does not do

This guide does **not** automatically run builds. Trigger EAS builds explicitly when ready.
