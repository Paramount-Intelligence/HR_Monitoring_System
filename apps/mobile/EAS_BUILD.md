# PIMS Mobile — EAS Build Guide (Phase 14)

Internal Android APK builds for QA. **Do not** run `production` profile until Phase 15.

## Prerequisites

1. [Expo account](https://expo.dev/signup)
2. EAS CLI (included in `apps/mobile` devDependencies)
3. Physical Android device for WebRTC / push testing

## One-time setup

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"

# Install dependencies (from repo root or mobile app)
npm install

# Log in to Expo (interactive — do not commit credentials)
npx eas login

# Link project (adds projectId to app.json extra.eas.projectId)
npx eas build:configure
```

Verify login:

```powershell
npx eas whoami
```

## Local validation (run before every build)

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"

npx expo-doctor
npx expo install --fix
npm run typecheck
npm run export:android
```

## Development APK (native debugging + Metro)

Use for WebRTC, calls, recording, and push debugging with dev client.

```powershell
npx eas build --platform android --profile development
```

After install:

```powershell
npm run start:dev-client
```

Open the dev build on device and connect to Metro.

## Preview APK (internal QA — no Metro)

Standalone APK for testers and stakeholders.

```powershell
npx eas build --platform android --profile preview
```

1. Copy build URL from EAS dashboard  
2. Download APK  
3. Install: open link on device or `adb install path\to.apk`  
4. Test with production backend (configured in `eas.json` env)

## Environment

Public vars only (injected at build time via `eas.json`):

| Variable | Value |
|----------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| `EXPO_PUBLIC_WS_URL` | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |

Local override: copy `.env.example` → `.env.local` (gitignored).

## Version bumps

Before each new APK:

1. Increment `expo.android.versionCode` in `app.json`
2. Optionally bump `expo.version` for semantic versioning

## Profiles summary

| Profile | Output | Dev client | Use |
|---------|--------|------------|-----|
| `development` | APK | Yes | Native module debugging |
| `preview` | APK | No | Internal QA |
| `production` | AAB | No | **Phase 15 — Play Store** |

## Production AAB (Phase 15 — Play Store)

**Output:** Android App Bundle (`.aab`), not APK.

```powershell
npm run eas:build:production
```

- Production profile excludes `expo-dev-client` (see `app.config.ts`)
- Target SDK 35 for Google Play compliance
- Submit to **internal testing** only until approved:

```powershell
# Requires google-service-account.json (gitignored) — see PRODUCTION_RELEASE_CHECKLIST.md
npm run eas:submit:production
```

See `PRODUCTION_RELEASE_CHECKLIST.md` for full Play Console gate.

## Known expo-doctor warnings (documented)

| Warning | Status |
|---------|--------|
| Duplicate `react` / `react-dom` (monorepo web + mobile) | **Expected** — `metro.config.js` pins mobile React 19 |
| `react-native-webrtc` not on RN Directory | **Expected** — excluded in `package.json` expo.doctor config |

## Troubleshooting

| Failure | Check |
|---------|--------|
| Gradle / native build | `@config-plugins/react-native-webrtc` in plugins |
| Missing projectId | Run `eas build:configure` |
| Wrong API URL | `eas.json` env + `app.json` extra fallbacks |
| Push token fails | EAS projectId + physical device |
| Not logged in | `npx eas login` |

## Security before sharing APK

- [ ] Production API/WS URLs only
- [ ] No localhost in build env
- [ ] No AWS/bucket/JWT secrets in mobile config
- [ ] Phase 13 security checklist reviewed

See `INTERNAL_QA_CHECKLIST.md` for device test matrix.
