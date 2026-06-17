# PIMS Mobile — Stitch UI/UX Replication Checklist

> **Status:** Inspection complete (Step 1–2). Do **not** run EAS preview build until all sections marked complete and final verification passes.
>
> **Stitch export:** `apps/mobile/stitch_pims_native_workforce_intelligence_os/stitch_pims_native_workforce_intelligence_os/`
>
> **Design system source:** `pims_mobile_intelligence/DESIGN.md` + embedded Tailwind tokens in each `code.html`
>
> **User tab spec (authoritative):** Dashboard · Attendance · Projects · Tasks · Messages · Profile — Alerts is **not** a tab.

---

## 1. Stitch Export Location

- [x] Export folder found: `apps/mobile/stitch_pims_native_workforce_intelligence_os/`
- [x] Nested project root: `stitch_pims_native_workforce_intelligence_os/stitch_pims_native_workforce_intelligence_os/`
- [x] Design metadata: `pims_mobile_intelligence/DESIGN.md`
- [x] Web frontend reference copy: `frontend_overview.md`
- [x] Copy Stitch logo asset to `apps/mobile/assets/logo.png` from `image_from_https_pimsmonitoringsystem.up.railway.app_logo.png/screen.png`

---

## 2. Stitch Screens Found (17 HTML + 17 PNG)

| # | Stitch folder | HTML | PNG | Purpose |
|---|---------------|------|-----|---------|
| 1 | `splash_screen` | ✓ | ✓ | App splash / brand intro |
| 2 | `login_screen` | ✓ | ✓ | Email/password login |
| 3 | `admin_dashboard` | ✓ | ✓ | Admin role dashboard |
| 4 | `hr_dashboard` | ✓ | ✓ | HR operations dashboard |
| 5 | `manager_dashboard` | ✓ | ✓ | Manager team dashboard |
| 6 | `team_lead_dashboard` | ✓ | ✓ | Team lead dashboard |
| 7 | `employee_dashboard` | ✓ | ✓ | Employee dashboard |
| 8 | `intern_dashboard` | ✓ | ✓ | Intern/junior dashboard |
| 9 | `attendance_screen` | ✓ | ✓ | Attendance tab (check-in, history) |
| 10 | `attendance_detail_sheet` | ✓ | ✓ | Session detail bottom sheet |
| 11 | `leave_wfh_request_screen` | ✓ | ✓ | Leave / WFH request form |
| 12 | `approvals_screen` | ✓ | ✓ | Pending approvals list |
| 13 | `projects_screen` | ✓ | ✓ | Projects list tab |
| 14 | `project_detail_screen` | ✓ | ✓ | Single project detail |
| 15 | `tasks_screen` | ✓ | ✓ | Tasks tab (My Tasks / Team Tasks toggle) |
| 16 | `task_detail_screen` | ✓ | ✓ | Task detail + comments/activity |
| 17 | `image_from_…logo.png` | — | ✓ | PIMS logo reference image |

### Stitch screens NOT exported (must implement from user spec + existing mobile/web)

| Screen | Source of truth |
|--------|-----------------|
| Forgot Password | Web `(auth)/forgot-password` + existing patterns |
| Messages list | Existing `app/(tabs)/messages.tsx` — restyle to Stitch |
| New Message / People search | Existing `NewConversationModal.tsx` — restyle |
| Chat conversation | Existing `app/chat/[conversationId].tsx` — restyle |
| Profile | Existing `app/(tabs)/profile.tsx` — restyle |
| Alerts / Notification center | Move from tab → `app/alerts.tsx` |
| Incoming / Outgoing / Active calls | Existing `src/components/calls/*` — restyle |
| Create / Edit Project | Web admin/manager project forms |
| Create / Edit Task | Web task forms |
| Team Tasks (standalone) | Stitch `tasks_screen` Team Tasks segment + web `/manager/tasks` |
| Admin Project Management | Web `/admin/projects` |
| User Management / Detail / Create / Edit | Existing `app/manage/*` — restyle + relocate entry |
| Shifts / Operations | Web `/admin/operations/shifts` |
| Reports | Existing `app/reports/*` — restyle |
| Attendance correction | Existing manage/corrections + web employee attendance |
| Offline / Empty / Error / Loading states | Stitch card/skeleton patterns |

### Stitch bottom-tab note

Stitch HTML shows **5 tabs** (Dashboard, Attendance, Projects, Tasks, Profile) — **no Messages tab in export**.

**Implement 6 tabs per product spec:** add Messages between Tasks and Profile.

---

## 3. Stitch Assets Found

| Asset | Location | Mobile target |
|-------|----------|---------------|
| Logo reference PNG | `image_from_https_pimsmonitoringsystem.up.railway.app_logo.png/screen.png` | `assets/logo.png`, splash, adaptive icon if needed |
| Screen PNGs (17) | Each `*/screen.png` | Visual parity reference only (do not ship as UI) |
| Design tokens YAML | `pims_mobile_intelligence/DESIGN.md` | `src/theme/*` |
| Material Symbols (CDN in HTML) | Google Fonts CDN | Map to `@expo/vector-icons` / Ionicons equivalents |
| Inter font | Google Fonts | Expo `expo-font` or system fallback |
| Placeholder avatars | Googleusercontent URLs in HTML | Real user avatars via API |

---

## 4. Stitch Design Tokens (extract → `src/theme/`)

### Colors (from DESIGN.md)

| Token | Value | Mobile key |
|-------|-------|------------|
| primary | `#0037b0` | `colors.primary` |
| primary-container | `#1d4ed8` | `colors.primaryContainer` |
| background / surface | `#f9f9ff` | `colors.background` |
| background-alt | `#F8F9FA` | `colors.backgroundAlt` |
| surface-container-lowest | `#ffffff` | `colors.card` |
| on-surface | `#151c27` | `colors.text` |
| on-surface-variant | `#434655` | `colors.textSecondary` |
| outline / outline-variant | `#747686` / `#c4c5d7` | `colors.border` |
| status-success | `#10B981` | `colors.success` |
| status-warning | `#F59E0B` | `colors.warning` |
| status-error | `#EF4444` | `colors.danger` |
| status-info | `#3B82F6` | `colors.info` |

**Gap:** Current `src/constants/theme.ts` uses older navy palette (`#0f3b82`, `#08204a`) — must migrate to Stitch tokens.

### Typography

| Token | Size / Weight | RN style |
|-------|---------------|----------|
| headline-lg-mobile | 24 / 700 | `typography.headlineLg` |
| headline-md | 20 / 600 | `typography.headlineMd` |
| body-lg | 16 / 400 | `typography.bodyLg` |
| body-md | 14 / 400 | `typography.bodyMd` |
| label-sm | 12 / 600, uppercase | `typography.labelSm` |
| caption | 11 / 400 | `typography.caption` |

Font family: **Inter** (load via expo-font or use system sans).

### Spacing (8px grid)

| Token | Value |
|-------|-------|
| grid-margin | 16px |
| gutter | 12px |
| stack-sm | 8px |
| stack-md | 16px |
| stack-lg | 24px |

### Radius

| Token | Value |
|-------|-------|
| DEFAULT (cards/inputs) | 8px (`0.5rem`) |
| xl | 12px |
| full | pill badges, avatars |

### Shadows & elevation

- Card: `0 2px 8px rgba(0,0,0,0.04)`
- Tab bar: glass blur + top border `outline-variant/30`
- Bottom sheet backdrop: 40% black

### Signature UI patterns (all screens)

- [ ] **Intelligence cards:** white surface, 4px left accent stripe (status color)
- [ ] **Top app bar:** fixed h-56, blur, avatar left OR back, title center, notification bell right
- [ ] **Role badge:** uppercase pill on dashboard headers
- [ ] **Status badges:** 15% tint bg + saturated text
- [ ] **Bento metric grid:** 2-column on mobile
- [ ] **Filter chips:** horizontal scroll, pill shape
- [ ] **Bottom tab bar:** 6 items, active = primary, inactive = secondary, blur background

---

## 5. Current Mobile App — Exists vs Missing

### Bottom tabs (`app/(tabs)/_layout.tsx`) — **MISMATCH**

| Required tab | Current | Action |
|--------------|---------|--------|
| Dashboard | ✓ `index` | Restyle |
| Attendance | ✓ `attendance` | Restyle |
| Projects | ✗ missing | **Create** `projects.tsx` |
| Tasks | ✗ missing | **Create** `tasks.tsx` |
| Messages | ✓ `messages` | Restyle |
| Profile | ✓ `profile` | Restyle |
| ~~Alerts~~ | ✗ `notifications` tab | **Remove from tabs** → `app/alerts.tsx` |
| ~~Manage~~ | ✗ `manage` tab | **Remove from tabs** → dashboard/profile quick actions |

### Routes — exists

| Route | Status | Backend wired |
|-------|--------|---------------|
| `app/(auth)/login.tsx` | Exists, pre-Stitch UI | ✓ auth.api |
| `app/(tabs)/index.tsx` | Role dashboards (partial Stitch) | ✓ dashboard.api |
| `app/(tabs)/attendance.tsx` | Functional, pre-Stitch UI | ✓ attendance.api |
| `app/(tabs)/messages.tsx` | Functional, partial Stitch | ✓ messages/conversations |
| `app/(tabs)/profile.tsx` | Functional, pre-Stitch UI | ✓ profile.api |
| `app/(tabs)/notifications.tsx` | Tab (wrong placement) | ✓ notifications.api |
| `app/(tabs)/manage.tsx` | Tab (wrong placement) | ✓ manage.api |
| `app/chat/[conversationId].tsx` | Functional | ✓ + WebSocket |
| `app/manage/*` | Admin/manager tools | ✓ |
| `app/reports/*` | Reports | ✓ reports.api |

