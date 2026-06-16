# PIMS Web Frontend Overview

**App:** `apps/web`  
**Framework:** Next.js 15 (App Router) + React + TypeScript  
**Styling:** Tailwind CSS + CSS variables (light/dark via `ThemeProvider`)  
**UI:** shadcn-style components (Radix + Base UI Select)  
**API:** Axios client → `/api/v1` (proxied to FastAPI backend)  
**Realtime:** WebSocket (`RealtimeProvider`)  
**Calls:** WebRTC (`CallProvider`, global call UI)

This document is a single reference for routes, pages, sections, components, and supporting code in the web frontend.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Routes & Pages](#routes--pages)
3. [Navigation by Role](#navigation-by-role)
4. [Layout & Shell](#layout--shell)
5. [Page Sections & Tabs](#page-sections--tabs)
6. [Components](#components)
7. [API Client Layer](#api-client-layer)
8. [Hooks & Providers](#hooks--providers)
9. [Types & Utilities](#types--utilities)
10. [Auth & Access Control](#auth--access-control)
11. [Key Features](#key-features)
12. [Scripts & Config](#scripts--config)

---

## Directory Structure

```
apps/web/
├── public/                    # Static assets (logo, etc.)
├── src/
│   ├── app/                   # Next.js App Router pages & layouts
│   │   ├── (auth)/            # Login, activate, forgot/reset password
│   │   ├── (dashboard)/       # Authenticated app (AppShell)
│   │   ├── layout.tsx         # Root layout (Auth, Theme, Toaster)
│   │   └── page.tsx           # Home → role dashboard redirect
│   ├── components/            # Reusable UI & feature components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # API clients, auth, utils, helpers
│   ├── providers/             # Realtime & Call context providers
│   └── types/                 # Shared TypeScript interfaces
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Routes & Pages

### Public / Auth

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Redirects to role dashboard or `/login` |
| `/login` | `(auth)/login/page.tsx` | Email/password login |
| `/activate` | `(auth)/activate/page.tsx` | New user account activation / setup |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | Request password reset link |
| `/reset-password` | `(auth)/reset-password/page.tsx` | Set new password from token |
| `/unauthorized` | `unauthorized/page.tsx` | Access denied page |

### Shared (all authenticated roles)

| Route | File | Purpose |
|-------|------|---------|
| `/profile` | `(dashboard)/profile/page.tsx` | User profile, password, profile picture |
| `/messages` | `(dashboard)/messages/page.tsx` | Communication center (DMs, groups, calls) |
| `/calendar` | `(dashboard)/calendar/page.tsx` | Live calendar / meetings |
| `/help-support` | `(dashboard)/help-support/page.tsx` | Help articles & support ticket submission |

### Admin

| Route | File | Purpose |
|-------|------|---------|
| `/admin` | `(dashboard)/admin/page.tsx` | Admin root redirect |
| `/admin/dashboard` | `admin/dashboard/page.tsx` | Org governance dashboard (tabbed) |
| `/admin/users` | `admin/users/page.tsx` | User list, create user, manage drawer |
| `/admin/users/profile` | `admin/users/profile/page.tsx` | Admin 360° employee profile view |
| `/admin/projects` | `admin/projects/page.tsx` | All projects oversight |
| `/admin/tasks` | `admin/tasks/page.tsx` | All tasks oversight |
| `/admin/organization` | `admin/organization/page.tsx` | Departments, shifts, holidays, announcements |
| `/admin/holidays` | `admin/holidays/page.tsx` | Holiday calendar (standalone) |
| `/admin/announcements` | `admin/announcements/page.tsx` | Announcements (standalone) |
| `/admin/permissions` | `admin/permissions/page.tsx` | Role & permission management |
| `/admin/reports` | `admin/reports/page.tsx` | Organization reports |
| `/admin/audit-logs` | `admin/audit-logs/page.tsx` | System audit log viewer |
| `/admin/alerts` | `admin/alerts/page.tsx` | System alerts |
| `/admin/call-recordings` | `admin/call-recordings/page.tsx` | Call recording review |
| `/admin/operations/shifts` | `admin/operations/shifts/page.tsx` | Shift management (operations) |

### HR Operations

| Route | File | Purpose |
|-------|------|---------|
| `/hr/dashboard` | `hr/dashboard/page.tsx` | HR operations dashboard |
| `/hr/reports` | `hr/reports/page.tsx` | HR reports |

_HR also uses admin routes for users, organization, holidays, announcements, reports, alerts (via sidebar)._

### Manager

| Route | File | Purpose |
|-------|------|---------|
| `/manager` | `manager/page.tsx` | Manager root redirect |
| `/manager/dashboard` | `manager/dashboard/page.tsx` | Manager dashboard (tabbed) |
| `/manager/team` | `manager/team/page.tsx` | Direct reports / team members |
| `/manager/projects` | `manager/projects/page.tsx` | Team projects |
| `/manager/projects/details` | `manager/projects/details/page.tsx` | Single project detail |
| `/manager/tasks` | `manager/tasks/page.tsx` | Assign & manage team tasks |
| `/manager/my-tasks` | `manager/my-tasks/page.tsx` | Manager's own tasks |
| `/manager/my-attendance` | `manager/my-attendance/page.tsx` | Manager attendance |
| `/manager/my-eod` | `manager/my-eod/page.tsx` | Manager EOD submissions |
| `/manager/approvals` | `manager/approvals/page.tsx` | Leave & attendance approvals |
| `/manager/eod-reviews` | `manager/eod-reviews/page.tsx` | Review team EOD reports |
| `/manager/leaves` | `manager/leaves/page.tsx` | Team leave requests |
| `/manager/reports` | `manager/reports/page.tsx` | Manager reports |
| `/manager/analytics` | `manager/analytics/page.tsx` | Intelligence & analytics |
| `/manager/workload` | `manager/workload/page.tsx` | Team workload view |
| `/manager/growth` | `manager/growth/page.tsx` | Team growth |
| `/manager/time-logs` | `manager/time-logs/page.tsx` | Time logging |

### Team Lead

| Route | File | Purpose |
|-------|------|---------|
| `/team-lead/dashboard` | `team-lead/dashboard/page.tsx` | Team lead dashboard |

_Team lead sidebar also links to employee attendance/tasks/EOD/leaves and manager team tasks._

### Employee / Intern / Junior Employee

| Route | File | Purpose |
|-------|------|---------|
| `/employee` | `employee/page.tsx` | Employee root redirect |
| `/employee/dashboard` | `employee/dashboard/page.tsx` | Employee dashboard (tabbed) |
| `/employee/attendance` | `employee/attendance/page.tsx` | Check-in/out, breaks, corrections |
| `/employee/projects` | `employee/projects/page.tsx` | Assigned projects |
| `/employee/tasks` | `employee/tasks/page.tsx` | Assigned tasks |
| `/employee/time-logs` | `employee/time-logs/page.tsx` | Time tracking |
| `/employee/eod` | `employee/eod/page.tsx` | End-of-day reports |
| `/employee/leaves` | `employee/leaves/page.tsx` | Leave requests |
| `/employee/growth` | `employee/growth/page.tsx` | Personal growth goals |
| `/employee/duties` | `employee/duties/page.tsx` | Duties / responsibilities |
| `/employee/reports` | `employee/reports/page.tsx` | Personal reports |

---

## Navigation by Role

Sidebar config: `src/components/layout/Sidebar.tsx`

| Role | Primary nav items |
|------|-------------------|
| **employee / intern / junior_employee** | Dashboard, Attendance, Projects*, Tasks, Time Logs, My EOD, Leaves, My Growth |
| **team_lead** | Dashboard, My Attendance, My Tasks, Team Tasks*, My EOD, Leaves, My Growth |
| **manager** | Dashboard, Team Members, Projects, Tasks, Reports, Settings (profile), My Attendance, My Tasks, Approvals, EOD Reviews |
| **hr_operations** | HR Dashboard, All Users, Attendance & Leaves, Organization, Holidays, Announcements, Reports, Alerts |
| **admin** | Org Dashboard, Users & Teams, All Projects, Tasks, Organization, Holidays, Announcements, Permissions, Reports, Audit Logs, Call Recordings*, Alerts |

\* = permission-gated (`hasPermission`)  
**All roles** also get: Messages, Calendar, Help & Support

---

## Layout & Shell

| File | Role |
|------|------|
| `src/app/layout.tsx` | Root: Roboto font, `ThemeProvider`, `AuthProvider`, Sonner toasts |
| `src/app/(dashboard)/layout.tsx` | Wraps authenticated pages in `AppShell` |
| `src/components/layout/AppShell.tsx` | Sidebar + Header + main content; mounts Realtime, Calls, browser notifications |
| `src/components/layout/Sidebar.tsx` | Role-based navigation, unread messages badge, logout |
| `src/components/layout/Header.tsx` | Top bar, notifications, timer, theme toggle, profile menu |
| `src/components/layout/HeaderTimer.tsx` | Active task timer in header |
| `src/components/layout/Breadcrumbs.tsx` | Breadcrumb navigation |
| `src/components/layout/ThemeToggle.tsx` | Light/dark mode toggle |

---

## Page Sections & Tabs

### Admin Governance Dashboard (`/admin/dashboard`)

Tabs via `AdminDashboardTabs`:

| Tab | Component | Content |
|-----|-----------|---------|
| Overview | `AdminOverviewTab` | KPI metrics, charts, org snapshot |
| User Management | `AdminUserManagementTab` | User stats & quick actions |
| Communication | `AdminCommunicationTab` | Messaging/meeting activity |
| Project & Tasks | `AdminProjectTasksTab` | Project/task governance |

Supporting: `AdminMetricCard`, `AdminChartCard`, `AdminDataTable`, `AdminTabError`

### Admin Organization (`/admin/organization`)

Tabs via `OrganizationTabs`:

| Tab | Component |
|-----|-----------|
| Departments | `OrganizationDepartmentsTab` |
| Work Shifts | `OrganizationShiftsTab` |
| Holidays | `OrganizationHolidaysTab` |
| Announcements | `OrganizationAnnouncementsTab` |

### Admin User Management Drawer

Component: `AdminUserControlPanel` (right sheet on `/admin/users`)

| Tab | Features |
|-----|----------|
| **Profile** | Name, email, phone, designation, profile picture upload |
| **Access** | Role, status, invitation, password reset |
| **Department** | Department, work shift, reporting manager, designation; save all via unified API |
| **Permissions** | Role permissions, extra grants/denies |
| **Security** | Password reset, force reset, resend invite |
| **Activity** | 30-day stats (attendance, tasks, time logs, EOD, leave) |
| **Audit** | User-specific audit log table |

### Manager Dashboard (`/manager/dashboard`)

Tabs via `ManagerDashboardTabs`:

| Tab | Component |
|-----|-----------|
| Overview | `ManagerOverviewTab` |
| Team | `ManagerTeamTab` |
| Approvals | `ManagerApprovalsTab` |
| Projects & Tasks | `ManagerProjectsTasksTab` |
| EOD & Reports | `ManagerEodReportsTab` |

### Employee Dashboard (`/employee/dashboard`)

Tabs via `EmployeeDashboardTabs`:

| Tab | Component |
|-----|-----------|
| Overview | `EmployeeOverviewTab` |
| Work & Tasks | `EmployeeWorkTasksTab` |
| Attendance | `EmployeeAttendanceTab` |
| Productivity | `EmployeeProductivityTab` |

### Messages (`/messages`)

Single page with internal sections:

- Conversation sidebar (`MessagesWorkspaceSidebar`)
- Thread view with message body, receipts, reply, delete, info
- Composer with formatting toolbar & emoji picker
- Audio/video call initiation (via `CallProvider`)
- Real-time updates via WebSocket

---

## Components

### Admin (`src/components/admin/`)

```
admin/
├── dashboard/
│   ├── AdminDashboardTabs.tsx
│   ├── AdminOverviewTab.tsx
│   ├── AdminUserManagementTab.tsx
│   ├── AdminCommunicationTab.tsx
│   ├── AdminProjectTasksTab.tsx
│   ├── AdminMetricCard.tsx
│   ├── AdminChartCard.tsx
│   ├── AdminDataTable.tsx
│   └── AdminTabError.tsx
├── organization/
│   ├── OrganizationTabs.tsx
│   ├── OrganizationDepartmentsTab.tsx
│   ├── OrganizationShiftsTab.tsx
│   ├── OrganizationHolidaysTab.tsx
│   ├── OrganizationAnnouncementsTab.tsx
│   └── OrganizationTabError.tsx
└── users/
    └── AdminUserControlPanel.tsx    # Manage User drawer (7 tabs)
```

### Manager (`src/components/manager/`)

```
manager/
├── ManagerPageShell.tsx
├── ManagerPageHeader.tsx
└── dashboard/
    ├── ManagerDashboardTabs.tsx
    ├── ManagerOverviewTab.tsx
    ├── ManagerTeamTab.tsx
    ├── ManagerApprovalsTab.tsx
    ├── ManagerProjectsTasksTab.tsx
    └── ManagerEodReportsTab.tsx
```

### Employee (`src/components/employee/`)

```
employee/
├── EmployeePageShell.tsx
├── EmployeePageHeader.tsx
├── EmployeeSectionCard.tsx
├── EmployeeMetricCard.tsx
├── EmployeeMetricGrid.tsx
├── EmployeeDataTable.tsx
└── dashboard/
    ├── EmployeeDashboardTabs.tsx
    ├── EmployeeOverviewTab.tsx
    ├── EmployeeWorkTasksTab.tsx
    ├── EmployeeAttendanceTab.tsx
    └── EmployeeProductivityTab.tsx
```

### Messages (`src/components/messages/`)

| Component | Purpose |
|-----------|---------|
| `MessagesWorkspaceSidebar` | Conversation list |
| `MessageBody` | Render message content (formatted) |
| `MessageActionsMenu` | Reply, delete, info, etc. |
| `MessageStatusIndicator` | Sent/delivered/read icons |
| `MessageQuotedReply` | Reply preview in thread |
| `MessageReplyComposerPreview` | Reply bar above composer |
| `MessageInfoDialog` | Message details / receipts |
| `ComposerFormattingToolbar` | Bold, italic, lists, etc. |
| `ComposerEmojiPicker` | Emoji insertion |
| `MessagesNotificationPrompt` | Browser notification permission |
| `composer-formatting.ts` | Formatting helpers |
| `messages-utils.ts` | Message utilities |

### Calls / WebRTC (`src/components/calls/`)

| Component | Purpose |
|-----------|---------|
| `GlobalCallUI` | Root call UI mount |
| `IncomingCallModal` | Incoming call overlay |
| `OutgoingCallModal` | Outgoing call state |
| `ActiveAudioCallModal` | Active voice call |
| `ActiveVideoCallModal` | Active video call |
| `CallEndedModal` | Call ended summary |
| `CallControlBar` | Mute, camera, hang up |
| `CallControlButton` | Individual control button |
| `CallModalOverlay` | Shared overlay wrapper |
| `CallStatusBadge` | Call status indicator |
| `RecordingIndicator` | Recording in progress |
| `VideoPlaceholder` | Video off placeholder |
| `call-ui-utils.ts` | Call UI helpers |

### Calendar

| Component | Purpose |
|-----------|---------|
| `LiveCalendar.tsx` | Calendar / meetings view |

### Layout, Auth, User, Tasks, etc.

| Path | Purpose |
|------|---------|
| `auth/RoleGuard.tsx` | Role-based route protection |
| `user/UserAvatar.tsx` | Avatar with initials fallback |
| `user/UserProfilePicture.tsx` | Profile picture display |
| `user/ProfilePictureUpload.tsx` | Upload/remove profile picture |
| `tasks/TaskTimer.tsx` | Task timer widget |
| `dashboard/KPICard.tsx` | Generic KPI card |
| `dashboard/announcement-list.tsx` | Announcements list widget |
| `approvals/approval-timeline.tsx` | Approval history timeline |
| `notifications/BrowserNotificationProvider.tsx` | Browser push notifications |
| `providers/ThemeProvider.tsx` | next-themes wrapper |

### UI Primitives (`src/components/ui/`)

`alert-dialog`, `avatar`, `badge`, `button`, `card`, `confirm-dialog`, `dialog`, `dropdown-menu`, `empty-state`, `form`, `input`, `label`, `progress`, `radio-group`, `select`, `sheet`, `skeletons`, `sonner`, `status-badge`, `table`, `tabs`, `textarea`

---

## API Client Layer

Base client: `src/lib/api/client.ts`  
- Base URL: `NEXT_PUBLIC_API_URL` (default `/api/v1`)  
- JWT in `Authorization` header  
- Auto refresh on 401  
- `getErrorMessage()` for toast errors  

| Module | File | Domain |
|--------|------|--------|
| Users | `api/users.ts` | CRUD, admin profile, department-details, permissions, security actions |
| Departments | `api/departments.ts` | Department CRUD |
| Shifts | `api/shifts.ts` | Work shift CRUD |
| Dashboard | `api/dashboard.ts` | Admin & manager dashboard aggregates |
| Attendance | `api/attendance.ts` | Check-in/out, sessions, breaks |
| Leaves | `api/leaves.ts` | Leave requests |
| Tasks | `api/tasks.ts` | Task management |
| Time logs | `api/timeLogs.ts` | Time tracking & timers |
| Projects | `api/projects.ts` | Projects |
| EOD | `api/eod.ts` | End-of-day reports |
| Messages | `api/messages.ts` | Conversations, send, reply, delete, receipts |
| Meetings | `api/meetings.ts` | Calendar meetings |
| Calls | `api/calls.ts` | WebRTC call signaling |
| Notifications | `api/notifications.ts` | In-app notifications |
| Permissions | `api/permissions.ts` | RBAC permissions |
| Organization | `api/organization.ts` | Org settings |
| Announcements | `api/announcements.ts` | Announcements |
| Holidays | `api/holidays.ts` | Holidays |
| Alerts | `api/alerts.ts` | System alerts |
| Audit logs | `api/auditLogs.ts` | Audit trail |
| Analytics | `api/analytics.ts` | Analytics data |
| Reports | `api/reports.ts` | Reports |
| Growth | `api/growth.ts` | Goals & notes |
| Duties | `api/duties.ts` | Employee duties |
| Support | `api/support.ts` | Help & support tickets |

### Supporting libraries (`src/lib/`)

| Path | Purpose |
|------|---------|
| `auth/AuthContext.tsx` | Login state, user, permissions, logout |
| `auth/token-utils.ts` | Token storage helpers |
| `realtime/websocket-client.ts` | WebSocket connection |
| `realtime/events.ts` | Event type constants |
| `calls/webrtc-config.ts` | WebRTC configuration |
| `calls/media.ts` | Media stream helpers |
| `calls/sounds.ts` | Call sound effects |
| `calls/call-recorder.ts` | Call recording |
| `calls/attach-media-stream.ts` | Stream attachment |
| `display-labels.ts` | Safe human-readable labels (no UUID exposure) |
| `admin-users/constants.ts` | Role labels, badges, status options |
| `admin-users/department-form.ts` | Department tab form helpers |
| `admin-dashboard/types.ts` | Admin dashboard types |
| `admin-dashboard/utils.ts` | Admin dashboard helpers |
| `admin-organization/utils.ts` | Organization page helpers |
| `manager-dashboard/types.ts` | Manager dashboard tab types |
| `profile-picture.ts` | Profile picture URL builder |
| `notifications/auto-request.ts` | Auto-request notification permission |
| `time.ts` | Time formatting |
| `utils.ts` | `cn()` and general utilities |

---

## Hooks & Providers

### Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useRealtime.ts` | WebSocket events & connection status |
| `useCallManager.ts` | Call state & actions |
| `useCallRecording.ts` | Call recording controls |
| `useBrowserNotifications.ts` | Browser notification API |

### Providers (`src/providers/`)

| Provider | Purpose |
|----------|---------|
| `RealtimeProvider.tsx` | WebSocket context for entire app |
| `CallProvider.tsx` | WebRTC call session context |

---

## Types & Utilities

**Main types file:** `src/types/index.ts`

Includes interfaces for: `User`, `TokenUser`, `AuthResponse`, `AttendanceSession`, `Shift`, `LeaveRequest`, `Project`, `Task`, and related domain types.

**User roles:** `admin`, `hr_operations`, `manager`, `team_lead`, `employee`, `intern`, `junior_employee`

**User statuses:** `active`, `inactive`, `suspended`, `invited`

---

## Auth & Access Control

- **Login flow:** `/login` → JWT stored in `localStorage` → redirect to `/{role}/dashboard`
- **Auth context:** `AuthProvider` wraps app; exposes `user`, `login`, `logout`, `hasPermission`
- **Route guard:** `RoleGuard` component for role-restricted pages
- **Permissions:** Fetched from `/auth/me/permissions`; sidebar items can require specific permission keys
- **Unauthorized:** `/unauthorized` for blocked access

---

## Key Features

| Feature | Where |
|---------|-------|
| Role-based dashboards | Admin, Manager, Employee, HR, Team Lead |
| User lifecycle admin | `/admin/users` + `AdminUserControlPanel` drawer |
| Organization setup | Departments, shifts, holidays, announcements |
| Attendance & breaks | Employee/manager attendance pages |
| Leave workflow | Employee submit → manager/HR approve |
| Tasks & projects | Role-scoped project/task pages |
| Time logging & timers | Time logs pages + `TaskTimer` + `HeaderTimer` |
| EOD reports | Employee submit, manager review |
| Messaging | WhatsApp-style thread UI with formatting, emoji, receipts |
| Audio/video calls | WebRTC modals + global call UI |
| Call recordings | Admin review page |
| Calendar / meetings | `/calendar` + meetings API |
| Real-time updates | WebSocket for messages, notifications, calls |
| Browser notifications | `BrowserNotificationProvider` |
| Profile pictures | Upload via multipart API |
| Audit logs | Admin audit viewer + per-user audit tab |
| Reports | Admin, HR, manager, employee report pages |
| Dark mode | `ThemeProvider` + CSS variables |
| Mobile export | `npm run build:mobile` + Capacitor Android |

---

## Scripts & Config

| Script | Command | Purpose |
|--------|---------|---------|
| Dev | `npm run dev` | Next.js dev server |
| Build | `npm run build` | Production build |
| Mobile build | `npm run build:mobile` | Static export for Capacitor |
| Start | `npm run start` | Production server |
| Lint | `npm run lint` | ESLint |

**Env (`.env.local`):**

- `NEXT_PUBLIC_API_URL` — API base (e.g. `/api/v1`)
- `API_PROXY_URL` — Dev proxy target (e.g. `http://localhost:8000/api/v1`)

---

## Quick File Lookup

| I need to… | Start here |
|------------|------------|
| Add a new page | `src/app/(dashboard)/.../page.tsx` |
| Change sidebar nav | `src/components/layout/Sidebar.tsx` |
| Change app shell | `src/components/layout/AppShell.tsx` |
| Add API endpoint wrapper | `src/lib/api/<domain>.ts` |
| Fix user drawer | `src/components/admin/users/AdminUserControlPanel.tsx` |
| Fix dropdown labels | `src/lib/display-labels.ts` |
| Add WebSocket event | `src/lib/realtime/events.ts` + `useRealtime.ts` |
| Change auth behavior | `src/lib/auth/AuthContext.tsx` |
| Add shared type | `src/types/index.ts` |

---

*Last updated: reflects current `apps/web` structure. Regenerate or extend this file when major routes or modules are added.*
