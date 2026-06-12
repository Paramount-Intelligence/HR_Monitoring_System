"""Tests for duration-based attendance classification."""
from app.core.attendance_policy import calculate_attendance_classification
from app.models.enums import AttendanceClassification


def test_full_leave_under_one_hour():
    assert calculate_attendance_classification(0) == AttendanceClassification.FULL_LEAVE
    assert calculate_attendance_classification(45) == AttendanceClassification.FULL_LEAVE
    assert calculate_attendance_classification(59) == AttendanceClassification.FULL_LEAVE


def test_half_day_one_to_four_hours():
    assert calculate_attendance_classification(60) == AttendanceClassification.HALF_DAY
    assert calculate_attendance_classification(90) == AttendanceClassification.HALF_DAY
    assert calculate_attendance_classification(239) == AttendanceClassification.HALF_DAY


def test_short_day_four_to_six_hours():
    assert calculate_attendance_classification(240) == AttendanceClassification.SHORT_LEAVE
    assert calculate_attendance_classification(360) == AttendanceClassification.SHORT_LEAVE


def test_full_day_over_six_hours():
    assert calculate_attendance_classification(361) == AttendanceClassification.FULL_DAY
    assert calculate_attendance_classification(440) == AttendanceClassification.FULL_DAY  # 7h 20m


def test_active_session():
    assert calculate_attendance_classification(120, is_active=True) == AttendanceClassification.ACTIVE
