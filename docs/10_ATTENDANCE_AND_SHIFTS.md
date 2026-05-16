# 10 Attendance and Shifts

The Attendance module is the core of daily activity tracking. It combines user-reported events with system-defined shift boundaries to calculate operational metrics.

## 1. Shift Configuration
*   **Standard Shift**: **5:00 PM to 2:00 AM PKT** (Asia/Karachi).
*   **Duration**: 9 hours.
*   **Timezone**: All timestamps are stored in UTC but must be displayed and compared in PKT.

## 2. Attendance Actions

### Check-In
*   Employee selects a `work_mode` (`office` or `wfh`).
*   System captures the precise `check_in_at` timestamp.
*   The session is marked as `active`.

### Check-Out
*   Employee triggers check-out at the end of the day.
*   System captures `check_out_at`.
*   Calculates `worked_minutes` and total session duration.
*   The session is marked as `completed`.
*   **Post-Shift Note**: If checking out after the shift end (e.g., after 2:00 AM PKT), a justification note may be required.

## 3. Session Classification
The system automatically classifies each session based on the duration worked and the shift boundaries.

| Classification | Rule |
|---|---|
| **ACTIVE** | Currently checked in; no checkout yet. |
| **FULL_DAY** | Worked ≥ 9 hours (including breaks). |
| **HALF_DAY** | Worked ≥ 4.5 hours and < 9 hours. |
| **SHORT_LEAVE** / **INSUFFICIENT** | Worked < 4.5 hours. |
| **LEAVE** | No check-in, but an approved leave covers the day. |

## 4. Operational Flags
*   `is_late_login`: True if check-in is after the shift start time (e.g., after 5:00 PM PKT).
*   `is_early_logout`: True if check-out is before the shift end time (e.g., before 2:00 AM PKT).
*   `is_overtime`: True if total session duration significantly exceeds 9 hours.
*   `is_corrected`: True if the session was updated via a manager-approved correction request.

## 5. Correction Requests
*   If an employee forgets to check out or makes a mistake, they can submit a `correction_request`.
*   The request must include a reason and the correct timestamps.
*   Manager must review and approve/reject. Upon approval, the session metrics are recalculated.

## 6. Business Rules
*   **One Active Session**: A user cannot check in if they already have an `active` session.
*   **Overnight Logic**: The system correctly identifies that a check-out at 1:30 AM belongs to the session that started at 5:00 PM the previous calendar day.
*   **Insufficient Data**: If a session is left `active` for more than 24 hours, the system marks it as `incomplete` and triggers an alert.

## 7. Display Requirements
*   All dashboard views and reports must show times in **PKT**.
*   Durations should be displayed as "HH:mm" (e.g., 08:45) rather than raw minutes.
*   IDs (Attendance ID, User ID) must be hidden; show User Full Name and Shift Name instead.
