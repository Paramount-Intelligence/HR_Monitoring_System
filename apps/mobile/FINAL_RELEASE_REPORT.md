# PIMS Mobile — Final Release Report (Phase 17)

**Report date:** 2026-06-12  
**App version:** 1.0.0  
**Android versionCode:** 1  
**iOS buildNumber:** 1  

---

## 1. Release identifiers

| Item | Value |
|------|--------|
| App name | PIMS |
| Android package | `com.paramount.pims` |
| iOS bundle ID | `com.paramountintelligence.pims` |
| Backend API | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| WebSocket | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |
| EAS slug | `pims-mobile` |

---

## 2. Build profiles & artifacts

| Profile | Platform | Output | Status |
|---------|----------|--------|--------|
| `preview` | Android | APK | **Not built** — EAS login required |
| `production` | Android | AAB | **Not built** — EAS login required |
| `preview` | iOS | IPA | **Not built** — Apple account + EAS login |
| `production` | iOS | IPA | **Not built** — Phase 16 prep only |

**Preview APK URL:** _pending — run `npm run eas:build:preview` after `npx eas-cli login`_  
**Production AAB URL:** _pending — run `npm run eas:build:production`_

---

## 3. Commands run (Phase 17)

### Mobile

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Pass** |
| `npm run export:android` | **Pass** |
| `npm run export:ios` | **Pass** |
| `npx expo-doctor` | 17/18 — monorepo React duplicate (documented, mitigated by metro.config.js) |
| `npx eas-cli build --profile preview` | **Blocked** — not logged in to Expo |

### Backend

| Command | Result |
|---------|--------|
| `python -m compileall app` | **Pass** |
| `from app.main import app` | **Pass** |
| `pytest tests/` | **24 passed, 2 failed, 4 skipped, 1 error** |
| Production `/health` | **200** |
| Production `/api/v1/auth/login` (invalid creds) | **401** (reachable) |

**Pytest failures (pre-existing, not mobile blockers):**

- `test_ops_layer_phase1.py::test_overnight_shift_logic`
- `test_ops_layer_phase1.py::test_attendance_flags_persistence`
- `test_regression.py::test_user_list_scoping_fix` (ERROR — no intern seed in local DB)

---

## 4. Test accounts / roles

Use employer-issued accounts only. **No passwords stored in this report.**

| Role | Used for QA |
|------|-------------|
| Admin | RBAC, manage, reports, recordings admin |
| HR | Workforce, corrections, HR reports |
| Manager | Team, approvals, team reports |
| Team Lead | Team-scoped data |
| Employee | Core flows, restricted UI |
| Intern / Junior | Restricted RBAC |

_Device QA matrix:_ `INTERNAL_QA_CHECKLIST.md`, `IOS_QA_CHECKLIST.md`

---

## 5. Feature QA summary

Legend: **Code verified** = static audit + local export | **Device pending** = requires physical build

| Area | Code verified | Device pending | Notes |
|------|---------------|----------------|-------|
| Auth + SecureStore | Yes | Yes | Tokens in SecureStore only; refresh queue; logout cleanup wired |
| RBAC UI guards | Yes | Yes | Manage/reports/chat AuthShell + RoleAccessGuard |
| Backend RBAC | Yes | Partial | Phase 13 fixes; pytest RBAC tests pass when seeded |
| Dashboard | Yes | Yes | Role-based queries; profile URL via API origin |
| Attendance | Yes | Yes | Offline blocks check-in/out; classification labels; zero-duration note |
| Profile + upload | Yes | Yes | `resolveMediaUrl` uses API base; HEIC rejected on iOS |
| Messages + WS | Yes | Yes | Dedupe, offline queue, secure WS logs |
| Alerts + push | Yes | Yes | Expo Go skips push safely; device build required for push |
| Calls (WebRTC) | Yes | Yes | Dev/preview build only; not Expo Go |
| Recording | Yes | Yes | Android upload path; **iOS disabled** until TestFlight validation |
| Manage / approvals / reports | Yes | Yes | 403 handling; role guards |
| Offline / network | Yes | Yes | Banner, queue auth gate, logout clears queues |
| Deep links | Yes | Yes | `pims://` handler + post-login flush |
| UI/UX | Partial | Yes | KeyboardAvoidingView on modals/composer |

---

## 6. Security QA summary

| Check | Status |
|-------|--------|
| No localhost in mobile config | Pass |
| No secrets in mobile bundle | Pass |
| Tokens in SecureStore only | Pass |
| No token logs in production mobile code | Pass (`secureLog` / `__DEV__`) |
| Backend WS logs sanitized | Pass |
| No direct bucket upload from mobile | Pass |
| RBAC on sensitive API routes | Pass (Phase 13) |
| Recording admin-only on backend | Pass |
| Device-token auth + hijack fix | Pass |
| Offline cache cleared on logout | Pass |
| google-service-account.json gitignored | Pass |

