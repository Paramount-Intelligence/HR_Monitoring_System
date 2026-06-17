# PIMS Mobile — Feature Matrix

Legend:

- **Full** — Create, read, update, delete (where applicable)
- **Limited** — Scoped subset (e.g. own team only)
- **Read-only** — View only on mobile
- **N/A** — Not available for role
- **Deferred** — Not implemented or backend gap

Roles: **Admin**, **HR**, **Manager**, **Team Lead**, **Employee**, **Intern/Junior**

| Module | Admin | HR | Manager | Team Lead | Employee | Intern |
|--------|-------|-----|---------|-----------|----------|--------|
| **Dashboard** | Full (admin) | Full (HR) | Full (manager) | Full (lead) | Full (self) | Limited (guided) |
| **Attendance — own** | Full | Full | Full | Full | Full | Full |
| **Attendance — team view** | Full | Full | Limited | Limited | N/A | N/A |
| **Leave/WFH request** | Full | Full | Full | Full | Full | Full |
| **Correction request** | Full | Full | Full | Full | Full | Full |
| **Projects — view** | Full | Full | Limited | Limited | Limited | Read-only |
| **Projects — create** | Full | Full | Full | Limited | N/A | N/A |
| **Tasks — my tasks** | Full | Full | Full | Full | Full | Full |
| **Tasks — team tasks** | Full | Full | Full | Full | N/A | N/A |
| **Tasks — create/assign** | Full | Full | Full | Full | Limited | N/A |
| **Messages — chat** | Full* | Full* | Full* | Full* | Full* | Full* |
| **Voice notes** | Full* | Full* | Full* | Full* | Full* | Full* |
| **Voice/video calls** | Full* | Full* | Full* | Full* | Full* | Full* |
| **Alerts** | Full | Full | Full | Full | Full | Full |
| **Profile** | Full | Full | Full | Full | Full | Full |
| **User management** | Full | Full | N/A | N/A | N/A | N/A |
| **Approvals** | Full | Full | Limited | Limited | N/A | N/A |
| **Reports — employee** | Full | Full | Full | Full | Full | Full |
| **Reports — team** | Full | N/A | Full | Full | N/A | N/A |
| **Reports — workforce** | Full | Full | N/A | N/A | N/A | N/A |
| **Reports — admin analytics** | Full | N/A | N/A | N/A | N/A | N/A |
| **Permissions/Security tabs** | Full | Full | Read-only | Read-only | N/A | N/A |
| **Manage hub** | Full | Full | Limited | Limited | N/A | N/A |
| **Shifts/Operations** | Deferred | Deferred | Deferred | Deferred | Deferred | Deferred |

\* **Messages, voice notes, calls** require backend permission for messaging/calls per user. 403 = not permitted for that user/conversation, not a app bug.

---

## Bottom tabs (all roles)

All signed-in users see exactly these six tabs:

1. Dashboard  
2. Attendance  
3. Projects  
4. Tasks  
5. Messages  
6. Profile  

**Alerts** — bell icon only.  
**Manage** — Admin, HR, Manager, Team Lead only.

---

## Native feature requirements

| Feature | Expo Go | Dev/Preview APK |
|---------|---------|-----------------|
| Push notifications | No | Yes |
| WebRTC calls | No | Yes |
| Voice notes | Limited | Yes |
| SecureStore auth | Partial | Yes |

---

## Backend-dependent features

| Feature | Dependency |
|---------|------------|
| Voice note upload | API accepts `.m4a` / audio attachments on Railway |
| Push sound routing | Server `channelId`: `messages`, `alerts`, `incoming-calls` |
| Call signaling | WebSocket + REST call endpoints live |
| Permission edits | Backend RBAC; some edits web-only |
| Shifts/scheduling | Not in mobile v1 — deferred |

---

## Sound behavior (all roles)

| Event | Sound |
|-------|-------|
| Message notification | Device default (`messages` channel) |
| Alert notification | Device default (`alerts` channel) |
| Incoming call (background) | Device default (`incoming-calls` channel) |
| Incoming call (foreground) | Vibration only; no custom app ringtone |

---

## Read-only vs web

Mobile prioritizes field workflows. These may be **read-only** or **web-preferred**:

- Bulk permission templates
- Advanced audit export
- Complex report builder
- Shift/operations scheduling (deferred)

When in doubt, verify the same action on the PIMS web app with the same role.