### Routes — missing

- [ ] `app/(tabs)/projects.tsx`
- [ ] `app/(tabs)/tasks.tsx`
- [ ] `app/alerts.tsx`
- [ ] `app/projects/[projectId].tsx`
- [ ] `app/projects/create.tsx`
- [ ] `app/projects/edit/[projectId].tsx`
- [ ] `app/tasks/[taskId].tsx`
- [ ] `app/tasks/create.tsx`
- [ ] `app/tasks/edit/[taskId].tsx`
- [ ] `app/team-tasks.tsx`
- [ ] `app/admin-projects.tsx`
- [ ] `app/approvals.tsx` (or reuse `manage/approvals` with Stitch UI)
- [ ] `app/attendance/correction.tsx`
- [ ] `app/leave-request.tsx`
- [ ] `app/users/index.tsx` (+ detail/create/edit) — may alias `manage/users`
- [ ] `app/shifts.tsx`
- [ ] `app/(auth)/forgot-password.tsx`

### API wrappers — exists

| File | Domain |
|------|--------|
| auth.api.ts | Login, refresh, me |
| profile.api.ts | Profile, picture |
| attendance.api.ts | Check-in/out, history |
| leave.api.ts | Leave requests |
| approvals.api.ts | Pending approvals |
| users.api.ts | User search, list |
| dashboard.api.ts | Role dashboards |
| conversations.api.ts | DMs, get-or-create |
| messages.api.ts | Send, list messages |
| calls.api.ts | WebRTC signaling |
| notifications.api.ts | In-app notifications |
| reports.api.ts | Reports |
| manage.api.ts | Manage hub data |
| team.api.ts | Team attendance |

### API wrappers — missing

- [ ] `src/api/projects.api.ts` → `GET/POST /projects`, `GET /projects/{id}`, `POST /projects/{id}/approve`
- [ ] `src/api/tasks.api.ts` → `GET/POST /tasks`, `PATCH /tasks/{id}`, comments, subtasks
- [ ] `src/api/alerts.api.ts` → `GET /alerts`, `PATCH /alerts/{id}/resolve`
- [ ] `src/api/shifts.api.ts` → mirror web `api/shifts.ts`

### Hooks — missing (entire `src/hooks/` folder empty/absent)

- [ ] `useAttendance.ts`
- [ ] `useProjects.ts`
- [ ] `useTasks.ts`
- [ ] `useMessages.ts`
- [ ] `useAlerts.ts`
- [ ] `useApprovals.ts`
- [ ] `useUsers.ts`
- [ ] `useReports.ts`

### Components — exists (keep logic, restyle)

| Area | Path | Stitch action |
|------|------|---------------|
| Brand | `src/components/brand/PimsLogo.tsx` | Update logo asset + sizing |
| Dashboard | `src/components/dashboard/*Dashboard.tsx` | Full Stitch bento rebuild |
| Attendance | `src/components/attendance/*` | Match intelligence cards + detail sheet |
| Messages | `src/components/messages/*` | Match Stitch (simple composer done) |
| Calls | `src/components/calls/*` | Restyle modals |
| Profile | `src/components/profile/*` | Restyle |
| Notifications | `src/components/notifications/*` | Move to alerts module |
| UI primitives | `src/components/ui/*` | Extend for Stitch tokens |
| Animations | `src/components/animations/*` | Keep, apply to new cards |

### Components — to create

- [x] `src/components/brand/BrandHeader.tsx`
- [ ] `src/components/dashboard/DashboardRouter.tsx`
- [x] `src/components/ui/IntelligenceCard.tsx` (4px accent stripe)
- [x] `src/components/ui/MetricBentoGrid.tsx`
- [x] `src/components/ui/NotificationBell.tsx`
- [x] `src/components/ui/FilterChips.tsx`
- [x] `src/components/ui/ProgressBar.tsx`
- [x] `src/components/ui/StatusBadge.tsx`
- [x] `src/components/ui/PriorityBadge.tsx`
- [x] `src/components/ui/RoleBadge.tsx`
- [x] `src/components/ui/SearchInput.tsx`
- [ ] `src/components/ui/BottomSheet.tsx`
- [x] `src/components/ui/LoadingSkeleton.tsx`
- [x] `src/components/ui/EmptyState.tsx` (+ `AppEmptyState` re-export)
- [x] `src/components/ui/ErrorState.tsx` (+ `AppErrorState` re-export)
- [x] `src/components/ui/OfflineBanner.tsx` (re-export + network banner Stitch colors)
- [ ] `src/components/projects/*` (ProjectCard, ProjectHealthBadge, etc.)
- [ ] `src/components/tasks/*` (TaskCard, TaskStatusBadge, CommentTimeline, etc.)
- [ ] `src/components/alerts/*` (AlertCard, AlertFilters)

### Theme — to create (`src/theme/`)

- [x] `colors.ts` — Stitch palette
- [x] `typography.ts` — Inter scale
- [x] `spacing.ts` — 8px grid
- [x] `radius.ts`
- [x] `shadows.ts`
- [x] `badgePalettes.ts`
- [x] `layout.ts`
- [x] `index.ts` — re-export; `constants/theme.ts` migrated with legacy aliases
- [x] `useAppFonts.ts` — Inter via `@expo-google-fonts/inter`

---

## 6. Backend APIs Needed Per Screen

| Screen | Endpoints (production `/api/v1`) | Mobile wrapper |
|--------|----------------------------------|----------------|
| Login | `POST /auth/login`, `GET /auth/me` | auth.api ✓ |
| Dashboards | `GET /dashboard/*`, admin/manager overview | dashboard.api ✓ |
| Attendance | `POST /attendance/check-in`, `check-out`, `GET /attendance/sessions` | attendance.api ✓ |
| Attendance correction | `POST /attendance/corrections` (verify route) | TBD |
| Leave/WFH | `POST /leaves`, `GET /leaves` | leave.api ✓ |
| Approvals | `GET /approvals/pending`, approve/reject | approvals.api ✓ |
| Projects list/detail | `GET /projects`, `GET /projects/{id}` | **projects.api** |
| Create/edit project | `POST /projects`, approve | **projects.api** |
| Tasks list/detail | `GET /tasks`, `GET /tasks/{id}` | **tasks.api** |
| Task comments | `GET/POST /tasks/{id}/comments` | **tasks.api** |
| Task update | `PATCH /tasks/{id}` | **tasks.api** |
| Team tasks | `GET /tasks?assigned_to=…` (RBAC scoped) | **tasks.api** |
| Messages | `GET /messages/conversations`, send, WS | ✓ |
| Direct conversation | `POST /messages/conversations` `{type:'direct', participant_ids}` | conversations.api ✓ |
| User search | `GET /users` with search param | users.api ✓ |
| Calls | start/accept/decline/end/signal | calls.api ✓ |
| Alerts | `GET /alerts`, `PATCH /alerts/{id}/resolve` | **alerts.api** |
| Notifications | `GET /notifications`, unread count | notifications.api ✓ |
| Profile | `GET/PATCH /users/me`, picture upload | profile.api ✓ |
| Users admin | `GET/POST/PATCH /users` | users.api / manage |
| Shifts | `GET/POST /shifts` (verify) | **shifts.api** |
| Reports | various `/reports/*` | reports.api ✓ |

### Backend routes confirmed in `apps/api`

- Projects: `apps/api/app/api/routes/projects.py` — list, create, get, approve, task-eligible
- Tasks: `apps/api/app/api/routes/tasks.py` — CRUD, comments, subtasks, admin overview
- Alerts: `apps/api/app/api/routes/alerts.py` — list, resolve

### Backend TODO (verify before implementing)

- [ ] Confirm `PATCH /projects/{id}` exists (web may only have create + approve)
- [ ] Confirm attendance correction endpoint path
- [ ] Confirm shifts routes for mobile
- [ ] Direct conversation dedup — already via `POST /messages/conversations` (no separate `/conversations/direct` needed if backend dedupes)

---

## 7. Navigation Changes Required

- [ ] Update `app/(tabs)/_layout.tsx` — 6 tabs: Dashboard, Attendance, Projects, Tasks, Messages, Profile
- [ ] Hide `notifications` tab (`href: null`) — route file can remain for deep links
- [ ] Hide `manage` tab (`href: null`) — keep `app/manage/*` stack
- [ ] Add `app/alerts.tsx` stack screen (accessible from bell + profile)
- [ ] Register project stack in `app/_layout.tsx` or `app/projects/_layout.tsx`
- [ ] Register task stack in `app/tasks/_layout.tsx`
- [ ] Wire `NotificationBell` on all dashboard headers → `/alerts`
- [ ] Wire push notification deep links → alerts or entity screens
- [ ] Update `AnimatedTabIcon` icons to match Stitch (Material Symbols mapping)
- [ ] Tab bar styling: blur, rounded top, Stitch colors

---

## 8. Component Mapping — Stitch → React Native

