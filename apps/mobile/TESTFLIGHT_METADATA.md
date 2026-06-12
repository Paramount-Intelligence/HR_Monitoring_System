# PIMS — TestFlight Metadata (Draft)

Use placeholders in git. Enter real values only in App Store Connect.

---

## Beta App Description

PIMS is your organization’s mobile workforce app. Sign in with your company account to manage attendance, messages, alerts, and role-based workflows from your iPhone.

This TestFlight build connects to the production workforce platform. Features vary by role (employee, manager, HR, admin).

---

## What to Test

### Authentication
- [ ] Login and logout
- [ ] Session persists after app restart
- [ ] Invalid credentials show friendly error

### Employee
- [ ] Dashboard
- [ ] Attendance check-in / check-out
- [ ] Profile edit and profile photo upload
- [ ] Messages and chat composer
- [ ] Alerts list

### Manager / Admin
- [ ] Manage hub (role-based)
- [ ] Approvals
- [ ] Reports

### Realtime
- [ ] WebSocket connects after login
- [ ] Incoming messages without manual refresh
- [ ] Reconnect after Wi‑Fi / cellular switch

### Push notifications
- [ ] Permission prompt after login
- [ ] Token registers with backend
- [ ] Tap notification opens correct screen

### Calls (if enabled for your org)
- [ ] Voice call
- [ ] Video call
- [ ] Mute and camera toggle
- [ ] End call

### Offline
- [ ] Offline banner
- [ ] Queued message sends on reconnect

### Known iOS limitations for this build
- Call recording is **disabled** on iOS until validated in TestFlight
- Incoming calls do not ring when app is force-quit (no CallKit)
- Employer-issued account required

---

## Beta App Review Information

| Field | Placeholder |
|-------|-------------|
| Contact first name | `REVIEW_CONTACT_FIRST_NAME_PLACEHOLDER` |
| Contact last name | `REVIEW_CONTACT_LAST_NAME_PLACEHOLDER` |
| Contact email | `REVIEW_CONTACT_EMAIL_PLACEHOLDER` |
| Contact phone | `REVIEW_CONTACT_PHONE_PLACEHOLDER` |
| Demo account email | `DEMO_EMAIL_PLACEHOLDER` |
| Demo account password | `DEMO_PASSWORD_PLACEHOLDER` |

### Review notes (paste into ASC)

```
PIMS is an internal workforce management app. Login requires an employer-issued account.

Demo credentials are provided above. After login:
- Employees see Dashboard, Attendance, Messages, Alerts, Profile tabs.
- Managers/Admins additionally see Manage tab based on role.

The app uses camera/microphone only for optional video/voice calls and profile photo capture.
Push notifications require user permission on iOS.

No public self-registration. No in-app purchases.
```

---

## TestFlight groups (suggested)

| Group | Purpose |
|-------|---------|
| Internal QA | Engineering + QA |
| Managers | Manager-role testers |
| HR/Admin | HR and admin workflows |
| Employees | General workforce testers |

---

## Release notes (TestFlight — version 1.0.0 build 1)

```
Initial PIMS iOS TestFlight release:
• Secure login and attendance
• Messages, alerts, and push notifications
• Manager/admin workflows and reports
• Voice/video calls
• Stability and security improvements

Note: iOS call recording is disabled pending validation in this build.
```

---

## Sign-off

| Role | Approved | Date |
|------|----------|------|
| Product | ⬜ | |
| Legal/Privacy | ⬜ | |
| Engineering | ⬜ | |
