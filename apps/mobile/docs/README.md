# PIMS Mobile — Documentation Overview

PIMS (Paramount Intelligence Management System) mobile is the Android-focused workforce app for Paramount Intelligence. It connects to the production Railway backend and gives employees, managers, and HR staff access to attendance, projects, tasks, messaging, calls, and alerts from a phone.

## Purpose

The mobile app extends the PIMS web platform for field and on-the-go use: check in/out, track work, collaborate in chat, join voice/video calls, and respond to workforce alerts without opening a desktop browser.

## Target users

- **Employees and interns** — daily attendance, assigned tasks, team chat
- **Team leads and managers** — team visibility, approvals, task assignment
- **HR operations** — people operations, user directory, leave/correction approvals
- **Admins** — full workforce governance, analytics, user management

## Roles supported

| Role | Mobile dashboard |
|------|------------------|
| Admin | Admin dashboard |
| HR Operations | HR dashboard |
| Manager | Manager dashboard |
| Team Lead | Team Lead dashboard |
| Employee | Employee dashboard |
| Intern / Junior Employee | Intern (guided) dashboard |

## Main modules

| Module | Access |
|--------|--------|
| Dashboard | Role-specific home (tab 1) |
| Attendance | Check-in/out, history, leave/WFH, corrections (tab 2) |
| Projects | List, detail, create (role-dependent) (tab 3) |
| Tasks | My tasks, team tasks, create/edit (tab 4) |
| Messages | Conversations, chat, voice notes, calls (tab 5) |
| Profile | Account, permissions, logout (tab 6) |
| **Alerts** | Bell icon on dashboard header — **not a bottom tab** |
| **Manage** | Dashboard/profile shortcuts — **not a bottom tab** |
| Reports | From Manage (role-filtered) |

## Bottom tab structure (fixed)

1. Dashboard  
2. Attendance  
3. Projects  
4. Tasks  
5. Messages  
6. Profile  

Alerts and Manage are intentionally outside the tab bar.

## Backend / API environment

| Setting | Production value |
|---------|------------------|
| REST API | `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1` |
| WebSocket | `wss://hrmonitoringsystem-production-cb42.up.railway.app/api/v1/ws` |

Configured in `app.json` `extra` and EAS build profiles. Do not change production URLs without a coordinated release.

## Native build requirement

**Expo Go is not supported** for production features. You need a **development client** or **preview/production APK/AAB** for:

- WebRTC voice/video calls  
- Push notifications (Android 13+ `POST_NOTIFICATIONS`)  
- Microphone / camera runtime permissions  
- Secure token storage via `expo-secure-store`  

## High-level architecture

```
Expo Router (app/)
  ├── Auth (SecureStore tokens)
  ├── React Query (server state + offline persist)
  ├── Axios API client (Bearer auth, FormData uploads)
  ├── WebSocket (realtime messages/alerts)
  ├── WebRTC (calls via react-native-webrtc)
  └── Expo Notifications (channels + push token)
```

Shared UI: `BrandHeader`, `DashboardHeader`, `Screen` with single top safe-area handling.

## Branding

- App icon, adaptive icon, and favicon are derived from `assets/logo.png` on `#f9f9ff` background.
- Splash screen uses the same logo family.

## Sound behavior

All notification channels use the **device default notification sound**. Foreground incoming calls use **vibration only** (no custom app ringtone loop).

## Production readiness status

| Area | Status |
|------|--------|
| Core tabs & auth | Ready |
| Attendance Office/WFH | Ready |
| Messages & calls | Ready (native build required) |
| Voice notes | Ready on mobile; **backend must accept `.m4a`** (deploy API to Railway) |
| Push notifications | Ready; backend should send correct `channelId` |
| Header spacing | Fixed (single safe-area inset) |
| Documentation | Complete in `apps/mobile/docs/` |

## Documentation index

| Document | Audience |
|----------|----------|
| [USER_GUIDE.md](./USER_GUIDE.md) | End users |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Admins, HR, managers |
| [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) | Developers |
| [TESTING_QA.md](./TESTING_QA.md) | QA testers |
| [RELEASE_GUIDE.md](./RELEASE_GUIDE.md) | Build & release |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues |
| [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) | Role vs feature access |

Also see: `../ANDROID_PERMISSIONS_QA.md`, `../STITCH_REPLICATION_TODOS.md`.
