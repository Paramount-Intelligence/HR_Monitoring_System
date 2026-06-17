# PIMS Mobile — Testing & QA Guide

Use this checklist before preview APK sign-off and production release. Test on **physical Android** with a **native build** (development or preview), not Expo Go.

## Environment

- API: `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1`
- WebSocket: `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws`
- Two Android devices recommended for calls

---

## Auth

| # | Test | Expected |
|---|------|----------|
| A1 | Login valid credentials | Dashboard loads, six tabs visible |
| A2 | Login invalid password | Error message, no crash |
| A3 | Forgot password flow | Email sent / confirmation shown |
| A4 | Logout | Returns to login, tokens cleared |
| A5 | Kill app, reopen | Still logged in (SecureStore) |
| A6 | No token in logs | Console has no Bearer tokens |

---

## Bottom tabs

| # | Test | Expected |
|---|------|----------|
| T1 | Tab order | Dashboard, Attendance, Projects, Tasks, Messages, Profile |
| T2 | Alerts not in tab bar | Only via bell |
| T3 | Manage not in tab bar | Via dashboard/profile |
| T4 | Tab bar not clipped | Safe bottom inset on gesture nav devices |
| T5 | Message badge | Unread count on Messages tab |

---

## Dashboards by role

| Role | Verify |
|------|--------|
| Admin | Admin metrics, manage shortcuts |
| HR | HR dashboard content |
| Manager | Team overview, approvals entry |
| Team Lead | Team delivery view |
| Employee | Personal today view |
| Intern | Guided intern view |

---

## Attendance

| # | Test | Expected |
|---|------|----------|
| AT1 | Check in Office | Mode saved, status checked in |
| AT2 | Check in WFH | WFH mode recorded |
| AT3 | Check out | Session closed |
| AT4 | History list | Past sessions with 12h times |
| AT5 | Leave/WFH request | Submitted, pending state |
| AT6 | Correction request | Form submits |
| AT7 | Offline check-in | Blocked with offline message |

---

## Projects & tasks

| # | Test | Expected |
|---|------|----------|
| P1 | Project list loads | Cards render |
| P2 | Project detail | Opens without error |
| P3 | Create project (manager+) | Form submits |
| TK1 | My tasks list | Assigned tasks shown |
| TK2 | Team tasks (lead/manager) | Team scope |
| TK3 | Task detail + comment | Comment appears |
| TK4 | Status update | Persists after refresh |
| TK5 | Create task keyboard | Assignee visible above keyboard |

---

## Messages

| # | Test | Expected |
|---|------|----------|
| M1 | Conversation list | Loads for permitted user |
| M2 | New conversation | Search user, start chat |
| M3 | Send text | Delivered, realtime update |
| M4 | 403 user | Graceful empty/error, no redbox |
| M5 | Voice note record/send | Upload + playback (after API deploy) |
| M6 | Voice note offline | Blocked |

---

## Calls (two devices)

| # | Test | Expected |
|---|------|----------|
| C1 | Outgoing voice | Ringing → connected |
| C2 | Incoming voice | Modal, vibration, device default sound if push |
| C3 | Accept / decline | Vibration stops |
| C4 | Video call | Camera preview both sides |
| C5 | End call | Clean teardown, no audio leak |
| C6 | Mic denied | Settings prompt, no crash |

---

## Alerts

| # | Test | Expected |
|---|------|----------|
| AL1 | Bell opens alerts | Not a tab route |
| AL2 | Filters | Category/read filters work |
| AL3 | Mark read | Updates count |
| AL4 | Push tap | Navigates to alert/chat |

---

## Profile & admin

| # | Test | Expected |
|---|------|----------|
| PR1 | Profile picture upload | Image updates |
| PR2 | Device permissions card | Accurate status |
| PR3 | Push enable | System prompt Android 13+ |
| AD1 | User management 7 tabs | Admin/HR |
| AD2 | Approvals approve/reject | Status updates |
| AD3 | Reports open | Role-appropriate list |

---

## Push & sound

| # | Test | Expected |
|---|------|----------|
| PN1 | Channels created at login | Log: notification_channels_ready |
| PN2 | Message push | Device **default** tone, messages channel |
| PN3 | Alert push | Default tone, alerts channel |
| PN4 | Call push (background) | Default tone, incoming-calls channel |
| PN5 | Foreground call | **No custom WAV loop**; vibration only |
| PN6 | No double sound | Accept stops vibration |

---

## Header spacing

| # | Test | Expected |
|---|------|----------|
| H1 | Dashboard top | No large white gap above PIMS header |
| H2 | All tab screens | Header below status bar, not under it |
| H3 | Alerts / Manage | Consistent header inset |
| H4 | Chat header | No double top padding |
| H5 | Right-side text | No clipping on dashboard header, badges, bell |
| H6 | Metric grid | 2-column cards fit within screen width |

---

## Offline & security

| # | Test | Expected |
|---|------|----------|
| O1 | Airplane mode banner | Offline banner shown |
| O2 | No UUID in UI labels | User-friendly names only |
| O3 | No secrets in logs | No tokens, SDP, full WS URLs |

---

## Android physical device QA

- Test on Android 13+ for POST_NOTIFICATIONS
- Test gesture navigation bottom inset
- Test back button from chat → messages list
- Test deep link `pims://` routes (not dev-client URL)

---

## Preview APK QA

After `eas build --profile preview`:

1. Uninstall old APK if package conflicts
2. Install new APK
3. Ignore “can’t verify app” for sideload (expected)
4. Run full checklist above

---

## Production readiness checklist

- [ ] Typecheck passes
- [ ] `npx expo export --platform android` passes
- [ ] Header spacing verified on device
- [ ] Device default notification sounds verified
- [ ] Voice notes work (API deployed for `.m4a`)
- [ ] WebRTC dev build with `newArchEnabled: false`
- [ ] Push token registers on login
- [ ] No critical crashes on back navigation
- [ ] Version/build number bumped in `app.json`
- [ ] Documentation reviewed in `apps/mobile/docs/`
