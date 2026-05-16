# 07 API Reference

All API requests must be prefixed with `/api/v1`. Protected endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

## 🔐 Auth
*   `POST /auth/login`: Authenticate and receive access/refresh tokens.
*   `POST /auth/logout`: Invalidate current session.
*   `POST /auth/refresh`: Obtain a new access token using a refresh token.
*   `POST /auth/forgot-password`: Request a password reset link.
*   `POST /auth/reset-password`: Complete password reset using a token.
*   `POST /auth/activate`: Activate an invited account and set initial password.

## 👥 Users
*   `GET /users`: List users (Filterable by role, department, manager).
*   `POST /users`: Create a new user (Admin/HR only).
*   `GET /users/me`: Retrieve current user profile.
*   `GET /users/{id}`: Retrieve specific user profile.
*   `PATCH /users/{id}`: Update user profile or status.

## 🕒 Attendance & Breaks
*   `POST /attendance/check-in`: Start a work session (`workMode` required).
*   `POST /attendance/check-out`: End a work session.
*   `GET /attendance/me`: Current user's attendance history.
*   `POST /attendance/breaks/start`: Start a break (Dinner, Prayer, etc.).
*   `POST /attendance/breaks/stop`: End a break.
*   `PATCH /attendance/corrections`: Request a correction for an attendance session.

## 🌴 Leaves & WFH
*   `GET /leaves`: List leave requests (Scoped to role).
*   `POST /leaves`: Submit a new request (Sick, Casual, WFH, Half-Day).
*   `GET /leaves/pending`: Queue of requests awaiting current user's approval.
*   `POST /leaves/{id}/resolve`: Approve or Reject a leave request.

## 🏗️ Projects & Tasks
*   `GET /projects`: List projects.
*   `POST /projects`: Submit a project request for approval.
*   `POST /projects/{id}/approve`: Approve a pending project.
*   `GET /tasks`: List tasks (Filterable by project, status, assignee).
*   `POST /tasks`: Create a new task under an approved project.
*   `PATCH /tasks/{id}`: Update task status (e.g., to `in_progress` or `completed`).
*   `POST /tasks/{id}/complexity`: Set task complexity (Manager only).

## ⏱️ Time Logs
*   `POST /time-logs/start`: Start a timer for a specific task.
*   `POST /time-logs/stop`: Stop the active timer.
*   `POST /time-logs/manual`: Manually log a time entry.
*   `GET /time-logs/me`: Current user's time log history.

## 📊 Analytics & Reports
*   `GET /dashboard/employee`: KPI cards and trends for the current employee.
*   `GET /dashboard/manager`: Team-wide analytics and pending approval counts.
*   `GET /dashboard/admin`: Organization-wide health metrics.
*   `GET /reports/attendance`: Exportable attendance reports.
*   `GET /analytics/admin/analytics`: Detailed org metrics for admin dashboard.

## 📢 Organization & Announcements
*   `GET /departments`: List departments.
*   `GET /shifts`: List work shifts.
*   `GET /holidays`: List public holidays.
*   `GET /announcements`: Active announcements for the user's role/department.
*   `POST /announcements`: Create a new announcement (HR/Admin only).

## 🛡️ Governance
*   `GET /alerts`: List system alerts (Filterable by status, severity).
*   `GET /audit-logs`: Immutable trail of sensitive actions (Admin only).
*   `GET /permissions`: List available roles and their associated permissions.

## ⚙️ Operations (Ops)
*   `GET /health`: System health check.
*   `POST /ops/db/seed`: Seed the database with initial permissions (Restricted).
*   `POST /ops/db/bootstrap-admin`: Ensure a system admin exists (Restricted).

---

## Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Start date must be before end date",
    "details": []
  }
}
```
Common codes: `AUTH_ERROR`, `PERMISSION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.
