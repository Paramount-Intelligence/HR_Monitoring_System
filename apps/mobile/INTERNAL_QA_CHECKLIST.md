# PIMS Mobile — Internal QA Checklist (Phase 14)

Use this checklist when testing **development** or **preview** APK builds on physical Android devices against the production Railway backend.

---

## Build info (fill per build)

| Field | Value |
|-------|--------|
| App version | 1.0.0 |
| Android versionCode | 1 |
| Build profile | `development` / `preview` |
| EAS build URL | _paste from EAS dashboard_ |
| APK download URL | _paste artifact link_ |
| Backend API | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| WebSocket | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |
| Build date | |
| Tester name | |
| Device model | |
| Android version | |
| Expo account / owner | |

---

## Pre-install verification

- [ ] APK built with `preview` or `development` profile (not production AAB)
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to production Railway (no localhost)
- [ ] No backend secrets in app bundle
- [ ] Install from EAS link or `adb install app.apk`

---

## Auth

- [ ] Login with employee account
- [ ] Login with manager account
- [ ] Login with admin account
- [ ] App restart preserves session (token refresh)
- [ ] Logout clears session and returns to login
- [ ] Invalid credentials show friendly error
- [ ] Expired session redirects to login after refresh failure

---

## Employee / intern

- [ ] Dashboard loads
- [ ] Attendance check-in
- [ ] Attendance check-out
- [ ] Profile view + edit
- [ ] Profile photo upload
- [ ] Messages list + conversation
- [ ] Send message (Slack-style composer)
- [ ] Alerts list + mark read
- [ ] Employee reports (if role allows)
- [ ] Manage tab **hidden** or access denied
- [ ] Admin reports **not accessible**

---

## Manager / team lead

- [ ] Manage hub visible
- [ ] Team list scoped (not full org unless authorized)
- [ ] Team attendance
- [ ] Approvals list + detail
- [ ] Team reports
- [ ] Cannot access admin-only workforce analytics if not HR/admin

---

## Admin / HR

- [ ] Users directory (scoped by role)
- [ ] User detail screen
- [ ] Workforce / admin reports
- [ ] Leave / corrections / attendance overview (as permitted)
- [ ] Call recording admin access (web/admin only — mobile may not expose)

---

## Realtime (WebSocket)

- [ ] WS connects after login (status indicator if shown)
- [ ] Incoming message appears without manual refresh
- [ ] Alert notification via WS
- [ ] Reconnect after airplane mode / Wi‑Fi toggle
- [ ] No reconnect loop while logged out
- [ ] No token or full WS URL in logcat

---

## Calls (dev client / preview APK only — not Expo Go)

- [ ] Outgoing voice call
- [ ] Incoming voice call accept/decline
- [ ] Outgoing video call
- [ ] Mute toggle
- [ ] Camera on/off
- [ ] End call (both sides)
- [ ] Microphone/camera permission prompts
- [ ] Call disabled or warning when offline

---

## Call recording

- [ ] Recording indicator during call (if supported)
- [ ] Upload completes after call end
- [ ] Upload retry after network restore
- [ ] Normal user cannot browse recordings in app

---

## Push notifications (physical device only)

- [ ] Permission prompt on first launch (Android 13+)
- [ ] Device token registers after login
- [ ] Push received for new message (app backgrounded)
- [ ] Push received for alert
- [ ] Tap notification opens correct screen
- [ ] Logout deactivates token
- [ ] Expo Go: push skipped gracefully (expected)

---

## Offline / weak network

- [ ] Offline banner appears when disconnected
- [ ] Cached dashboard/messages visible
- [ ] Message queued when offline, sends on reconnect
- [ ] Reconnected banner after restore
- [ ] No sync of queued items after logout

---

## Security

- [ ] No access/refresh tokens in logcat
- [ ] Employee cannot deep-link into `/manage`
- [ ] 403 shows access denied (no logout)
- [ ] Logout clears sensitive cached data

---

## UI / UX

- [ ] App icon and splash display correctly
- [ ] No broken/missing icons
- [ ] No clipped text on small screen
- [ ] No horizontal overflow on lists
- [ ] Modals fully visible (call overlay, alerts)
- [ ] Chat composer keyboard-safe
- [ ] Bottom tabs not overlapping system nav

---

## Sign-off

| Role tested | Pass | Fail | Notes |
|-------------|------|------|-------|
| Employee | | | |
| Manager | | | |
| Admin | | | |

**Build approved for wider internal distribution:** Yes / No  
**Approved by:**  
**Date:**

---

## Related docs

- Security QA: `SECURITY_QA_CHECKLIST.md`
- Bug log: `INTERNAL_QA_BUG_LOG.md`
- EAS build steps: `EAS_BUILD.md`
