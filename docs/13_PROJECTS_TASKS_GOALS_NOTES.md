# 13 Projects, Tasks, Goals, and Notes

The Work Execution module governs the structure of daily productivity. It follows a "Project-First" hierarchy to ensure all logged work is attributable to approved business objectives.

## 1. Projects
*   **Creation**: Employees can submit project requests.
*   **Approval**: Projects must be `approved` by a Manager or Admin before tasks can be created under them.
*   **Fields**: Title, Description, Priority, Due Date.
*   **Status Lifecycle**: `draft` → `pending_approval` → `approved` → `active` → `completed`.

## 2. Tasks
*   **Assignment**: Tasks are created under an approved project and assigned to an employee.
*   **Complexity Level**: Managers assign a complexity score (e.g., 1, 2, 3, 5, 8) and an **Expected Duration**.
*   **Status Lifecycle**: `created` → `in_progress` → `blocked` → `completed` → `reviewed`.
*   **Blocked State**: If a task is blocked, the user **must** provide a reason.

## 3. Goals and Notes
*   **Goals**: High-level objectives set for an employee (e.g., "Complete 5 high-complexity tasks this month").
*   **Notes**: Personal or professional notes attached to an employee's profile for growth tracking.
*   **Employee Growth Module**: Aggregates completed tasks, complexity scores, and goal achievement to provide a comprehensive growth view.

## 4. UI/UX Rules for Identification
To maintain a professional and human-centric interface, the following rules apply to all IDs:
*   **Internal Only**: UUIDs are for technical indexing only. They must **never** be displayed as labels in the UI.
*   **Label Rules**:
    *   **Tasks**: Show the Task Title.
    *   **Projects**: Show the Project Title.
    *   **Users**: Show the Full Name.
    *   **Dropdowns**: Dropdown labels must be the name/title of the entity, not its ID.
    *   **URLs**: Use IDs in the URL path (e.g., `/tasks/{uuid}`) but ensure the page heading shows the human-readable title.

## 5. Time Tracking Integration
*   **Timer**: Employees start a timer on a specific task. Only one active timer is allowed per user across all tasks.
*   **Manual Log**: fallback for when timers were missed.
*   **Validation**: Time cannot be logged against `blocked`, `rejected`, or `completed` tasks.

## 6. Implementation Status
*   **Implemented**: Project request/approval flow.
*   **Implemented**: Task creation and timer logic.
*   **Implemented**: Complexity scoring and expected duration.
*   **Partial**: Advanced goal tracking and automated growth scoring (Calculations are being refined).

## 7. Known Issues
*   **Dropdown Clipping**: Some long project titles may clip in small screens (CSS fix pending).
*   **Eligible Projects**: Ensure only `approved` or `active` projects appear in the task creation dropdown.
