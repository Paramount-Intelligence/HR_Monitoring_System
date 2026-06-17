# PIMS Mobile — Admin & Manager Guide

Guide for **Admin**, **HR Operations**, **Manager**, and **Team Lead** roles using mobile admin tools.

## Role dashboards

| Role | Dashboard focus | Manage access |
|------|-----------------|---------------|
| **Admin** | Workforce control, system metrics | Full Manage hub |
| **HR Operations** | People operations, pending HR items | HR Manage hub |
| **Manager** | Team health, approvals, delivery | Team Manage hub |
| **Team Lead** | Assigned team delivery | Team Lead Manage hub |
| **Employee / Intern** | Personal workday | No Manage hub |

---

## Opening Manage

Manage is **not** a bottom tab. Access via:

- Dashboard quick actions (role-dependent)
- Profile shortcuts
- Direct routes: `/manage/*` (from links in app)

Title varies: **Admin Manage**, **HR Operations**, **Team Manage**, **Team Lead**.

---

## User management (Admin & HR)

Available under **Manage → Users** for Admin and HR Operations.

### User list

Search and filter users. Tap a user to open the **7-tab admin panel**:

| Tab | Purpose |
|-----|---------|
| **Profile** | Name, email, job title, contact |
| **Access** | Role assignment, account status |
| **Department** | Department and reporting manager |
| **Permissions** | Feature permissions (backend-driven) |
| **Security** | Password reset triggers, lock status |
| **Activity** | Recent sign-in / activity summary |
| **Audit** | Audit trail entries |

### What you can change

- **Admin / HR** — Full user CRUD where backend allows
- **Manager / Team Lead** — **No** full user management; team-scoped views only

If an action is read-only on mobile, the backend may restrict updates — use the web app for advanced edits.

---

## Managing roles

Roles: Admin, HR Operations, Manager, Team Lead, Employee, Intern/Junior Employee.

Change role in **Access** tab (Admin/HR only). Changes take effect on next login or token refresh.

---

## Managing permissions

**Permissions** tab shows effective permissions from the backend. Mobile reflects server state; bulk permission templates may be web-only.

---

## Departments & reporting manager

Edit in **Department** tab:

- Assign department
- Set reporting manager
- View org relationships

---

## Approvals

**Manage → Approvals** (Admin, HR, Manager, Team Lead)

### Leave / WFH

- View pending leave and WFH requests
- Open detail → **Approve** or **Reject** with optional comment
- Filter by status

### Attendance corrections

- Review correction requests with original vs requested times
- Approve or reject; employee is notified via backend

---

## Reports

**Manage → Reports** or dashboard links.

| Report | Who can access |
|--------|----------------|
| Employee (self) | All roles |
| Team | Admin, Manager, Team Lead |
| Workforce | Admin, HR |
| Attendance / Leave summaries | Role-filtered |
| Admin analytics | Admin only |

Use date range filters and export options where implemented. Some advanced reports are web-only.

---

## Projects management

- View all projects (scope depends on role)
- Create projects (managers+ where allowed)
- Approve project submissions if in approval workflow
- Open project detail for task linkage

---

## Tasks assignment

- **Create task** — assign to team members
- **Team Tasks** — monitor team workload
- **Edit task** — update assignee, priority, due date (role-dependent)

---

## Alerts monitoring

- Bell icon → **Alerts** center
- Filter by category / read status
- Resolve or acknowledge when backend supports action
- Push notifications use **alerts** channel (device default sound)

---

## Actions by role summary

| Action | Admin | HR | Manager | Team Lead | Employee |
|--------|-------|-----|---------|-----------|----------|
| User management (full) | ✓ | ✓ | — | — | — |
| Approvals | ✓ | ✓ | ✓ | ✓ | — |
| Team attendance view | ✓ | ✓ | ✓ | ✓ | — |
| Reports (team) | ✓ | — | ✓ | ✓ | — |
| Reports (workforce) | ✓ | ✓ | — | — | — |
| Create project | ✓ | ✓ | ✓ | Limited | — |
| Assign tasks | ✓ | ✓ | ✓ | ✓ | Self only |
| Manage hub | ✓ | ✓ | ✓ | ✓ | — |

---

## Read-only / backend gaps

- Some permission matrix edits may be **web-only**
- Shift scheduling / advanced operations may be **deferred**
- Voice note uploads require **API deploy** for `.m4a` on production Railway
- Push `channelId` must be set server-side for correct Android sound routing
- Call recording upload depends on backend storage configuration

When mobile shows data but no edit button, assume backend or role restriction — verify on web admin if needed.
