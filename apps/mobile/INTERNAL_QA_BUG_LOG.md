# PIMS Mobile — Internal QA Bug Log (Phase 14)

Log issues found during development/preview APK testing. Fix **Critical** and **High** before production AAB (Phase 15).

---

## Severity guide

| Level | Examples |
|-------|----------|
| **Critical** | App crash on launch, login impossible, data leak, core flow broken |
| **High** | Attendance/messages/WS fail, RBAC bypass, upload broken, calls unusable |
| **Medium** | UI broken but workaround exists, slow screen, retry issues |
| **Low** | Spacing, labels, minor visual polish |

---

## Bug template

```markdown
## BUG-001 — [Short title]

**Build:** preview | development | version 1.0.0 (versionCode 1)  
**EAS URL:**  
**Device:** e.g. Samsung Galaxy A54, Android 14  
**Role:** employee | manager | admin  
**Screen:** e.g. Messages / Chat  

### Steps to reproduce
1.
2.
3.

### Expected


### Actual


**Severity:** Critical | High | Medium | Low  
**Screenshot/video:**  
**Logs:** (no tokens — redact Authorization headers)  
**Status:** Open | Fixed | Won't fix  
**Fix commit/file:**  
```

---

## Fixed bugs

### BUG-004 — Manage attendance showed generic "Completed" label

**Severity:** Low  
**Status:** Fixed (Phase 17)  
**Fix:** `AttendanceOverviewCard.tsx` — prefer `attendance_classification` label (Full Day, Half Day, Full Leave, etc.) over generic "Completed".

---

## Open bugs

### BLOCKER-001 — EAS account not logged in

**Build:** N/A (build not started)  
**Device:** N/A  
**Role:** N/A  
**Screen:** N/A  

### Steps to reproduce
1. Run `npm run eas:build:preview` without `eas login`

### Expected
EAS build queues on Expo servers

### Actual
`An Expo user account is required to proceed`

**Severity:** High (blocks APK generation)  
**Status:** Open  
**Fix:** Run `npx eas-cli login`, then `npx eas-cli build:configure`, then rebuild. See `EAS_BUILD.md`.

### BLOCKER-002 — Production AAB not built (Phase 15)

**Severity:** High  
**Status:** Open  
**Fix:** `npx eas-cli login` → `npm run eas:build:production`. See `PRODUCTION_RELEASE_CHECKLIST.md`.

### BLOCKER-003 — Phase 14 device QA incomplete

**Severity:** High  
**Status:** Open  
**Fix:** Complete preview APK testing per `INTERNAL_QA_CHECKLIST.md` before Play internal track.

---

## Phase 17 audit (2026-06-12)

| Check | Result |
|-------|--------|
| Mobile typecheck | Pass |
| Android/iOS export | Pass |
| Critical code bugs | 0 |
| Security/RBAC audit | Pass |

See `FINAL_RELEASE_REPORT.md`.

---

## Known limitations (not bugs)

| Item | Notes |
|------|--------|
| Expo Go | WebRTC, push, and native recording require dev/preview APK |
| Mobile recording | Local mic only; remote audio not mixed |
| EAS login required | Builds must be triggered from logged-in Expo account |
| Push on Android | Requires physical device + EAS projectId in app config |

---

## Build history

| Build # | Profile | versionCode | EAS URL | Date | Critical | High | Medium | Low |
|---------|---------|-------------|---------|------|----------|------|--------|-----|
| 1 | preview | 1 | _pending_ | 2026-06-12 | 0 | 3 | 0 | 0 (1 fixed) |
