"""Central attendance duration thresholds and status calculation."""
from __future__ import annotations

from app.models.enums import AttendanceClassification

# Duration thresholds (minutes)
FULL_LEAVE_MAX_EXCLUSIVE = 60
HALF_DAY_MAX_EXCLUSIVE = 240
FULL_DAY_MIN_EXCLUSIVE = 360


def calculate_attendance_classification(
    total_worked_minutes: int,
    *,
    is_active: bool = False,
) -> AttendanceClassification:
    """
    Derive attendance classification from total worked minutes.

    Rules (checked in order):
    - < 1 hour: Full Leave
    - >= 1 hour and < 4 hours: Half Day
    - > 6 hours: Full Day
    - 4 hours to 6 hours inclusive: Insufficient Hours (short_leave)
    """
    if is_active:
        return AttendanceClassification.ACTIVE

    minutes = max(0, int(total_worked_minutes))

    if minutes < FULL_LEAVE_MAX_EXCLUSIVE:
        return AttendanceClassification.FULL_LEAVE
    if minutes < HALF_DAY_MAX_EXCLUSIVE:
        return AttendanceClassification.HALF_DAY
    if minutes > FULL_DAY_MIN_EXCLUSIVE:
        return AttendanceClassification.FULL_DAY
    return AttendanceClassification.SHORT_LEAVE


def classification_from_session(
    *,
    worked_minutes: int | None,
    total_hours: float | None,
    is_active: bool,
) -> AttendanceClassification:
    """Resolve classification using worked_minutes, falling back to total_hours."""
    if is_active:
        return AttendanceClassification.ACTIVE
    if worked_minutes is not None:
        return calculate_attendance_classification(worked_minutes)
    if total_hours is not None:
        return calculate_attendance_classification(int(round(total_hours * 60)))
    return AttendanceClassification.FULL_LEAVE
