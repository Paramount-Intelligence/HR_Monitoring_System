# 06 Database Schema

The database follows a normalized relational structure designed for transactional integrity and analytical ease.

## Core Tables

### 1. `users`
Stores user profile, authentication hashes, and role-based metadata.
*   `id`: UUID (Primary Key)
*   `full_name`: String(255)
*   `email`: String(255) (Unique Index)
*   `password_hash`: String(255)
*   `role`: Enum (admin, manager, employee, hr_operations, team_lead, intern, junior_employee)
*   `status`: Enum (active, inactive, suspended, invited)
*   `department_id`: UUID (FK to `departments.id`)
*   `shift_id`: UUID (FK to `shifts.id`)
*   `manager_id`: UUID (FK to `users.id`) (Self-referencing for hierarchy)

### 2. `attendance_sessions`
Captures daily work sessions and calculated metrics.
*   `id`: UUID (PK)
*   `user_id`: UUID (FK)
*   `check_in_at`: Timestamptz
*   `check_out_at`: Timestamptz (Nullable)
*   `work_mode`: Enum (office, wfh)
*   `session_status`: Enum (active, completed, incomplete, corrected)
*   `attendance_classification`: Enum (active, full_day, half_day, short_leave, insufficient, leave)
*   `worked_minutes`: Integer (Calculated)
*   `late_minutes`: Integer (Calculated based on shift start)
*   `total_break_minutes`: Integer (Aggregated from `attendance_breaks`)

### 3. `attendance_breaks`
Tracks specific paid breaks during an attendance session.
*   `id`: UUID (PK)
*   `attendance_session_id`: UUID (FK)
*   `user_id`: UUID (FK)
*   `break_type`: Enum (dinner, prayer, other)
*   `started_at`: Timestamptz
*   `ended_at`: Timestamptz (Nullable)
*   `duration_minutes`: Integer
*   `is_paid`: Boolean (Default: True)

### 4. `leave_requests`
Manages leaves, WFH, and half-day requests.
*   `id`: UUID (PK)
*   `user_id`: UUID (FK)
*   `start_date`: Date
*   `end_date`: Date
*   `leave_type`: Enum (sick, casual, annual, half_day, wfh)
*   `status`: Enum (pending, approved, rejected, escalated, cancelled, needs_clarification)
*   `is_half_day`: Boolean
*   `half_day_period`: Enum (first_half, second_half)
*   `current_approver_id`: UUID (FK to `users.id`)

### 5. `projects`
Governs work areas and their approval status.
*   `id`: UUID (PK)
*   `title`: String(255)
*   `owner_id`: UUID (FK to `users.id`)
*   `approval_status`: Enum (pending, approved, rejected)
*   `project_status`: Enum (draft, active, completed, etc.)

### 6. `tasks`
Individual work items under projects.
*   `id`: UUID (PK)
*   `project_id`: UUID (FK)
*   `assigned_to`: UUID (FK)
*   `status`: Enum (created, in_progress, blocked, completed, reviewed)
*   `complexity_level`: Integer
*   `expected_duration_minutes`: Integer

### 7. `time_logs`
High-resolution time tracking for tasks.
*   `id`: UUID (PK)
*   `task_id`: UUID (FK)
*   `user_id`: UUID (FK)
*   `started_at`: Timestamptz
*   `ended_at`: Timestamptz
*   `source_type`: Enum (timer, manual)

## Supporting Tables
*   **`departments`**: Organizational units.
*   **`shifts`**: Work hour definitions (e.g., 5 PM to 2 AM PKT).
*   **`holidays`**: Public holidays affecting attendance classification.
*   **`announcements`**: Broadcast messages for roles/departments.
*   **`audit_logs`**: Immutable trail of sensitive actions (role changes, approvals).
*   **`alerts`**: System-generated exceptions requiring attention.
*   **`approval_timeline`**: Audit trail specifically for Leave/Project approval decisions.

## Key Relationships
*   **User Hierarchy**: `users.manager_id` creates a parent-child relationship for reporting.
*   **Attendance-Breaks**: One-to-many relationship; breaks must occur within the session bounds.
*   **Project-Tasks**: One-to-many relationship; tasks cannot exist without a project.
*   **Task-TimeLogs**: One-to-many; multiple logs (timers or manual) roll up to task duration.

## Constraints & Rules
*   **Overlapping Check**: The system prevents overlapping `attendance_sessions`, `time_logs`, and conflicting `leave_requests` (e.g., cannot have WFH and Annual Leave on the same day).
*   **UTC Persistence**: All `DateTime` fields are stored with timezone info (UTC in DB).
*   **Soft Deletion**: Status enums (e.g., `UserStatus.INACTIVE`) are preferred over hard `DELETE` for auditability.
