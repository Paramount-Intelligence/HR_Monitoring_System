# API Specification
## Version 1

## 1. API conventions
- JSON request and response bodies
- RESTful endpoints
- ISO timestamps
- backend enforces RBAC
- standard error format
- pagination for list endpoints
- filtering and date range query params for dashboard lists

## 2. Auth

### POST /auth/login
Request:
```json
{
  "email": "employee@company.com",
  "password": "string"
}
```

Response:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "fullName": "Ali Azzam",
    "role": "employee"
  }
}
```

### POST /auth/logout
Invalidates session.

### POST /auth/refresh
Returns new access token.

### POST /auth/forgot-password
Triggers reset email.

## 3. Users

### POST /users
Permissions:
- admin can create manager or employee
- manager can create employee only

### GET /users
Supports filters:
- role
- managerId
- status
- department

### GET /users/:id
Scoped by permissions.

### PATCH /users/:id
Update profile, status, manager mapping where permitted.

## 4. Attendance

### POST /attendance/check-in
```json
{
  "workMode": "office"
}
```

### POST /attendance/check-out
```json
{
  "notes": "optional"
}
```

### GET /attendance/me
Employee own sessions.

### GET /attendance/team
Manager team sessions.

### PATCH /attendance/:id/correction-request
Employee requests correction.

## 5. Projects

### POST /projects
```json
{
  "title": "Apollo Internal Dashboard",
  "description": "Build internal project visibility",
  "priority": "high",
  "dueDate": "2026-05-30"
}
```

### GET /projects
Filters:
- approvalStatus
- projectStatus
- ownerId
- managerId

### POST /projects/:id/approve
```json
{
  "decision": "approved",
  "reason": "Looks good"
}
```

### POST /projects/:id/reject
```json
{
  "decision": "rejected",
  "reason": "Please add scope details"
}
```

## 6. Tasks

### POST /tasks
```json
{
  "projectId": "uuid",
  "assignedTo": "uuid",
  "title": "Build analytics page",
  "description": "Create manager analytics dashboard",
  "priority": "high",
  "dueDate": "2026-05-15"
}
```

### PATCH /tasks/:id
Update title, description, priority, dueDate, status, blockedReason.

### POST /tasks/:id/complexity
```json
{
  "complexityLevel": 3,
  "expectedDurationMinutes": 180
}
```

### GET /tasks
Filters:
- projectId
- assignedTo
- status
- dueDateFrom
- dueDateTo

## 7. Time logs

### POST /time-logs/start
```json
{
  "taskId": "uuid"
}
```

### POST /time-logs/stop
```json
{
  "taskId": "uuid",
  "notes": "Finished API validation"
}
```

### POST /time-logs/manual
```json
{
  "taskId": "uuid",
  "startedAt": "2026-05-01T10:00:00Z",
  "endedAt": "2026-05-01T11:15:00Z",
  "notes": "Backfilled time"
}
```

### GET /time-logs/me
### GET /time-logs/team

## 8. Approvals

### GET /approvals/pending
Scoped to approver role.

### POST /approvals/:id/decide
```json
{
  "decision": "approved",
  "reason": "Approved after review"
}
```

## 9. Alerts

### GET /alerts
Filters:
- status
- severity
- type

### POST /alerts/:id/resolve
### POST /alerts/:id/dismiss

## 10. Dashboards

### GET /dashboard/employee
Returns:
- attendance summary
- task summary
- weekly trend
- current timer state

### GET /dashboard/manager
Returns:
- team KPI cards
- approvals queue
- workload distribution
- overdue tasks
- recent alerts

### GET /dashboard/admin
Returns:
- org KPI cards
- top performers
- low utilization list
- WFH vs office chart
- manager comparison
- open alerts

## 11. Metrics

### GET /metrics/me
### GET /metrics/team
### GET /metrics/org

Filters:
- dateFrom
- dateTo
- teamId
- managerId

## 12. Standard response envelope
Prefer plain JSON objects for successful responses, but use a standard error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One active timer already exists",
    "details": {}
  }
}
```

## 13. Validation rules
- one active attendance session per user
- one active timer per user
- timer cannot start on blocked or rejected task/project
- manager cannot operate outside their team scope
- employee cannot alter manager assigned complexity
- manual logs cannot overlap existing logs
