# PIMS iOS — QA Checklist (TestFlight / Internal)

Complete on a **physical iPhone** using preview or production iOS build (not Expo Go).

---

## Build info

| Field | Value |
|-------|--------|
| App version | 1.0.0 |
| iOS buildNumber | 1 |
| Build profile | preview / production / ios-simulator |
| EAS build URL | |
| Backend API | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| WebSocket | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |
| Tester name | |
| iPhone model | |
| iOS version | |
| Test date | |

---

## Auth

- [ ] Login (employee)
- [ ] Login (manager)
- [ ] Login (admin)
- [ ] Token refresh after app kill + reopen
- [ ] Logout clears session
- [ ] Deep link while logged out → login → lands on intended screen

---

## Employee

- [ ] Dashboard
- [ ] Attendance check-in / check-out
- [ ] Profile edit
- [ ] Profile photo upload (JPEG/PNG)
- [ ] HEIC rejection message (if testing with HEIC source)
- [ ] Messages list + send
- [ ] Alerts
- [ ] Employee cannot access Manage tab

---

## Manager / Admin

- [ ] Manage hub visible (role-based)
- [ ] Approvals
- [ ] Reports
- [ ] RBAC — no unauthorized data

---

## Realtime

- [ ] WebSocket connects
- [ ] Message received live
- [ ] Alert received live
- [ ] Reconnect after airplane mode

---

## Push

- [ ] Permission prompt (after login)
- [ ] Token registered on backend
- [ ] Notification received (background)
- [ ] Tap → chat / alerts / correct screen
- [ ] Logout deactivates token

---

## Calls

- [ ] Outgoing voice call
- [ ] Incoming voice call accept/decline
- [ ] Video call + camera permission
- [ ] Mute toggle
- [ ] Camera on/off
- [ ] End call — tracks stop
- [ ] No crash when backgrounding during call (document behavior)

---

## Recording

- [ ] Recording shows **unsupported** or hidden on iOS (expected in Phase 16)
- [ ] No fake “recording success” on iOS
- [ ] No empty file upload attempted

---

## Offline

- [ ] Offline banner
- [ ] Cached data visible
- [ ] Message queued offline, sent on reconnect
- [ ] Logout clears queue

---

## Security

- [ ] No tokens in Xcode console / device logs
- [ ] 403 shows access denied (no logout loop)
- [ ] Restricted routes blocked

---

## UI / iOS layout

- [ ] Safe area (notch / Dynamic Island)
- [ ] Home indicator spacing on tab bar
- [ ] Keyboard avoids chat composer
- [ ] Modals not clipped
- [ ] Splash + icon correct
- [ ] No horizontal overflow

---

## Deep links (`pims://`)

- [ ] `pims://` → dashboard (when authenticated)
- [ ] `pims://chat/{id}` → conversation
- [ ] `pims://alerts` → notifications tab
- [ ] `pims://manage/approvals/{id}` → approval detail

---

## Sign-off

| Role | Pass | Fail | Notes |
|------|------|------|-------|
| Employee | | | |
| Manager | | | |
| Admin | | | |

**Approved for external TestFlight:** Yes / No