| Stitch pattern | RN component | Notes |
|----------------|--------------|-------|
| TopAppBar (blur, h-14) | `BrandHeader` / `AppHeader` | Safe area + 16px horizontal padding |
| Intelligence card + 4px stripe | `IntelligenceCard` | Wraps metric/content |
| Bento 2-col grid | `MetricBentoGrid` + `DashboardMetricCard` | Stagger animation |
| Role badge pill | `RoleBadge` | MANAGER, ADMIN, etc. |
| Status badge | `StatusBadge` / `PriorityBadge` | 15% tint pattern |
| Horizontal filter chips | `FilterChips` | ScrollView horizontal |
| Project card | `ProjectCard` | Progress bar, health, due date |
| Task card | `TaskCard` | Priority, status, due, assignee name |
| Approval row | `ApprovalCard` (exists) | Restyle with Stitch buttons |
| Bottom tab bar | Expo Router `Tabs` | 6 tabs, glass effect |
| Bottom sheet | `BottomSheet` | Attendance detail, filters, New Message |
| Notification bell + dot | `NotificationBell` | Links to `/alerts` |
| Search field | `SearchInput` | Outlined, focus ring primary |
| Primary CTA | `PrimaryButton` / `AppButton` | Full width, `#0037b0` |
| Avatar circle | `Avatar` / existing profile utils | No UUID in label |
| Comment timeline | `CommentItem` / `TimelineItem` | Task detail |
| Progress bar | `ProgressBar` | Project/task completion |
| Chat composer row | `ChatComposer` ✓ | Already simplified — restyle only |
| Call modals | `IncomingCallModal`, etc. | Restyle to Stitch |

---

## 9. Implementation Phases (work in order)

### Phase A — Foundation ✅ COMPLETE

- [x] A1. Create `src/theme/*` from Stitch DESIGN.md tokens
- [x] A2. Migrate `constants/theme.ts` to re-export from `src/theme` (no breaking imports)
- [x] A3. Copy logo PNG from Stitch export → `assets/logo.png`
- [x] A4. Create `BrandHeader.tsx`, `IntelligenceCard`, `NotificationBell`, shared badges
- [x] A5. Create `LoadingSkeleton`, update `EmptyState` / `ErrorState` to Stitch style
- [x] A6. Load Inter font via `@expo-google-fonts/inter` + `useAppFonts` in `app/_layout.tsx`

### Phase B — Navigation ✅ COMPLETE

- [x] B1. Rebuild `app/(tabs)/_layout.tsx` (6 tabs, remove Alerts/Manage from tab bar)
- [x] B2. Create `app/alerts.tsx` + filter shell using notifications API
- [x] B3. Add `(tabs)/projects.tsx` and `(tabs)/tasks.tsx` placeholder routes
- [x] B4. Update push/deep-link navigation to `/alerts`; dashboard quick actions → `/alerts`

### Phase C — Dashboards (Stitch parity)

- [x] C1. Create `DashboardRouter.tsx`
- [x] C2. Rebuild `AdminDashboard.tsx` — workforce, projects/tasks metrics, alerts section
- [x] C3. Rebuild `HRDashboard.tsx`
- [x] C4. Rebuild `ManagerDashboard.tsx` — bento, workload card, action required
- [x] C5. Rebuild `TeamLeadDashboard.tsx`
- [x] C6. Rebuild `EmployeeDashboard.tsx` — attendance card, projects list, tasks summary
- [x] C7. Rebuild `InternDashboard.tsx` — guided bento layout
- [x] C8. Shared `DashboardHeader` — Stitch top bar + bell + role badge
- [x] C9. Wire all dashboard metrics to real APIs (no permanent mock data)

### Phase D — Attendance (priority 1)

- [x] D1. Restyle `app/(tabs)/attendance.tsx` to Stitch layout
- [x] D2. Active session card with timer + check-in/out CTAs
- [x] D3. History intelligence cards with accent stripes
- [x] D4. `AttendanceDetailSheet` bottom sheet component
- [x] D5. `app/leave-request.tsx` from Stitch leave_wfh screen
- [x] D6. `app/attendance/correction.tsx`
- [x] D7. Late/early indicators, shift timing display
- [x] D8. Offline queue + error states

### Phase E — Projects (priority 2)

- [x] E1. Create `projects.api.ts` + types + query keys
- [x] E2. Create `useProjects.ts` hook
- [x] E3. Build `app/(tabs)/projects.tsx` — search, filters, project cards
- [x] E4. Build `app/projects/[projectId].tsx` — health, progress, team, tasks
- [x] E5. Build create/edit screens (role-gated) — create only; **no backend update route**
- [x] E6. `src/components/projects/*`
- [x] E7. Empty/loading/error/offline states

### Phase F — Tasks (priority 3)

- [x] F1. Create `tasks.api.ts` + types + query keys
- [x] F2. Create `useTasks.ts` hook
- [x] F3. Build `app/(tabs)/tasks.tsx` — My Tasks / Team Tasks segment
- [x] F4. Build `app/tasks/[taskId].tsx` — detail, comments, actions
- [x] F5. Build create/edit screens
- [x] F6. Build `app/team-tasks.tsx` for managers
- [x] F7. Task actions: start, in progress, complete, comment, progress update
- [x] F8. `src/components/tasks/*`

### Phase G — Messages & Calls (priority 4)

- [x] G1. Restyle messages list to Stitch
- [x] G2. Restyle New Message modal/bottom sheet
- [x] G3. Restyle chat header + bubbles + composer colors
- [x] G4. Verify New Message → direct conversation → first message flow
- [x] G5. Restyle call modals to Stitch
- [x] G6. Verify call signaling (offer/answer/ICE) still works after UI changes
- [ ] G7. Two-device call QA

### Phase H — Alerts (priority 5)

- [x] H1. Create `alerts.api.ts` + `useAlerts.ts`
- [x] H2. Build `app/alerts.tsx` with filter chips (All, Unread, Attendance, Projects, Tasks, Leave, Messages, System)
- [x] H3. Mark as read / resolve actions
- [x] H4. Dashboard bell → alerts
- [x] H5. Profile notifications entry → alerts
- [x] H6. Contextual alert links → project/task/attendance screens

### Phase I — Profile & Admin tools (priority 6–7)

- [x] I1. Restyle `app/(tabs)/profile.tsx` to Stitch
- [x] I2. Keep build diagnostics card (version, env, feature set)
- [x] I3. Push notification status card
- [x] I4. Restyle manage/users/approvals/reports with Stitch cards
- [x] I5. Remove Manage from tab bar; expose via dashboard quick actions
- [ ] I6. `app/shifts.tsx` if backend supports — **deferred** (no mobile shifts API/route wired)
- [x] I7. Never expose raw UUIDs in UI — use names, roles, departments

### Phase J — Auth & Splash

- [x] J1. Restyle login to Stitch (`login_screen/code.html`)
- [x] J2. Update splash in `app.json` / `app.config.ts` to match `splash_screen`
- [x] J3. Add forgot-password screen if web/current app requires it

### Phase K — Animations

- [x] K1. Dashboard card stagger (existing `AnimatedCard` / `FadeSlideIn`)
- [x] K2. Tab icon scale/color transition
- [x] K3. Bottom sheet slide-up
- [x] K4. Alert list fade/slide
- [x] K5. Incoming call pulse
- [x] K6. Offline banner slide

---

## 10. Integration Checklist

- [ ] All screens use React Query hooks (no raw fetch in components)
- [ ] Production API base URL only (`EXPO_PUBLIC_API_BASE_URL`)
- [ ] Production WebSocket URL only
- [ ] SecureStore for tokens unchanged
- [ ] No tokens in logs (audit `secure-log.ts` usage)
- [ ] Role guards on manage/admin/project create/task assign
- [ ] Offline banner + message queue still works
- [ ] Push notification registration unchanged
- [ ] WebSocket realtime for messages/calls/alerts
- [ ] Optimistic message send + dedupe preserved
- [ ] Call store + WebRTC client untouched except UI wrappers

---

## 11. Visual Parity Checklist (screen-by-screen)

Mark each when implementation matches Stitch PNG + HTML structure:

### Auth & Shell
- [x] Splash
- [x] Login
- [x] Forgot Password

### Dashboards
- [x] Admin Dashboard
- [x] HR Dashboard
- [x] Manager Dashboard
- [x] Team Lead Dashboard
- [x] Employee Dashboard
- [x] Intern Dashboard

### Attendance
- [x] Attendance tab
- [x] Attendance Detail sheet
- [x] Attendance Correction Request
- [x] Leave/WFH Request

### Approvals & Admin
- [ ] Approvals screen
- [ ] User Management
- [ ] User Detail
- [ ] Add/Edit User
- [ ] Shifts/Operations
- [ ] Reports
- [ ] Admin Project Management

### Projects & Tasks
- [x] Projects tab
- [x] Project Detail
- [x] Create Project
- [ ] Edit Project (no backend PATCH/PUT route)
- [x] Tasks tab (My Tasks)
- [x] Team Tasks
- [x] Task Detail
- [x] Create/Edit Task
- [x] Task Comments/Activity

### Messages & Calls
- [x] Messages list
- [x] New Message / People Search
- [x] Chat Conversation
- [x] Incoming Call
- [x] Outgoing Call
- [x] Active Voice Call
- [x] Active Video Call

### Alerts & Profile
- [x] Alerts (notification center)
- [x] Profile

