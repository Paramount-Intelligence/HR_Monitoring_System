# 09 Organization Management

The Organization module allows Admin and HR users to define the operational framework within which the workforce operates.

## 1. Departments
Departments are the primary organizational units used for grouping users and scoping data visibility for Managers.
*   **Fields**: Name, Description.
*   **Assignment**: Every user is assigned to a department during creation or profile update.
*   **Usage**: Filters on dashboards and reports rely heavily on department groupings.

## 2. Work Shifts
Shifts define the expected work hours for employees. They are critical for calculating late check-ins and early check-outs.
*   **Standard Shift**: The primary shift is **5:00 PM to 2:00 AM PKT** (Asia/Karachi).
*   **Fields**: Name, Start Time, End Time.
*   **Overnight Handling**: The system logic handles shifts that cross the midnight boundary (e.g., 5 PM start, 2 AM end).
*   **User Assignment**: Shifts are assigned at the user level, allowing different teams to have different work hours.

## 3. Public Holidays
Holidays are defined globally to ensure that attendance classification logic does not mark employees as "Absent" or "Late" on non-working days.
*   **Fields**: Name, Date.
*   **Impact**: On a holiday, if an employee does not check in, the system classification will reflect `HOLIDAY` or `LEAVE` rather than `INSUFFICIENT`.

## 4. Announcements
The Announcement module allows HR and Admins to broadcast important information.
*   **Targeting**: Announcements can be targeted to specific Roles or Departments.
*   **Status**: Can be `active` (published) or `draft`.
*   **Visibility**: Active announcements appear on the dashboard overview for the target audience.
*   **Fields**: Title, Content (Markdown supported), Priority, Target Role, Target Department.

## 5. Organizational Configuration Workflow
1.  **Define Entities**: First, create Departments and Shifts.
2.  **User Creation**: When creating a user, assign them to a Department and a Shift.
3.  **Reporting Hierarchy**: Assign a Reporting Manager to the user. The system uses this to route project and leave approvals.
4.  **Verification**: Ensure that the Shift timing correctly feeds into the Attendance module for the user.

## Current Implementation Status
*   **Implemented**: CRUD for Departments, Shifts, Holidays, and Announcements.
*   **Partial**: Advanced holiday recurring rules (currently manual entry).
*   **Planned**: Department-specific holiday calendars.

## Known Gaps
*   Announcements currently do not trigger email notifications; they are only visible in the web dashboard.
*   Deleting a shift that is still assigned to users may cause classification errors (Cascading validation is being refined).
