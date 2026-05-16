# 02 Roles and Permissions

The system uses a Role-Based Access Control (RBAC) model combined with hierarchical scope checks to ensure data security and operational integrity.

## Role Hierarchy

1.  **Admin** (System Owner)
2.  **HR / Operations** (Org Admin)
3.  **Manager** (Team Owner)
4.  **Team Lead** (Scrutiny & Support)
5.  **Employee** (Individual Contributor)
6.  **Intern / Junior Employee** (Trainee)

---

## Role Definitions

### 1. Admin
*   **Purpose**: Full system governance and technical administration.
*   **Key Actions**: 
    *   Create and manage all user accounts (including other Admins and Managers).
    *   View organization-wide analytics and all employee data.
    *   Configure system settings, shifts, and organization structure.
    *   Access and export all Audit Logs.
    *   Override or resolve any pending approvals.
*   **Data Visibility**: Global.

### 2. HR / Operations
*   **Purpose**: Operational management of the workforce.
*   **Key Actions**:
    *   Manage user profiles and onboarding.
    *   Configure Departments, Shifts, and Holidays.
    *   Create and publish Announcements.
    *   Generate organization-wide reports (Attendance, Leaves, Performance).
    *   Monitor system alerts.
*   **Data Visibility**: Global (except for sensitive technical settings restricted to Admin).

### 3. Manager
*   **Purpose**: Team-level execution and workload management.
*   **Key Actions**:
    *   Approve or Reject Project requests from direct reports.
    *   Approve or Reject Leave/WFH/Half-Day requests.
    *   Define Task complexity and expected duration for team tasks.
    *   Review EOD reports and Team Growth metrics.
    *   View Team-specific analytics and alerts.
*   **Blocked Actions**: Cannot manage users outside their direct reporting line; cannot change global org settings.
*   **Data Visibility**: Scoped to direct and indirect reports.

### 4. Team Lead
*   **Purpose**: First-level supervision and technical guidance.
*   **Key Actions**:
    *   View team task progress and time logs.
    *   Assist in task assignment (if permitted by Manager).
    *   Review team attendance history.
*   **Data Visibility**: Scoped to their assigned team members.

### 5. Employee
*   **Purpose**: Individual work execution and accountability.
*   **Key Actions**:
    *   Check-in/Check-out and log work sessions.
    *   Submit Project requests and create Tasks.
    *   Log time using timers or manual entries.
    *   Submit Leave/WFH/Half-Day requests.
    *   View own performance trends and growth metrics.
*   **Data Visibility**: Own data only.

### 6. Intern / Junior Employee
*   **Purpose**: Learning and assisted execution.
*   **Key Actions**: Same as Employee, but often with additional scrutiny or specific assignment limits.
*   **Behavior**: In some modules, Interns/Junior Employees may require explicit approval for tasks that are auto-approved for senior Employees (Implementation varies by department policy).

---

## Permissions Matrix (Summary)

| Feature | Admin | HR/Ops | Manager | Employee |
|---|:---:|:---:|:---:|:---:|
| User Management | ✅ | ✅ | ❌* | ❌ |
| Org Configuration | ✅ | ✅ | ❌ | ❌ |
| Project Approval | ✅ | ✅ | ✅ | ❌ |
| Leave Approval | ✅ | ✅ | ✅ | ❌ |
| Task Creation | ✅ | ✅ | ✅ | ✅ |
| Time Log Edits | ✅ | ⚠️ | ⚠️ | ✅ (Own) |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Announcements | ✅ | ✅ | ❌ | 👁️ |

*\*Managers can view team member profiles but cannot create/deactivate users.*

## Hierarchical Rules
*   **Manager Mapping**: Every non-Admin user should ideally have a reporting manager assigned.
*   **Department Scoping**: Managers and Team Leads are scoped to their assigned departments.
*   **Ownership Check**: Even if a user has the role `Employee`, they can only modify entities they "own" (e.g., their own tasks or leave requests).

## Important Note on IDs
**IDs (UUIDs) are internal technical values only.** All user-facing documentation and UI components must show Human-Readable Labels (Full Name, Department Name, Shift Name) instead of raw IDs.