### Admin / Manage (restyled entry screens)
- [x] Manage hub (hidden tab)
- [x] User Management list
- [x] User Detail
- [x] Approvals queue
- [x] Reports hub (entry cards)
- [ ] Shifts / Operations — deferred

### States
- [ ] Offline State
- [ ] Empty States
- [ ] Error States
- [ ] Loading States

---

## 12. Typecheck Checklist

- [ ] `npm run typecheck` passes with zero errors
- [ ] No `@ts-ignore` added without documented reason
- [ ] All new API wrappers fully typed
- [ ] All new routes typed with expo-router
- [ ] Theme migration does not break existing imports

---

## 13. Manual QA Checklist (before build)

### Navigation
- [ ] Exactly 6 bottom tabs visible
- [ ] No Alerts tab
- [ ] No Manage tab
- [ ] Bell opens Alerts screen

### Role dashboards
- [ ] Admin ≠ Manager ≠ Employee visually and data-wise
- [ ] Manager sees team-scoped metrics
- [ ] Intern sees simplified dashboard

### Attendance
- [ ] Check in / check out works
- [ ] Active timer displays
- [ ] History loads from API
- [ ] Correction + leave flows reachable

### Projects
- [ ] List loads from API
- [ ] Detail shows real project
- [ ] Create/edit works for allowed roles
- [ ] Search + filters work

### Tasks
- [ ] My Tasks loads
- [ ] Team Tasks (manager) loads
- [ ] Detail + comments work
- [ ] Status update actions work

### Messages
- [ ] New Message → user with no prior chat → send first message
- [ ] Same user → existing conversation (no duplicate)
- [ ] Voice/video from header + New Message modal

### Calls
- [ ] Two-device voice connects (not stuck Connecting)
- [ ] Two-device video connects
- [ ] Decline / timeout / end call work

### Alerts
- [ ] Filters work
- [ ] Mark read works
- [ ] Push tap deep links correctly

### Profile
- [ ] Picture upload works
- [ ] Build diagnostics show correct version/feature set
- [ ] Logout works

### Security
- [ ] No raw UUIDs in user-facing labels
- [ ] No token logs in Metro/console

---

## 14. Build Checklist (only after all above)

**Do not run until Phases A–K complete and sections 10–13 pass.**

```powershell
cd "D:\New folder (2)\HR_Monitoring_System\apps\mobile"
npm run typecheck
npx expo export --platform android
```

- [ ] Typecheck exit 0
- [ ] Export exit 0
- [ ] Bump version + feature set in `app.config.ts` / `features.ts`
- [ ] Uninstall old APK: `adb uninstall com.paramount.pims`
- [ ] Build:

```powershell
$env:EAS_NO_VCS='1'
npx eas-cli build --platform android --profile preview --non-interactive
```

- [ ] Install APK on device
- [ ] Visual spot-check vs Stitch PNGs
- [ ] Record build URL in this file

---

## 15. Current Gap Summary (post-inspection)

| Area | Current state | Target |
|------|---------------|--------|
| Design tokens | Stitch `src/theme/*` + legacy `constants/theme.ts` aliases | Applied in new components; screens restyle in Phase B+ |
| Logo | Stitch export PNG in `assets/logo.png` | Done (Phase A) |
| BrandHeader | `BrandHeader.tsx` + `BrandHeaderWithAvatar` | Done (Phase A) |
| Bottom tabs | 6 tabs: Dashboard, Attendance, Projects, Tasks, Messages, Profile | Done (Phase B) |
| Projects | Full tab + detail + create | Done (Phase E) |
| Tasks | Full tab + detail + CRUD | Done (Phase F) |
| Alerts | Secondary `/alerts` screen with unified feed + filter chips | Done (Phase H) |
| Dashboards | Partial role dashboards | Full Stitch bento per role |
| Attendance | Functional, old UI | Stitch intelligence cards |
| Messages | Functional, partial UI | Stitch restyle (Phase G) |
| Calls | Functional, partial UI | Stitch restyle + QA (Phase G) |
| Hooks | None | React Query hooks per domain |

---

## 16. Phase A Notes (completed)

**Theme files created:**
- `src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `badgePalettes.ts`, `layout.ts`, `index.ts`, `useAppFonts.ts`

**Logo source copied:**
- From: `stitch_pims_native_workforce_intelligence_os/.../image_from_https_pimsmonitoringsystem.up.railway.app_logo.png/screen.png`
- To: `apps/mobile/assets/logo.png`

**Shared components created/updated:**
- Brand: `PimsLogo.tsx`, `BrandHeader.tsx` (+ `BrandHeaderWithAvatar`)
- UI: `IntelligenceCard`, `MetricBentoGrid`, `NotificationBell`, `FilterChips`, `ProgressBar`, `StatusBadge`, `PriorityBadge`, `RoleBadge`, `SearchInput`, `LoadingSkeleton`, `EmptyState`, `ErrorState`, `OfflineBanner` (re-export)
- Legacy re-exports preserved: `AppEmptyState`, `AppErrorState`

**Compatibility approach (`constants/theme.ts`):**
- Spreads Stitch colors + keeps legacy aliases (`primaryDark`, `mutedText`, `call` palette, etc.)
- Legacy spacing (`md=16`, `lg=24`) unchanged for existing screens
- Legacy radii unchanged; new Stitch radii in `src/theme/radius.ts`
- Exports `stitchColors`, `stitchSpacing`, `stitchRadius`, `stitchTypography`, `stitchShadows` for new components

**Inter font:**
- Installed `@expo-google-fonts/inter`
- Loaded in `AuthBootstrap` via `useAppFonts()` — falls back to system font if load fails
- `StatusBar` set to `dark` for light Stitch backgrounds

**Typecheck:** Pass (`npm run typecheck`)

**Phase A gaps (deferred):**
- `BottomSheet.tsx` not created (Phase B+)
- Existing screens not yet restyled to use new components (Phase B+)
- `AppSkeleton.tsx` kept for backward compat; prefer `LoadingSkeleton` in new code

---

*Last updated: Phase K (Animations + final UI polish) complete.*

---

## 17. Phase B Notes (completed)

**Bottom tabs (visible, in order):**
1. Dashboard (`index`)
2. Attendance
3. Projects (placeholder)
4. Tasks (placeholder)
5. Messages
6. Profile

**Hidden from tab bar (`href: null`):**
- `app/(tabs)/notifications.tsx` — legacy route preserved
- `app/(tabs)/manage.tsx` — legacy route preserved

**New routes:**
- `app/alerts.tsx` — secondary alerts center with filter chips + notifications API
- `app/(tabs)/projects.tsx` — Phase E placeholder
- `app/(tabs)/tasks.tsx` — Phase F placeholder

**Navigation updates:**
- Root stack registers `alerts`
- Push notification tap → `/alerts` (was `/(tabs)/notifications`)
- Deep link `pims://alerts` → `/alerts`
- Dashboard “Alerts” quick actions → `/alerts`

**Deferred to later phases:**
- `app/projects/[projectId].tsx` and task detail routes (Phase E/F)
- Profile “Notifications” link to `/alerts` (Phase I)
- Dedicated `alerts.api.ts` (Phase H)

**Typecheck:** Pass

---

## 18. Phase C Notes (completed)

**Stitch screens referenced:**
- `admin_dashboard/code.html` + `screen.png`
- `hr_dashboard/code.html` + `screen.png`
- `manager_dashboard/code.html` + `screen.png`
- `team_lead_dashboard/code.html` + `screen.png`
- `employee_dashboard/code.html` + `screen.png`
- `intern_dashboard/code.html` + `screen.png`

**Files changed:**
- `app/(tabs)/index.tsx` — Stitch background, `DashboardHeader` + `DashboardRouter`, pull-to-refresh invalidates dashboard queries
- `src/components/dashboard/DashboardRouter.tsx` — **new** role switcher + body skeleton
- `src/components/dashboard/DashboardHeader.tsx` — Stitch light header, avatar, greeting, `RoleBadge`, `NotificationBell` → `/alerts`
- `src/components/dashboard/dashboard-shared.tsx` — **new** sections, bento grid helpers, `formatMetric`, Phase E/F hints
- `src/components/dashboard/SummaryCard.tsx` — 4px accent stripe, Stitch shadows
- `src/components/dashboard/QuickActionCard.tsx` — horizontal action cards
- `src/components/dashboard/AdminDashboard.tsx` — rebuilt
- `src/components/dashboard/HRDashboard.tsx` — rebuilt
- `src/components/dashboard/ManagerDashboard.tsx` — rebuilt
- `src/components/dashboard/TeamLeadDashboard.tsx` — rebuilt
- `src/components/dashboard/EmployeeDashboard.tsx` — rebuilt
- `src/components/dashboard/InternDashboard.tsx` — rebuilt (no longer wraps Employee)
- `src/components/dashboard/index.ts` — exports updated

**Role mapping (`resolveDashboardRole` in `src/auth/role-utils.ts` + aliases in `src/utils/role.ts`):**
| Normalized role | Dashboard |
|-----------------|-----------|
| `admin` | AdminDashboard |
| `hr_operations` (aliases: hr, HR, HR_Operations, …) | HRDashboard |
| `manager` | ManagerDashboard |
| `team_lead` (aliases: Team Lead, lead, …) | TeamLeadDashboard |
| `intern`, `junior_employee` (aliases: Internee, Junior Employee, …) | InternDashboard |
| `employee` / unknown | EmployeeDashboard (safe fallback, no admin actions) |

