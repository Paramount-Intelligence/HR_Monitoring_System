# PIMS Mobile — User Guide

This guide explains how to use the PIMS mobile app day to day. No technical background required.

## Getting started

### Login

1. Open the PIMS app (development or preview build — not Expo Go for full features).
2. Enter your work email and password.
3. Tap **Sign in**.

Your session is stored securely on the device. You stay signed in until you log out.

### Forgot password

1. On the login screen, tap **Forgot password?**
2. Enter your registered email.
3. Check your inbox for reset instructions from PIMS.
4. Complete the reset on web or email link, then return to the app and sign in.

---

## Navigation

### Bottom tabs (always visible when signed in)

| Tab | What you do here |
|-----|------------------|
| **Dashboard** | Role-specific overview, quick actions |
| **Attendance** | Check in/out, history, leave requests |
| **Projects** | View and open projects |
| **Tasks** | Your tasks and team tasks (if allowed) |
| **Messages** | Chat list and conversations |
| **Profile** | Your account and device settings |

### Not in the tab bar

- **Alerts** — Tap the **bell** on the dashboard header (top right).
- **Manage** — Available from dashboard quick actions or profile for managers/HR/admin.

---

## Dashboard

Your dashboard changes by role:

- **Employee / Intern** — Today’s summary, attendance shortcut, assigned tasks
- **Team Lead / Manager** — Team metrics, pending approvals, workload
- **HR** — People operations overview
- **Admin** — Workforce control and analytics entry points

Pull down to refresh. If offline, you see an offline banner and refresh is blocked until connected.

---

## Attendance

### Check in

1. Open the **Attendance** tab.
2. If not checked in, tap **Check in**.
3. Choose **Office** or **WFH** (work from home) when prompted.
4. Confirm — your check-in time is recorded.

### Check out

1. While checked in, tap **Check out**.
2. Your session closes and hours are saved.

### View history

Scroll the attendance list on the Attendance tab. Tap a row for more detail.

### Request correction

If a session is wrong:

1. Open the session detail (or correction flow from attendance).
2. Submit an **Attendance correction** with the correct times and reason.
3. Wait for manager/HR approval.

### Leave / WFH request

1. From Attendance or dashboard quick action, open **Leave / WFH Request**.
2. Choose dates and type (leave or WFH).
3. Submit — track status under approvals (managers) or your history.

---

## Projects

### View projects

Open the **Projects** tab. Use search and filters if shown.

### Open project detail

Tap a project card to see description, progress, and linked tasks.

### Create project

If your role allows creation, tap **Create project**, fill the form, and submit for approval (manager workflow).

### Progress and tasks

Project detail shows progress summary and related tasks where the backend provides them.

---

## Tasks

### My Tasks

Open the **Tasks** tab — default view is tasks assigned to you.

### Team Tasks

Managers, team leads, and similar roles may see **Team Tasks** (from tab actions or separate screen). This shows team workload.

### Task detail

Tap a task to see status, assignee, due date, description, and comments.

### Update status

On task detail, change status when your role permits (e.g. In Progress → Done).

### Comments

Add comments on the task detail screen to communicate with assignees and managers.

### Create task

If allowed, use **Create task**, pick assignee(s), set priority and due date, then save.

---

## Messages

### New message

1. Open **Messages** tab.
2. Tap **New message** (or compose icon).
3. Search and select a colleague.
4. Start chatting.

### Send text

Type in the composer at the bottom and tap send.

### Voice note

1. In a chat, tap and hold the **microphone** (or voice note control).
2. Record up to 60 seconds.
3. Preview, then send or cancel.
4. Requires microphone permission (granted on first use).

**Note:** Voice notes require the production API to accept audio attachments. If upload fails with “file type not supported,” contact IT — the backend may need an update.

### Voice / video call

From an open chat, use the **phone** or **video** icons in the header (when calls are enabled for your account).

- Grant microphone (and camera for video) when prompted.
- Accept or decline incoming calls from the full-screen modal.
- End call with the red hang-up button.

Calls require a **native app build**, not Expo Go.

---

## Alerts

1. Tap the **bell** on the dashboard header.
2. Browse workforce alerts.
3. Use filters (category, read/unread) if available.
4. Tap an alert to open detail; mark read or resolve when options exist.

Alerts also appear via push notifications when enabled (device default sound).

---

## Profile

### View profile

Open the **Profile** tab to see name, role, department, and contact info.

### Profile picture

Tap your photo → choose camera or gallery → upload. Requires photo permission.

### Permissions & device readiness

The profile screen shows status for:

- Push notifications  
- Microphone / camera (for calls)  
- Network connectivity  

Use **Open Settings** links if a permission was denied.

### Logout

Scroll to **Log out**. This clears secure tokens and returns you to login.

---

## Tips

- Use **12-hour time** (AM/PM) throughout the app.
- Stay on the same Wi‑Fi as your dev machine when testing development builds.
- Enable notifications in Profile for message and call alerts.
- Alerts are **not** a bottom tab — always use the bell icon.
