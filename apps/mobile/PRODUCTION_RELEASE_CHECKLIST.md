# PIMS Mobile — Production Release Checklist (Phase 15)

Google Play **internal testing** preparation. **Do not publish to production track** until all critical items are green and approved.

---

## Pre-production audit (Phase 14 → 15 gate)

| Check | Status | Notes |
|-------|--------|-------|
| Phase 14 preview APK tested on physical device | ⬜ Pending | **[BLOCKER]** Complete internal QA first |
| Critical bugs = 0 | ⬜ | See `INTERNAL_QA_BUG_LOG.md` |
| High bugs = 0 | ⬜ | BLOCKER-001 (EAS login) still open |
| Security/RBAC bugs = 0 | ✅ | Phase 13 complete |
| Production API URL | ✅ | Railway production |
| Production WS URL | ✅ | Railway WSS |
| No localhost / test URLs | ✅ | Audited |
| No hardcoded credentials | ✅ | |
| No token logs in production | ✅ | `secureLog` / `__DEV__` |
| No bucket/backend secrets in mobile | ✅ | |

---

## App configuration

| Item | Value | Status |
|------|-------|--------|
| App name | PIMS | ✅ |
| Slug | `pims-mobile` | ✅ (existing Expo project) |
| Android package | `com.paramount.pims` | ✅ unchanged |
| Version | `1.0.0` | ✅ |
| versionCode | `1` | ✅ — bump before each upload |
| Target SDK | 35 | ✅ `expo-build-properties` |
| Compile SDK | 35 | ✅ |
| Min SDK | 24 | ✅ WebRTC requirement |
| Scheme | `pims://` | ✅ |
| Dev client excluded from production | ✅ | `app.config.ts` |
| Icons / splash | ✅ | Assets present |

---

## Environment (public only)

| Variable | Production value |
|----------|------------------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| `EXPO_PUBLIC_WS_URL` | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |
| `EXPO_PUBLIC_APP_ENV` | `production` |

**Forbidden in mobile:** DATABASE_URL, JWT secrets, AWS keys, SMTP, Play service account JSON in source.

---

## EAS build profiles

| Profile | Output | Purpose | Status |
|---------|--------|---------|--------|
| `development` | APK + dev client | Native debugging | Configured |
| `preview` | APK | Internal QA | Configured |
| `production` | **AAB** | Play Store | Configured |

---