---

## 7. RBAC QA summary

| Role | Expected | Code enforcement |
|------|----------|------------------|
| Employee/intern | No manage/admin | UI guards + backend 403 |
| Manager | Team-scoped only | `list_users` scoping |
| Team lead | Team-scoped | Same as manager scoping |
| HR | HR-permitted routes | Permission deps |
| Admin | Full admin features | Permission deps |

**Fail criteria not observed in code audit.** Device confirmation still required.

---

## 8. Offline QA summary

| Check | Status |
|-------|--------|
| Offline banner | Implemented |
| Check-in/out blocked offline | Implemented (Alert) |
| Message queue | Implemented |
| Sync requires access token | Implemented |
| Queue cleared on logout | Implemented (all user keys) |
| WS pause while offline | Implemented |
| Attendance not silently queued | Pass |

---

## 9. Known limitations

1. **EAS builds not executed** — Expo account login required on build machine.
2. **Physical device QA incomplete** — Phases 14–17 checklists not fully executed on hardware.
3. **iOS call recording disabled** until `IOS_CALL_RECORDING_VALIDATED = true`.
4. **No CallKit** — incoming calls when app killed not supported.
5. **Mobile recording** — local microphone only; remote audio not mixed.
6. **Monorepo React duplicate** — expo-doctor warning; metro pins React 19 for mobile.
7. **Privacy policy URL** — owner must publish before store submission.

---

## 10. Open bugs by severity

| Severity | Count | IDs / summary |
|----------|-------|----------------|
| **Critical** | 0 | — |
| **High** | 4 | BLOCKER-001 EAS login; BLOCKER-002/003 device QA; B5 no AAB built |
| **Medium** | 2 | Monorepo React duplicate; backend pytest ops failures |
| **Low** | 1 | BUG-004 attendance overview generic label — **fixed Phase 17** |

See `INTERNAL_QA_BUG_LOG.md` for full tracker.

---

## 11. Code changes in Phase 17

| File | Change |
|------|--------|
| `src/components/manage/AttendanceOverviewCard.tsx` | Show classification label instead of generic "Completed" |
| `FINAL_RELEASE_REPORT.md` | **New** — this document |
| `INTERNAL_QA_BUG_LOG.md` | Updated Phase 17 entries |
| `PRODUCTION_RELEASE_CHECKLIST.md` | Updated validation results |

---

## 12. Release documentation index

| Document | Purpose |
|----------|---------|
| `FINAL_RELEASE_REPORT.md` | This report |
| `INTERNAL_QA_CHECKLIST.md` | Android device QA |
| `INTERNAL_QA_BUG_LOG.md` | Bug tracker |
| `SECURITY_QA_CHECKLIST.md` | Security manual tests |
| `PRODUCTION_RELEASE_CHECKLIST.md` | Play Console gate |
| `PLAY_STORE_LISTING.md` | Store copy |
| `PRIVACY_AND_DATA_SAFETY_NOTES.md` | Data safety |
| `RELEASE_NOTES.md` | v1.0.0 notes |
| `IOS_TESTFLIGHT_PREP.md` | iOS / TestFlight |
| `IOS_QA_CHECKLIST.md` | iOS device QA |
| `IOS_BLOCKERS.md` | iOS blockers |

---

## 13. Release recommendation

### **Ready for internal testing — AFTER build + device QA gate**

The codebase passes static validation (typecheck, Android/iOS export, backend import). Security and RBAC hardening from Phase 13 remain in place. **Do not submit to Play Store or App Store yet.**

### Not ready for:

- Public production release
- Closed testing without preview APK on real devices
- Play Store production track
- TestFlight external testing (iOS credentials pending)

---

## 14. Next steps

1. `npx eas-cli login` on release engineer machine
2. `npm run eas:build:preview` → install on Android physical device
3. Execute `INTERNAL_QA_CHECKLIST.md` (admin, manager, employee)
4. Fix any Critical/High bugs found on device
5. `npm run eas:build:production` → upload AAB to Play **internal testing**
6. Publish privacy policy URL; complete Play Console declarations
7. When stable: iOS preview build + `IOS_QA_CHECKLIST.md`
8. Product owner sign-off before production track rollout

---

## 15. Sign-off

| Gate | Status | Owner | Date |
|------|--------|-------|------|
| Static QA (Phase 17) | Pass | Engineering | 2026-06-12 |
| Device QA | Pending | QA | |
| Security sign-off | Pending | Security | |
| Legal / privacy | Pending | Owner | |
| Play internal track | Pending | Release | |
| Production release | **Not approved** | — | |
