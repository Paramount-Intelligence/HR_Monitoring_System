# 11 Break Tracking

The Break Tracking module allows employees to log their mid-session breaks. This ensures accurate tracking of active work time while acknowledging that certain breaks are part of the paid workday.

## 1. Break Types
The system supports three primary break types:
*   **Dinner**: Standard meal break.
*   **Prayer**: Time for daily prayers.
*   **Other**: Miscellaneous breaks (coffee, short rest, etc.).

## 2. Business Rules
*   **Paid Breaks**: All breaks recorded in the system are currently **Paid**. This means break time is **not deducted** from the total session duration or the calculated work hours.
*   **Session Requirement**: A break can only be started if the user has an `active` attendance session.
*   **Single Active Break**: A user can only have one `active` break at a time.
*   **Automatic Closure**: If a user checks out while a break is still `active`, the system automatically closes the break at the check-out timestamp.

## 3. Data Capture
*   `break_type`: Enum (dinner, prayer, other).
*   `started_at`: Captured when "Start Break" is clicked.
*   `ended_at`: Captured when "Stop Break" is clicked.
*   `duration_minutes`: Calculated on break completion.
*   `note`: Optional context for the break.

## 4. Aggregation & Reporting
*   Total break time is aggregated per attendance session.
*   Break durations are stored in persistent fields on the `attendance_sessions` table (e.g., `dinner_break_minutes`, `prayer_break_minutes`).
*   Managers can see break distributions in the employee activity logs to ensure healthy work-life balance and compliance with company policies.

## 5. Implementation Status
*   **Implemented**: Database models, API endpoints, and basic frontend timer buttons.
*   **Implemented**: Automatic closure on check-out.
*   **Partial**: Visualization of break segments in the attendance history timeline.
*   **Planned**: Configurable maximum durations for specific break types (e.g., 30 mins for Dinner).

## 6. UX Patterns
*   The Break controls are prominently displayed on the Employee Dashboard only when a session is `active`.
*   A "Break in Progress" indicator is shown in the global header to remind the user to end their break.
*   IDs are internal; user-facing views show "Dinner Break" or "Prayer Break".