## Local validation (run before production AAB)

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"
npx expo-doctor
npx expo install --fix
npm run typecheck
npm run export:android
```

| Command | Last run | Result |
|---------|----------|--------|
| typecheck | Phase 17 | **Pass** |
| export:android | Phase 17 | **Pass** |
| export:ios | Phase 17 | **Pass** |
| expo-doctor | Phase 17 | 17/18 (monorepo React duplicate) |

---

## EAS credentials & signing

```powershell
npx eas-cli login
npx eas-cli whoami
npx eas-cli build:configure
npm run eas:credentials
```

| Check | Status |
|-------|--------|
| Expo account logged in | ⬜ **[BLOCKER]** |
| EAS project linked (`extra.eas.projectId`) | ⬜ |
| Android keystore (EAS-managed or existing) | ⬜ |
| Package name matches Play Console | ⬜ |
| Upload key matches existing app (if any) | ⬜ |

**Never commit:** `.jks`, `google-service-account.json`, keystore passwords.

---

## Production AAB build

```powershell
npm run eas:build:production
```

| Field | Value |
|-------|-------|
| Build profile | `production` |
| Artifact type | `.aab` (not APK) |
| EAS build URL | _paste after build_ |
| versionCode verified | ⬜ |
| Package verified | ⬜ |

---

## EAS Submit (optional — internal track only)

**Do not submit without approval.**

1. Create Google Cloud service account with Play Console API access
2. Download JSON key → save as `apps/mobile/google-service-account.json` (gitignored)
3. Configure `eas.json` submit → `track: internal` (already set)
4. Run: `npm run eas:submit:production`

**Alternative:** Manual AAB upload in Play Console → Testing → Internal testing.

---

## Google Play Console

| Item | Status |
|------|--------|
| Developer account active | ⬜ **[OWNER]** |
| App created in Console | ⬜ |
| Package name `com.paramount.pims` registered | ⬜ |
| Store listing draft | ✅ `PLAY_STORE_LISTING.md` |
| Screenshots | ⬜ `PLAY_STORE_SCREENSHOTS_PLAN.md` |
| Feature graphic 1024×500 | ⬜ |
| Privacy policy URL | ⬜ **[OWNER]** |
| Data safety form | ⬜ `PRIVACY_AND_DATA_SAFETY_NOTES.md` |
| App content / declarations | ⬜ |
| Target audience | ⬜ **[OWNER]** |
| Ads declaration (likely No) | ⬜ |
| App access (test credentials for reviewers) | ⬜ |
| Internal testing track release | ⬜ |
| **Production track rollout** | ❌ **Not in Phase 15** |

---

## Production backend smoke test (physical device + production AAB)

Install production/internal AAB build and verify:

- [ ] Login
- [ ] Token refresh after restart
- [ ] Dashboard
- [ ] Attendance check-in/out
- [ ] Profile + photo upload
- [ ] Messages send/receive
- [ ] Alerts
- [ ] Push registration
- [ ] Manage (manager/admin role)
- [ ] Reports (role-based)
- [ ] WebSocket reconnect
- [ ] Voice/video call
- [ ] Recording upload (if enabled)
- [ ] Offline queue + sync
- [ ] Logout clears state

Document results in `INTERNAL_QA_BUG_LOG.md`.

---

## Critical release blockers

| ID | Blocker | Severity | Status |
|----|---------|----------|--------|
| B1 | EAS not logged in — cannot build AAB | High | Open |
| B2 | Phase 14 device QA incomplete | High | Open |
| B3 | Privacy policy URL missing | High | **[OWNER]** |
| B4 | Play Console app not created | Medium | **[OWNER]** |
| B5 | Production AAB not built | High | Open |

**Do not roll out publicly until:** Critical = 0, High = 0, privacy/legal sign-off complete.

---

## Documentation index

| Document | Purpose |
|----------|---------|
| `PLAY_STORE_LISTING.md` | Store copy |
| `PLAY_STORE_SCREENSHOTS_PLAN.md` | Screenshot capture plan |
| `PRIVACY_AND_DATA_SAFETY_NOTES.md` | Data safety / privacy draft |
| `ANDROID_PERMISSIONS_DISCLOSURE.md` | Permission rationale |
| `RELEASE_NOTES.md` | Version 1.0.0 notes |
| `EAS_BUILD.md` | Build commands |
| `INTERNAL_QA_CHECKLIST.md` | Device QA matrix |
| `INTERNAL_QA_BUG_LOG.md` | Bug tracking |
| `SECURITY_QA_CHECKLIST.md` | Security verification |

---

## Phase 15 sign-off

| Gate | Approved | By | Date |
|------|----------|-----|------|
| Static QA (Phase 17) | ✅ Pass | Engineering | 2026-06-12 |
| Device QA | ⬜ Pending | QA | |
| FINAL_RELEASE_REPORT.md | ✅ | Engineering | 2026-06-12 |
| Production AAB built | ⬜ | | |
| Internal track uploaded | ⬜ | | |
| Device smoke test passed | ⬜ | | |
| Legal/privacy approved | ⬜ | | |
| Ready for public production | ❌ | | |

---

## Phase 16 readiness (iOS / TestFlight)

Proceed to Phase 16 when:

- Android internal testing stable (Critical/High = 0)
- Privacy policy published
- Apple Developer account available
- iOS bundle ID and permissions aligned (`com.paramount.pims`)
