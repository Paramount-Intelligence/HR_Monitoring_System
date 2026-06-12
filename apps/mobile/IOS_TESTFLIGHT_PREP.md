# PIMS iOS — TestFlight Preparation Guide

Prepare iOS builds and TestFlight distribution. **Do not submit to TestFlight without explicit approval.**

---

## Apple Developer requirements

| Item | Value / status |
|------|----------------|
| Apple Developer Program | ⬜ **[OWNER]** Active membership required |
| App Store Connect access | ⬜ **[OWNER]** |
| Apple Team ID | `APPLE_TEAM_ID_PLACEHOLDER` |
| Bundle identifier | `com.paramountintelligence.pims` |
| App Store Connect app | ⬜ Create in ASC |
| App name | PIMS |
| SKU | `PIMS-MOBILE-IOS-PLACEHOLDER` |
| Primary language | English (U.S.) |
| Category | Business / Productivity |
| Privacy policy URL | ⬜ **[OWNER]** — same as Android |
| Age rating | Complete questionnaire (likely 4+) |
| Export compliance | Typically "No" for standard HTTPS-only apps — confirm with legal |

---

## Android vs iOS identifiers

| Platform | Identifier | Notes |
|----------|------------|-------|
| Android | `com.paramount.pims` | Unchanged — Play Store |
| iOS | `com.paramountintelligence.pims` | App Store / TestFlight |

---

## TestFlight metadata

See `TESTFLIGHT_METADATA.md` for beta description, what to test, and review contacts.

**Demo credentials (never commit real values):**

| Field | Placeholder |
|-------|-------------|
| Email | `DEMO_EMAIL_PLACEHOLDER` |
| Password | `DEMO_PASSWORD_PLACEHOLDER` |

Provide real credentials only in App Store Connect **App Review Information** (not in git).

---

## Signing & credentials plan

1. Confirm Apple account owner with organization before creating certificates.
2. Prefer **EAS-managed credentials** for first iOS build.
3. If an ASC app already exists, use matching bundle ID and team.

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"
npx eas-cli login
npx eas-cli whoami
npx eas-cli build:configure
npm run eas:credentials:ios
```

| Credential | Notes |
|------------|-------|
| Distribution certificate | EAS-managed recommended |
| Provisioning profile | App Store / Ad Hoc per profile |
| Push Notifications capability | Required for APNs via Expo |
| Associated Domains | Not required unless universal links added |
| Keychain Sharing | Not required |

**Never commit:** `.p12`, `.mobileprovision`, Apple private keys, App Store Connect API keys in repo.

---

## EAS iOS build profiles

| Profile | Purpose | Command |
|---------|---------|---------|
| `ios-simulator` | Mac simulator dev client | `npm run eas:build:ios-simulator` |
| `development` | Physical device dev client | `npx eas-cli build -p ios --profile development` |
| `preview` | Internal device QA | `npm run eas:build:ios-preview` |
| `production` | TestFlight / App Store | `npm run eas:build:ios-production` |

Android profiles are unchanged in `eas.json`.

---

## Pre-build validation

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"

npx expo-doctor
npm run typecheck
npm run export:ios
```

---

## Build commands (when Apple account ready)

```powershell
# Simulator (requires Mac download from EAS or local Mac)
npm run eas:build:ios-simulator

# Internal device preview
npm run eas:build:ios-preview

# TestFlight / App Store binary
npm run eas:build:ios-production
```

---

## Submit to TestFlight (later — requires approval)

Prerequisites:

1. App created in App Store Connect with bundle `com.paramountintelligence.pims`
2. Apple credentials configured in EAS
3. Production iOS build succeeded
4. Privacy policy URL live
5. Demo account in App Review section

```powershell
# Only after approval — configure submit in EAS dashboard or eas.json securely
npm run eas:submit:ios-production
```

**Do not** add real `appleId` / `ascAppId` / `appleTeamId` to committed files. Use EAS secrets or interactive submit.

---

## Native module iOS compatibility

| Module | iOS support | Config |
|--------|-------------|--------|
| expo-dev-client | Yes | Excluded from production profile |
| react-native-webrtc | Yes | `@config-plugins/react-native-webrtc` |
| expo-notifications | Yes | APNs via EAS + ASC capability |
| expo-secure-store | Yes | Keychain |
| expo-image-picker | Yes | Photo library + camera plist keys |
| expo-audio | Yes | Call recording — **pending TestFlight validation** |
| @react-native-community/netinfo | Yes | — |
| @react-native-async-storage/async-storage | Yes | — |

---

## iOS-specific limitations

| Feature | Status |
|---------|--------|
| Call recording | **Disabled until TestFlight validation** (`recording-platform.ts`) |
| Background incoming calls | Not implemented (no CallKit) |
| Killed-state incoming calls | Not supported |
| HEIC profile photos | Rejected — user must pick JPEG/PNG/WebP |
| Push (Expo Go) | Not supported — requires dev/preview/production build |

---

## TestFlight rollout steps (internal)

1. Upload IPA via EAS production build or `eas submit`
2. App Store Connect → TestFlight → Internal Testing
3. Add internal testers (Apple IDs)
4. Complete **Beta App Review** if required for external testers
5. Run `IOS_QA_CHECKLIST.md` on physical iPhone
6. Log issues in `IOS_BLOCKERS.md`

**Do not** release to App Store production track in Phase 16.

---

## Related documents

- `TESTFLIGHT_METADATA.md`
- `IOS_PRIVACY_NOTES.md`
- `IOS_QA_CHECKLIST.md`
- `IOS_BLOCKERS.md`
- `PRIVACY_AND_DATA_SAFETY_NOTES.md` (shared data categories)