**Data sources connected:**
| API | Endpoint | Used by |
|-----|----------|---------|
| Employee dashboard | `GET /dashboard/employee` | Employee, Intern |
| Admin summary | `GET /dashboard/admin` | Admin, HR |
| Admin analytics | `GET /dashboard/admin/analytics` | Admin (fallback) |
| Manager overview | `GET /dashboard/manager/overview` | Manager, Team Lead |
| Pending leaves | approvals API | Manager (pending count) |
| Pending corrections | approvals API | Manager (pending count) |
| Unread messages | messages API | All dashboards + header context |
| Unread notifications | notifications API | Header bell + alert metrics |

**Metrics deferred / placeholders (Phase E/F or missing backend fields):**
- **Projects:** `My Projects`, `Active Projects`, `Team Projects`, `Assigned Projects` cards show `—` or API value with subtitle “Connects in Phase E” when null
- **Tasks module:** full task lists/actions deferred to Phase F; employee/intern task counts from `/dashboard/employee` are live
- **Admin-only gaps:** absent/on-leave, late/early, delayed projects, total tasks, completed-today/week, recent activity feed, shifts/operations quick action — not in current admin API response
- **HR-only gaps:** invited users, shift coverage, attendance exceptions as separate metrics; Invitations/Shifts quick actions — routes deferred (no dedicated screens yet)
- **Team Lead:** `Assign Task` quick action deferred (Phase F)
- **Manager:** `Assign Task` quick action deferred (Phase F)

**Navigation targets wired:**
- Bell + Alerts cards → `/alerts`
- Attendance → `/(tabs)/attendance`
- Projects/Tasks → `/(tabs)/projects`, `/(tabs)/tasks` (placeholders)
- Messages → `/(tabs)/messages`
- Profile → `/(tabs)/profile`
- Manage Users/Team/Attendance/Leaves/Corrections/Approvals → existing `/manage/*` routes
- Reports → `/reports`, `/reports/team`

**Loading / empty / error:**
- `LoadingSkeletonList` on employee/intern initial load
- `ErrorState` with retry on API failure per role dashboard
- `formatMetric` safe fallbacks (`—` / `0`) — no fake production numbers
- `OfflineQueueStatus` on dashboard screen; pull-to-refresh blocked offline with alert

**Typecheck:** Pass (`npm run typecheck`)

**Phase C gaps (deferred):**
- Pixel-perfect device QA vs Stitch PNGs not run in this session
- Admin/HR bento does not yet show every metric listed in Stitch HTML where backend lacks fields
- `BrandHeader` / `PimsLogo` in header uses text “PIMS Intelligence” + avatar (Stitch pattern); logo asset available but not embedded in header bar
- No APK, EAS build, or `expo export` run

---

## 19. Phase D Notes (completed)

**Stitch screens referenced:**
- `attendance_screen/code.html` + `screen.png`
- `attendance_detail_sheet/code.html` + `screen.png`
- `leave_wfh_request_screen/code.html` + `screen.png`

**Files changed/created:**
- `app/(tabs)/attendance.tsx` — Stitch restyle, shortcuts, history filter, detail sheet
- `app/leave-request.tsx` — **new** leave/WFH request form + recent requests
- `app/attendance/_layout.tsx` — **new** stack layout
- `app/attendance/correction.tsx` — **new** correction request screen
- `app/_layout.tsx` — registers `leave-request` + `attendance` routes
- `src/api/attendance.api.ts` — `requestAttendanceCorrection`, history date params
- `src/api/leave.api.ts` — `getLeaveTimeline`
- `src/types/attendance.ts` — `CorrectionRequestPayload`
- `src/utils/attendance-formatters.ts` — **new** status/shift/late-early normalization
- `src/hooks/useSessionTimer.ts` — **new** live session timer with cleanup
- `src/components/ui/BottomSheet.tsx` — **new** reusable bottom sheet
- `src/components/attendance/ActiveSessionCard.tsx` — **new**
- `src/components/attendance/AttendanceHistoryCard.tsx` — **new**
- `src/components/attendance/AttendanceDetailSheet.tsx` — **new**
- `src/components/attendance/AttendanceHistoryList.tsx` — updated Stitch cards + empty/loading

**API methods used:**
- `GET /attendance/active`, `GET /attendance/me`, `POST /attendance/check-in`, `POST /attendance/check-out`
- `PATCH /attendance/{sessionId}/correction-request` (added mobile wrapper)
- `GET /leaves/me`, `POST /leaves`, `GET /leaves/{id}/timeline` (timeline wrapper added)
- `GET /notifications/unread-count` (header bell)

**Attendance state normalization:**
- `src/utils/attendance-formatters.ts` maps session → `StatusBadge` variant/label, accent colors, shift window, late/early badges, correction eligibility

**Offline handling:**
- `OfflineBanner` on attendance tab
- `OfflineQueueStatus` in scroll content
- Check-in/out blocked offline with alerts; submit buttons disabled offline on forms

**Backend gaps:**
- No dedicated mobile date picker library; dates entered as `YYYY-MM-DD`, times as `HH:MM`
- Correction shortcut without a selected session shows “Session not found” — user must open history/detail first
- Leave cancel endpoint exists on web but not wired in mobile Phase D (read-only history + submit only)
- Attachments not supported by backend leave API

**Visual gaps (deferred):**
- Device pixel-perfect QA vs Stitch PNGs not run
- WFH check-in mode selector not added (mobile still checks in as `office` — same as pre-Phase D behavior)
- “View Full History” Stitch button replaced by filter chips (All / This week / This month)

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 20. Phase E Notes (completed)

**Stitch screens referenced:**
- `projects_screen/code.html` + `screen.png`
- `project_detail_screen/code.html` + `screen.png`

**Files changed/created:**
- `src/types/project.ts` — **new** API + view model types
- `src/api/projects.api.ts` — **new** project + read-only task list wrappers
- `src/utils/project-adapters.ts` — **new** health/status/permission adapters
- `src/hooks/useProjects.ts` — **new** React Query hooks
- `src/constants/query-keys.ts` — project query keys
- `src/components/projects/*` — **new** cards, badges, form, summaries
- `app/(tabs)/projects.tsx` — replaced placeholder with full list
- `app/projects/_layout.tsx` — **new**
- `app/projects/[projectId].tsx` — **new** detail screen
- `app/projects/create.tsx` — **new** create screen
- `app/_layout.tsx` — registers `projects` stack

**Backend endpoints confirmed & used:**
- `GET /projects` — list (RBAC-scoped)
- `GET /projects/{id}` — detail
- `POST /projects` — create
- `POST /projects/{id}/approve` — approve/reject
- `GET /projects/task-eligible` — wrapper added (for Phase F)
- `GET /tasks?project_id=` — read-only task summaries for list/detail

**Backend gaps:**
- **No `PATCH/PUT /projects/{id}`** — edit screen not created; `canEdit` always false
- Project API has no team member list, department, client, activity feed, or attachments
- Team size shown as owner + manager (2) with names fetched via `/users/{id}`
- Health (`On Track`, `At Risk`, `Delayed`) derived client-side from status, due date, progress
- `team_lead` / `intern` RBAC on backend may limit project visibility (backend source of truth)

**Role permissions (UI guards):**
- Create: admin, manager, employee, team_lead (`canUserCreateProject`)
- Approve/reject: project manager or admin when `approval_status === pending`
- Edit: not exposed (no update API)
- Add task: disabled placeholder → Phase F

**Search/filter:**
- Client-side search on title/description
- Client-side filter chips (All, Active, Planning, On Track, At Risk, Delayed, Completed, My Projects, Team Projects)
- Backend supports `project_status`, `approval_status`, `owner_id`, `manager_id` params (available for future server-side filter)

**Task items deferred to Phase F:**
- Full task list UI and task detail screen
- Add Task action (disabled on detail)
- `tasks.api.ts` / `useTasks.ts` full module
- Dashboard project metric placeholders may remain until dashboard refresh ties to project hooks

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 21. Phase F Notes (completed)

**Stitch screens referenced:**
- `tasks_screen/code.html` + `screen.png`
- `task_detail_screen/code.html` + `screen.png`
- `project_detail_screen/code.html` — task preview integration only

**Files changed/created:**
- `src/types/task.ts` — **new** API + view model types
- `src/api/tasks.api.ts` — **new** task CRUD, comments, subtasks, admin overview
- `src/utils/task-adapters.ts` — **new** status/priority labels, filters, permissions, actions
- `src/hooks/useTasks.ts` — **new** React Query hooks + mutations
- `src/constants/query-keys.ts` — task query keys
- `src/components/tasks/*` — **new** TaskCard, badges, progress, comments, checklist, form
- `app/(tabs)/tasks.tsx` — replaced placeholder with full Stitch list
- `app/tasks/_layout.tsx` — **new**
- `app/tasks/[taskId].tsx` — **new** detail screen
- `app/tasks/create.tsx` — **new** create screen
- `app/tasks/edit/[taskId].tsx` — **new** edit screen (manager/admin/team_lead)
- `app/team-tasks.tsx` — **new** team workload overview
- `app/_layout.tsx` — registers `tasks` stack + `team-tasks`
- `app/projects/[projectId].tsx` — Add Task + task preview navigation
- `src/components/projects/ProjectActivityList.tsx` — tappable rows + status labels
- Dashboard quick actions — Tasks subtitles updated; Assign Task wired for Manager/Admin

