# PIMS iOS — Blockers & Status Tracker

Track items that must be resolved before TestFlight external testing or App Store submission.

Status: **Open** | **In Progress** | **Blocked** | **Resolved**

---

## Account & App Store Connect

| ID | Item | Status | Owner | Notes |
|----|------|--------|-------|-------|
| IOS-001 | Apple Developer Program active | Open | **[OWNER]** | Required for any iOS build |
| IOS-002 | App Store Connect app created | Open | **[OWNER]** | Bundle: `com.paramountintelligence.pims` |
| IOS-003 | Apple Team ID confirmed | Open | **[OWNER]** | Use correct org account |
| IOS-004 | Privacy policy URL published | Open | **[OWNER]** | Same as Android |
| IOS-005 | EAS Expo account logged in | Open | Engineering | `npx eas-cli login` |

---

## Signing & build

| ID | Item | Status | Notes |
|----|------|--------|-------|
| IOS-006 | iOS distribution credentials (EAS) | Open | `npm run eas:credentials:ios` |
| IOS-007 | Push Notifications capability in ASC | Open | Required for APNs |
| IOS-008 | First iOS preview build succeeded | Open | `npm run eas:build:ios-preview` |
| IOS-009 | First iOS production build succeeded | Open | TestFlight IPA |
| IOS-010 | Android production config unchanged | Resolved | Package `com.paramount.pims` preserved |

---

## Feature validation (TestFlight)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| IOS-011 | WebRTC voice/video on physical iPhone | Open | Requires dev/preview build |
| IOS-012 | Push notifications on physical iPhone | Open | Requires APNs + ASC |
| IOS-013 | Call recording iOS validation | Blocked | Disabled until `IOS_CALL_RECORDING_VALIDATED = true` in `recording-platform.ts` |
| IOS-014 | Profile HEIC handling | Resolved | Rejected with user message; prefer JPEG/PNG |
| IOS-015 | Deep links `pims://` | In Progress | Implemented — needs device QA |

---

## Legal & compliance

| ID | Item | Status | Notes |
|----|------|--------|-------|
| IOS-016 | Recording consent / monitoring disclosure | Open | **[OWNER/LEGAL]** |
| IOS-017 | App Privacy labels in ASC | Open | See `IOS_PRIVACY_NOTES.md` |
| IOS-018 | Export compliance answers | Open | **[OWNER]** |
| IOS-019 | Demo credentials for App Review | Open | ASC only — placeholders in docs |

---

## Dependencies on Android / prior phases

| ID | Item | Status | Notes |
|----|------|--------|-------|
| IOS-020 | Phase 14 Android QA complete | Open | Recommended before iOS wide rollout |
| IOS-021 | Phase 15 Android AAB on internal track | Open | Parallel track OK |

---

## Native module risks

| Module | Risk | Mitigation |
|--------|------|------------|
| react-native-webrtc | Build size, iOS permissions | Config plugin + plist strings |
| expo-notifications | APNs setup | EAS credentials |
| expo-audio + WebRTC | Concurrent recording may fail | iOS recording disabled until validated |
| Monorepo React duplicate | expo-doctor warning | Metro pins React 19 — documented |

---

## Resolution log

| Date | ID | Action |
|------|-----|--------|
| Phase 16 | IOS-010 | Android package/version unchanged |
| Phase 16 | IOS-013 | iOS recording guarded in code |
| Phase 16 | IOS-014 | HEIC rejected in profile picker |

---

## Ready for Phase 17 (final cross-platform QA)?

**No** — resolve IOS-001 through IOS-009 minimum, complete `IOS_QA_CHECKLIST.md` on device, then proceed.