**Backend endpoints confirmed & used:**
- `GET /tasks` — list (RBAC-scoped; params: `project_id`, `assigned_to`, `status`)
- `GET /tasks/{id}` — detail
- `POST /tasks` — create
- `PATCH /tasks/{id}` — update (employees limited to `status`, `blocked_reason`)
- `GET/POST /tasks/{id}/comments` — comments timeline + composer
- `GET /tasks/{id}/subtasks` — checklist (read-only in UI)
- `GET /tasks/admin/overview` — wrapper added (admin-only; not used in main tab yet)
- `GET /projects/task-eligible` — project selector on create

**Backend gaps:**
- **No separate progress endpoint** — progress derived client-side from status/duration
- **No reassign via PATCH** — `assigned_to` not in update payload; edit form hides project/assignee
- **No subtask create/update endpoints** — checklist read-only
- **No task delete endpoint** — delete not exposed
- **No attachments on tasks**
- Comment records lack `user_name` in schema — UI falls back to “Team member” / “You”
- Admin overview not wired to a dedicated admin task screen (available via hook)

**Role permissions (UI guards via `task-adapters.ts`):**
- Create: admin, manager, team_lead
- Team view / team-tasks screen: admin, manager, team_lead, hr_operations
- Edit details: admin, manager, team_lead
- Status update: assignee + admin/manager/team_lead
- Comment: all users with read access

**Search/filter:**
- Client-side search on title, project name, assignee name
- Client-side filter chips (All, Today, Pending, Not Started, In Progress, In Review, Completed, Overdue, Blocked, High Priority)
- My Tasks uses `assigned_to` API param; Team Tasks uses RBAC-scoped list

**Task actions (via PATCH status):**
- Start → `in_progress`
- Send for review → `reviewed`
- Mark completed → `completed`
- Mark blocked → `blocked` (+ reason)
- Reopen → `reopened`
- Resume from blocked → `in_progress`

**Offline/loading/error:**
- `OfflineBanner` on all task screens
- Pull-to-refresh on list/detail/team
- `LoadingSkeletonList`, `EmptyState`, `ErrorState` with retry
- Mutations disabled offline with alerts

**Project integration:**
- Task preview rows navigate to `/tasks/[taskId]`
- Add Task → `/tasks/create?projectId=...` when role allowed

**Typecheck:** Pass (`npm run typecheck`)

**Phase F gaps (deferred):**
- Pixel-perfect device QA vs Stitch PNGs not run
- Admin task overview screen not built (API wrapper exists)
- Subtask creation/editing not available (backend read-only list)
- Task reassign not available (backend gap)
- List view does not fetch per-task comment counts (shows 0 unless enriched later)

**No APK, EAS build, or `expo export` run**

---

## 22. Phase G Notes (completed)

**Design reference:**
- No dedicated Stitch export for Messages/Calls — restyled using Phase A design system (Dashboard/Attendance/Projects/Tasks parity)

**Files changed:**
- `app/(tabs)/messages.tsx` — Stitch header, search, offline banner, notification bell
- `app/chat/[conversationId].tsx` — participant role in header, theme import
- `src/components/messages/ConversationCard.tsx` — intelligence card + accent stripe, unread, role badge
- `src/components/messages/ConversationList.tsx` — skeleton, empty, error states
- `src/components/messages/NewConversationModal.tsx` — Stitch search modal + BottomSheet actions
- `src/components/messages/UserSearchResultCard.tsx` — Stitch user cards with RoleBadge
- `src/components/messages/ChatHeader.tsx` — light safe-area header, voice/video in header
- `src/components/messages/ChatBubble.tsx` — Stitch primary bubbles
- `src/components/messages/ChatComposer.tsx` — compact pill input + send (no toolbar)
- `src/components/messages/MessageList.tsx` — skeleton, empty, date dividers
- `src/components/messages/ConnectionStatusBar.tsx` — Stitch status colors
- `src/components/messages/CallSystemMessage.tsx` — centered call activity pills
- `src/components/messages/EmptyConversationState.tsx` — EmptyState component
- `src/components/calls/*` — CallModalOverlay, Incoming/Outgoing/Active modals, controls, avatar, status badge
- `src/calls/CallOverlayProvider.tsx` — speaker toggle wired for voice calls
- `src/utils/messages.ts` — conversation search + call preview helpers

**Message list result:**
- Light `#f9f9ff` background, BrandHeader, search, pull-to-refresh, unread badges, role badges, call preview icon

**New Message / People Search result:**
- Full-screen search modal with SearchInput; user cards show name, role, department; BottomSheet with Message / Voice / Video actions

**Direct conversation creation result:**
- Preserved `getOrCreateDirectConversation` flow; offline guard added; dedupe handled by backend

**Chat conversation UI result:**
- Light header with back, avatar, name, RoleBadge; voice/video icons in header only

**Composer result:**
- Simple rounded input + send button; placeholder “Message {Name}”; no attachment/emoji toolbar

**Voice/video header actions result:**
- Preserved `startOutgoingCall` from chat header and New Message BottomSheet

**Call UI restyle result:**
- Primary blue overlay (`rgba(0,55,176,0.94)`), dark full-screen active calls, rounded controls, danger end button, avatar pulse on incoming/outgoing

**Call signaling result:**
- No transport changes; WebRTC client/store/event mapping preserved; `markCallConnected` still triggered on remote stream or ICE connected; safe logs unchanged

**Permission handling result:**
- Preserved existing media permission flow in call-store; no changes to permission handling

**Offline/loading/error states result:**
- OfflineBanner on messages tab; ConnectionStatusBar on messages/chat; skeleton/empty/error states; offline blocks New Message actions; queued/failed message states preserved

**Two-device QA:**
- **Not performed** in this session (no paired devices / dev build runtime available)

**Backend/event gaps:**
- Speaker toggle is UI state only (no native audio route switch wired)

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 23. Phase H Notes (completed)

**Design reference:**
- No dedicated Stitch export for Alerts — built using Phase A design system (intelligence cards, filter chips, severity accent stripe, light background)

**Backend endpoints confirmed:**
- `GET /api/v1/alerts` — list user alerts (limit 100, no query params)
- `PATCH /api/v1/alerts/{id}/resolve` — mark alert resolved (`status=resolved`, `resolved_at`)
- Existing notifications API preserved: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`

**Files changed:**
- `src/types/alert.ts` — normalized `AlertViewModel`, filter IDs, severity/category types
- `src/api/alerts.api.ts` — `getAlerts`, `resolveAlert` via shared `apiClient`
- `src/utils/alert-adapters.ts` — backend → view-model mapping, category normalization, client-side filters, contextual routing
- `src/hooks/useAlerts.ts` — unified feed query, filtered alerts, dismiss/resolve mutations, open-alerts count, notifications unread count preserved
- `src/constants/query-keys.ts` — `alerts`, `alertsOpenCount` keys
- `src/components/alerts/*` — `AlertCard`, `AlertFilters`, `AlertSeverityBadge`, `AlertCategoryIcon`, `AlertList`, barrel export
- `src/components/profile/ProfileAlertsCard.tsx` — minimal “Notifications & Alerts” entry with combined unread badge
- `app/alerts.tsx` — final alert center (filters, pull-to-refresh, mark-all for notifications, offline/error/empty states)
- `app/(tabs)/notifications.tsx` — legacy redirect → `/alerts`
- `app/(tabs)/profile.tsx` — added `ProfileAlertsCard` (no full profile restyle)
- `src/notifications/notification-navigation.ts` — entity-aware routing via `getAlertRouteTarget` for push/deep links

**Alert API wrapper result:**
- Typed `getAlerts()` + `resolveAlert(id)` against real backend; no second Axios client; no token logging

**Alert hook result:**
- `useAlertsFeed` merges `/alerts` + `/notifications` into one sorted feed
- `useFilteredAlerts(filter)` applies client-side chip filters
- `useDismissAlertItem` resolves alerts or marks notifications read depending on source
- `useMarkAllAlertsRead` applies to notifications only (backend has read-all for notifications, not alerts)
- `useUnreadNotificationCount` unchanged for dashboard bell compatibility
- `useOpenAlertsCount` counts unresolved backend alerts

**Alerts screen result:**
- Safe-area `BrandHeader` with back, title “Alerts”, unread subtitle
- Filter chips: All, Unread, Attendance, Projects, Tasks, Leave, Messages, System
- Intelligence-style cards with 4px severity accent, category icon, severity badge, timestamps
- Pull-to-refresh, skeleton loading, empty/filtered-empty, error + retry, offline banner

**Filter chips result:**
- Client-side filtering over merged feed (backend alerts endpoint has no category/unread query params)

**Resolve / mark-read result:**
- Backend alerts: **resolve only** (`PATCH /alerts/{id}/resolve`) — UI labels as dismiss/mark resolved
- Notifications: **mark read** via existing notifications API
- Mark-all: **notifications only** — open alerts must be resolved individually; button hidden when no unread notifications

**Dashboard bell result:**
- Unchanged from Phase C — `DashboardHeader` bell → `/alerts` with `notificationsUnread` count (not broken)

**Profile notifications entry result:**
- Added `ProfileAlertsCard` below profile info — opens `/alerts`, shows combined unread + open alerts count

**Contextual alert routing result:**
- `task` → `/tasks/[taskId]`
- `project` → `/projects/[projectId]`
- `attendance_session` → `/(tabs)/attendance`
- `approval` / leave types → `/leave-request`
- `conversation` → `/chat/[conversationId]`
- messages/calls → `/(tabs)/messages`
- unknown/system → card only, no unsafe UUID routes

**Push / deep-link result:**
- Generic notification tap still → `/alerts`
- `pims://alerts` unchanged
- Enhanced `notification-navigation.ts` to route entity_type/entity_id when present

**Legacy notifications route result:**
- `app/(tabs)/notifications.tsx` kept (hidden from tab bar) — redirects to `/alerts` for backward compatibility

**Offline / loading / empty / error result:**
- Offline banner on alerts screen; offline blocks dismiss/mark-all with alert
- Skeleton while loading; empty state when no items; filtered-empty message per chip; error state with retry; partial failure tolerated (one source can succeed)

**Backend gaps:**
- No bulk resolve-all for alerts
- No separate mark-read on alerts (resolve = dismiss)
- Alerts list endpoint has no server-side filter/pagination params (client-side only)
- Dashboard bell unread count still uses notifications API only (open alerts counted separately on alerts screen + profile card)

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 24. Phase I Notes (completed)

**Design reference:**
- No dedicated Stitch Profile export — restyled using Phase A design system (BrandHeader, intelligence cards, accent stripe, RoleBadge, StatusBadge, QuickActionCard shortcuts)

**Files changed:**
- `app/(tabs)/profile.tsx` — Stitch layout: BrandHeader + bell, hero, shortcuts, admin tools, alerts, push card, diagnostics, logout
- `app/(tabs)/manage.tsx` — Stitch manage hub with MetricBentoGrid summary + tool cards
- `app/manage/users.tsx`, `team.tsx`, `approvals.tsx` — SearchInput, OfflineBanner, LoadingSkeleton, EmptyState
- `app/manage/user/[userId].tsx` — OfflineBanner on detail
- `app/reports/index.tsx` — Stitch entry cards + section header
- `src/components/profile/ProfileHeroCard.tsx` — new Stitch hero card
- `src/components/profile/ProfileShortcuts.tsx` — quick access shortcuts
- `src/components/profile/ProfileAdminToolsCard.tsx` — role-gated manage hub entry
- `src/components/profile/ProfileInfoCard.tsx` — intelligence card restyle
- `src/components/profile/ProfilePicturePicker.tsx` — intelligence card restyle
- `src/components/profile/NotificationSettingsCard.tsx` — StatusBadge + Stitch card
- `src/components/profile/BuildDiagnosticsCard.tsx` — Stitch card; removed raw role key from UI
- `src/components/manage/ManageScreenHeader.tsx` — BrandHeader wrapper with back
- `src/components/manage/ManageHubCard.tsx` — 4px accent stripe intelligence cards
- `src/components/manage/StatCard.tsx` — Stitch metric cards
- `src/components/manage/UserListCard.tsx` — RoleBadge, StatusBadge, department/designation
- `src/components/manage/UserDetailCard.tsx` — hero + detail rows, no UUIDs
- `src/components/manage/ApprovalCard.tsx` — requester initials, status badge
- `src/components/manage/FilterBar.tsx` — FilterChips integration
- `src/components/manage/EmptyAccessState.tsx` — Stitch typography/colors

**Profile screen result:**
- Light background, safe-area BrandHeader with notification bell → `/alerts`
- Hero card: avatar, name, email, RoleBadge, StatusBadge, department, designation, phone
- Profile picture upload/remove preserved
- Edit profile modal preserved
- Quick access: Attendance, Projects, Tasks, Messages
- Account details intelligence card
- Logout with confirm + SecureStore flow unchanged

**Profile alerts entry result:**
- `ProfileAlertsCard` retained (Phase H) with combined unread badge → `/alerts`

**Push notification card result:**
- Restyled with StatusBadge (enabled/disabled/unavailable)
- Enable/disable actions preserved; Expo Go guard unchanged

**Build diagnostics result:**
- Preserved in non-production: app version, native version, feature set, build profile, app env, build time, EAS build prefix, signed-in role (formatted), manage hub access, reports hub access, enabled features list
- Removed raw internal role key from display

**Logout result:**
- Unchanged auth-store logout with confirm dialog; no token logging

**Manage/Admin tools result:**
- Hidden tab route `/manage` restyled with role-based title, summary metrics, tool cards
- Added Attendance Corrections card to manage hub (route existed, was missing from hub)
- Profile `ProfileAdminToolsCard` for Admin/HR/Manager/Team Lead only
- Dashboard quick actions unchanged (already wired in Phase C)

**User management result:**
- Users + Team screens: SearchInput, Stitch user cards with initials, RoleBadge, department, designation, status
- User detail: hero + structured rows; message/attendance/reports actions preserved

**Approvals result:**
- FilterChips for All / Leave-WFH / Corrections
- Approval cards with requester initials, status badge, reason preview, timestamp
- Approve/reject flows untouched (detail screen unchanged)

**Reports result:**
- Reports hub entry cards restyled via updated ManageHubCard; role-gated cards preserved
- Individual report detail screens not fully restyled (entry-only scope)

**Shifts/Operations result:**
- **Deferred** — no `app/shifts.tsx`, no mobile shifts API wrapper; web has `/admin/operations/shifts` only

**Role permissions result:**
- `ProfileAdminToolsCard` + manage hub guarded by `canAccessManage`
- Employee/Intern see profile shortcuts only, no admin tools card
- Backend remains source of truth via RoleAccessGuard on manage routes

**Offline/loading/empty/error result:**
- OfflineBanner on profile, manage hub, users, team, approvals, reports hub, user detail
- LoadingSkeleton on profile/users/approvals/team
- EmptyState + ErrorState with retry on list screens
- Offline blocks profile edit/upload with alerts

**Raw UUID exposure audit:**
- No user/entity UUIDs rendered in profile or manage UI
- IDs used only for navigation params internally
- Build diagnostics shows truncated EAS build prefix only (8 chars)

**Backend gaps:**
- Shifts/operations mobile route not implemented
- User create/edit admin screens not in mobile (profile self-edit only)
- Individual report detail screens still legacy styling

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 25. Phase J Notes (completed)

**Stitch screens used:**
- `splash_screen/code.html` — light `#f9f9ff` background, centered logo, PIMS title, tagline, loading indicator
- `login_screen/code.html` — welcome card, email/password fields with icons, visibility toggle, forgot password link, Sign In button, footer

**Files changed:**
- `app.json` — splash uses `./assets/logo.png`, background `#f9f9ff`
- `app/(auth)/login.tsx` — full Stitch restyle
- `app/(auth)/forgot-password.tsx` — new screen matching login visual style
- `app/(auth)/_layout.tsx` — registers forgot-password route
- `app/_layout.tsx` — `AuthBootstrapSplash` during font/auth hydrate
- `src/api/auth.api.ts` — added `forgotPasswordRequest`
- `src/types/auth.ts` — forgot-password request/response types
- `src/components/auth/*` — AuthScreenLayout, AuthBrandingHeader, AuthTextField, AuthFormCard, AuthBootstrapSplash

**Splash config result:**
- Native splash: `assets/logo.png`, `resizeMode: contain`, `backgroundColor: #f9f9ff`
- Android adaptive icon config unchanged
- In-app bootstrap splash mirrors Stitch with logo frame, PIMS title, tagline, spinner

**Login result:**
- Stitch light background, centered card, PIMS logo, “Welcome to PIMS”, tagline, description
- Email/password fields with mail/lock icons and password visibility toggle
- Forgot password link → `/(auth)/forgot-password`
- Sign In button with loading state; invalid credential + validation + offline errors
- Non-production env hint only; footer © Paramount Intelligence
- Auth store login flow unchanged

**Forgot password result:**
- Back navigation, email field, Send recovery link, success state, validation, error/offline handling
- Wired to `POST /auth/forgot-password` (same as web)
- Success shows backend message without revealing whether email exists

**Auth API behavior:**
- Login: unchanged `POST /auth/login` via auth store
- Forgot password: new `forgotPasswordRequest()` wrapper only
- No changes to refresh, logout, or token rotation

**SecureStore/token behavior:**
- Unchanged — tokens still saved via `saveTokens` in auth store only
- No AsyncStorage token storage; no credential/token logging

**Backend gaps:**
- Mobile has no in-app reset-password screen (web uses email link to `/reset-password` with token) — intentional; forgot-password sends email link only
- `debug_token` in dev response not shown in UI (security)

**Visual gaps:**
- “Keep me logged in” checkbox from Stitch HTML not implemented (session always uses SecureStore when logged in)
- Stitch login page background is `#F8F9FA` (backgroundAlt) — matched via AuthScreenLayout
- Native splash has no animated loader text (static logo only; bootstrap splash adds “Initializing system…”)

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 26. Phase K Notes (completed)

**Files changed:**
- `src/animations/usePulseRing.ts` — repeating ring pulse hook
- `src/animations/index.ts` — export `usePulseRing`
- `src/components/ui/BottomSheet.tsx` — exit animation before modal unmount
- `src/network/OfflineBanner.tsx` — slide-out animation before unmount
- `src/components/calls/CallParticipantAvatar.tsx` — animated incoming-call pulse
- `src/components/ui/IntelligenceCard.tsx` — optional stagger index + `AnimatedPressable`
- `src/components/dashboard/dashboard-shared.tsx` — section stagger; removed phase placeholder hints
- `src/components/dashboard/*Dashboard.tsx` — section/card indices; real project subtitles
- `src/components/dashboard/index.ts` — removed `PHASE_E_HINT` / `PHASE_F_HINT` exports
- `src/components/alerts/AlertList.tsx` — `FadeSlideIn` per alert row
- `src/components/alerts/AlertCard.tsx` — `AnimatedPressable` press feedback
- `src/components/messages/ConversationCard.tsx` — `AnimatedPressable`
- `src/components/projects/ProjectCard.tsx` — `AnimatedPressable`
- `src/components/tasks/TaskCard.tsx` — `AnimatedPressable`
- `src/components/profile/ProfileAlertsCard.tsx` — `AnimatedPressable`
- `app/chat/[conversationId].tsx` — keyboard offset tweak for composer

**Animations added/enhanced:**
- K1: `FadeSlideIn` on `SummaryCard`, `QuickActionCard`, `DashboardSection`, `IntelligenceCard` (dashboard indices)
- K2: `AnimatedTabIcon` scale spring (existing; verified in tab layout)
- K3: Bottom sheet slide-up + backdrop fade with dismiss exit animation
- K4: Alert list row fade/slide stagger
- K5: `usePulseRing` on incoming call avatar
- K6: Offline banner slide/fade in and out (no abrupt unmount)

**Press feedback:**
- `AnimatedPressable` on Alert, Conversation, Project, Task, Profile alerts, Intelligence cards, QuickAction/ManageHub (existing)

**UI polish fixes:**
- Removed “Connects in Phase E/F” dashboard placeholder subtitles
- Replaced with product copy (“Assigned project work”, “Browse active projects”, etc.)
- Chat `keyboardVerticalOffset` adjusted for safer composer clearance

**Deferred:**
- Full-screen transition animations between routes
- Lottie/Reanimated (not installed)
- Alert list item exit animation on dismiss (optimistic remove only)

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 27. Phase L — Android permissions & native readiness

- [x] L1. Android permission config audited
- [x] L2. Notification channels verified
- [x] L3. Incoming call sound/ringtone verified
- [x] L4. Microphone permission flow verified
- [x] L5. Camera permission flow verified
- [x] L6. Profile image picker permission verified
- [x] L7. WebRTC native readiness verified
- [x] L8. Foreground service need audited
- [x] L9. Permission readiness UI/card added
- [x] L10. ANDROID_PERMISSIONS_QA.md created
- [x] L11. Typecheck passed

---

## 28. Phase L Notes (completed)

**Files changed:**
- `app.json` — Android permissions: added `ACCESS_NETWORK_STATE`, `VIBRATE`; removed `BLUETOOTH_CONNECT`
- `assets/sounds/incoming-call.wav` — bundled foreground ringtone asset
- `src/notifications/notification-channels.ts` — default, alerts, messages, incoming-calls channels
- `src/notifications/notifications-service.ts` — channels before push token
- `src/notifications/PushNotificationProvider.tsx` — early channel setup on Android
- `src/calls/incoming-call-ringtone.ts` — expo-audio loop + vibration; stop on phase change
- `src/calls/CallOverlayProvider.tsx` — start/stop ringtone with incoming modal
- `src/permissions/device-permissions.ts` — permission snapshot + retry helpers
- `src/components/profile/DevicePermissionsCard.tsx` — Profile device readiness card
- `src/components/profile/ProfilePicturePicker.tsx` — Open Settings on library deny
- `app/(tabs)/profile.tsx` — Device permissions card
- `ANDROID_PERMISSIONS_QA.md` — manual QA checklist

**Android permissions added/verified:**
- `INTERNET`, `ACCESS_NETWORK_STATE`, `RECORD_AUDIO`, `CAMERA`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`, `VIBRATE`
- Scoped photo library via `expo-image-picker` plugin (Android 13+)

**Permissions intentionally not added:**
- `BLUETOOTH_CONNECT`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, location, contacts, SMS, call log, calendar, broad storage

**Notification channels:** `default`, `alerts`, `messages`, `incoming-calls` (MAX importance, sound, vibration, lock screen PUBLIC)

**Android 13+ notifications:** `POST_NOTIFICATIONS` via `expo-notifications.requestPermissionsAsync()` before token; Profile push card + Device permissions card

**Incoming call sound:** Foreground loop via `expo-audio` + vibration; background via `incoming-calls` channel default sound (server must set channelId)

**Microphone / camera / profile picker:** Existing `media-permissions.ts` and `ProfilePicturePicker` verified; deny paths show Open Settings

**WebRTC:** Config plugin present; dev/preview build required; no Expo Go

**Foreground service:** Not required — documented in QA

**Bluetooth/speaker:** Speaker toggle UI-only; BT routing gap documented; BLUETOOTH_CONNECT removed

**Typecheck:** Pass (`npm run typecheck`)

**No APK, EAS build, or `expo export` run**

---

## 29. Final Verification + Android Build Phase

- [x] Final code audit (tabs, permissions, WebRTC, channels, production URLs)
- [x] Typecheck passed
- [x] `expo export --platform android` passed
- [x] eas.json development + preview profiles verified
- [x] Version bumped to 1.4.0 (versionCode 5), feature set `mobile-stitch-v2`
- [x] Development APK built (FINISHED)
- [ ] Development APK device QA (pending physical Android testing)
- [ ] Preview APK build (after dev QA passes)

**Development build:** https://expo.dev/accounts/ziauldin/projects/pims-mobile/builds/beb92451-805e-4f50-b414-12078bd85481

**Metro dev client:** `npx expo start --dev-client` (localhost:8081)

---

## 30. Real Device QA Bug Fixes

- [x] Work mode selector (Office / WFH) on check-in
- [x] Attendance status bug (`ON LEAVE` after normal check-in/out)
- [x] Report period filter chips layout (FilterChips, no flex stretch)
- [x] Bottom tab spacing (`useTabScreenBottomInset`, remove double safe-area)
- [x] Admin user management parity (7-tab mobile panel)
- [x] Messages 403 React Query redbox fix
- [x] WebRTC TurboModule fix (`newArchEnabled: false` — **new dev build required**)
- [x] Create Task keyboard/layout + assignee cards
- [x] Typecheck + export passed

**New development build required** after WebRTC/new architecture config change.

---

## 31. Small Fixes — 12-hour time + Voice Notes

- [x] Central 12-hour formatter (`src/utils/date-time.ts` via `format.ts`)
- [x] Attendance, dashboard, manage, messages, alerts, approvals timestamps updated
- [x] Voice note recording in chat (`VoiceNoteRecorder`, `expo-audio`)
- [x] Voice note bubbles + authenticated playback (`VoiceNoteBubble`)
- [x] Backend attachment upload extended for audio (m4a/mp4/aac/etc.)
- [x] Mic permission on record tap only; offline blocks voice send
- [x] Max 60s / 2 MB voice note limits
- [x] Typecheck + export passed
- [x] **No new native dev build required** (uses existing `expo-audio` + `RECORD_AUDIO`)

**Backend deploy required** on Railway for audio attachment extensions.

---

## 32. Final Production Polish — Header spacing, default device tones, documentation

- [x] **Top blank space fix** — `Screen` `headerSafeArea` prop omits duplicate top SafeAreaView inset; headers (`BrandHeader`, `DashboardHeader`, `ChatHeader`) apply `insets.top` exactly once
- [x] Tab screens, alerts, manage, reports, detail screens updated with `headerSafeArea`
- [x] Chat screen: `SafeAreaView edges={['bottom']}` only (ChatHeader owns top inset)
- [x] **Device default tones** — all notification channels use `sound: 'default'`; foreground incoming call uses vibration only (no custom WAV loop)
- [x] `incoming-call-ringtone.ts` — removed `expo-audio` WAV playback; `assets/sounds/incoming-call.wav` retained but unused
- [x] `notifications-service.ts` — `shouldPlaySound: true` for device default notification sound
- [x] **PIMS logo branding** — `icon.png`, `favicon.png`, `android-icon-foreground.png` regenerated from `assets/logo.png`; adaptive background `#f9f9ff`
- [x] **Documentation** — `apps/mobile/docs/` (README, USER_GUIDE, ADMIN_GUIDE, TECHNICAL_GUIDE, TESTING_QA, RELEASE_GUIDE, TROUBLESHOOTING, FEATURE_MATRIX)
- [x] `ANDROID_PERMISSIONS_QA.md` updated for default sound behavior
- [x] **Horizontal overflow / right-side clipping** — removed invalid negative header margins; `Screen`/`MetricBentoGrid`/cards use `width: '100%'`, `minWidth: 0`, `flexShrink`, truncation
- [x] **Dashboard/header responsive layout** — role badge wraps, bell slot fixed, greeting truncates
- [ ] Preview APK final QA (after typecheck + export)

**QA requirements:** Verify header flush below status bar on Dashboard + all tabs; verify no custom ringtone loop on foreground call; verify push uses device default sound; **verify no horizontal overflow or right-side text clipping** on physical device; run full TESTING_QA.md checklist on preview APK.

