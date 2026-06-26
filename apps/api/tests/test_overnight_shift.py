"""Overnight shift attendance window tests."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.time_utils import PK_TZ
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceSessionStatus, UserRole, UserStatus, WorkMode
from app.models.shift import Shift
from app.models.user import User
from app.services.admin_user_management_service import (
    resolve_today_attendance_status,
    roster_statuses_for_users,
    sessions_for_business_date,
)
from app.services.shift_window_service import (
    get_shift_window_for_business_date,
    is_overnight_shift,
    resolve_current_shift_business_date,
    resolve_shift_business_date_for_timestamp,
    session_business_date,
)


def _overnight_shift() -> Shift:
    return Shift(
        id=uuid.uuid4(),
        name="Evening",
        start_time=time(17, 0),
        end_time=time(2, 0),
        timezone="Asia/Karachi",
        grace_period_minutes=15,
    )


def _day_shift() -> Shift:
    return Shift(
        id=uuid.uuid4(),
        name="Day",
        start_time=time(9, 0),
        end_time=time(17, 0),
        timezone="Asia/Karachi",
        grace_period_minutes=15,
    )


class TestShiftWindowHelpers:
    def test_overnight_shift_detected(self):
        assert is_overnight_shift(time(17, 0), time(2, 0)) is True
        assert is_overnight_shift(time(9, 0), time(17, 0)) is False

    def test_overnight_window_spans_next_day(self):
        shift = _overnight_shift()
        business_date = date(2026, 6, 25)
        start, end = get_shift_window_for_business_date(shift, business_date)
        assert start == datetime(2026, 6, 25, 17, 0, tzinfo=PK_TZ)
        assert end == datetime(2026, 6, 26, 2, 0, tzinfo=PK_TZ)

    def test_day_shift_window_same_day(self):
        shift = _day_shift()
        business_date = date(2026, 6, 25)
        start, end = get_shift_window_for_business_date(shift, business_date)
        assert start == datetime(2026, 6, 25, 9, 0, tzinfo=PK_TZ)
        assert end == datetime(2026, 6, 25, 17, 0, tzinfo=PK_TZ)

    def test_after_midnight_belongs_to_previous_business_date(self):
        shift = _overnight_shift()
        now = datetime(2026, 6, 26, 0, 30, tzinfo=PK_TZ)
        assert resolve_current_shift_business_date(shift, now) == date(2026, 6, 25)

    def test_after_shift_end_uses_current_business_date(self):
        shift = _overnight_shift()
        now = datetime(2026, 6, 26, 3, 0, tzinfo=PK_TZ)
        assert resolve_current_shift_business_date(shift, now) == date(2026, 6, 26)

    def test_check_in_at_5pm_maps_to_same_business_date(self):
        shift = _overnight_shift()
        check_in = datetime(2026, 6, 25, 17, 10, tzinfo=PK_TZ)
        assert resolve_shift_business_date_for_timestamp(shift, check_in) == date(2026, 6, 25)

    def test_checkout_at_130am_maps_to_previous_business_date(self):
        shift = _overnight_shift()
        checkout = datetime(2026, 6, 26, 1, 30, tzinfo=PK_TZ)
        assert resolve_shift_business_date_for_timestamp(shift, checkout) == date(2026, 6, 25)


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def overnight_context(db):
    from app.core.security import hash_password

    suffix = uuid.uuid4().hex[:8]
    shift = Shift(
        name=f"Overnight {suffix}",
        start_time=time(17, 0),
        end_time=time(2, 0),
        timezone="Asia/Karachi",
        grace_period_minutes=15,
        is_active=True,
    )
    user = User(
        full_name=f"Overnight User {suffix}",
        email=f"overnight-{suffix}@test.com",
        password_hash=hash_password("TestPass123!"),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([shift, user])
    db.commit()
    user.shift_id = shift.id
    db.commit()
    db.refresh(user)
    db.refresh(shift)

    business_date = date(2026, 6, 25)
    start, end = get_shift_window_for_business_date(shift, business_date)
    session = AttendanceSession(
        user_id=user.id,
        check_in_at=start.astimezone(timezone.utc) + timedelta(minutes=10),
        work_mode=WorkMode.OFFICE,
        session_status=AttendanceSessionStatus.ACTIVE,
        is_late_login=False,
        expected_shift_start_at=start.astimezone(timezone.utc),
        expected_shift_end_at=end.astimezone(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"user": user, "shift": shift, "session": session, "business_date": business_date}


def test_open_session_after_midnight_is_present(db, overnight_context, monkeypatch):
    user = overnight_context["user"]
    after_midnight = datetime(2026, 6, 26, 0, 30, tzinfo=PK_TZ)

    monkeypatch.setattr(
        "app.services.shift_window_service.pk_now",
        lambda: after_midnight,
    )
    monkeypatch.setattr(
        "app.services.admin_user_management_service.pk_now",
        lambda: after_midnight,
    )

    _, statuses = roster_statuses_for_users(db, [user])
    assert statuses[user.id] == "Present"


def test_sessions_for_business_date_finds_overnight_check_in(db, overnight_context):
    user = overnight_context["user"]
    business_date = overnight_context["business_date"]
    sessions = sessions_for_business_date(db, business_date, [user])
    assert user.id in sessions


def test_before_shift_start_is_scheduled_not_absent(db, overnight_context, monkeypatch):
    user = overnight_context["user"]
    shift = overnight_context["shift"]
    before_start = datetime(2026, 6, 26, 16, 0, tzinfo=PK_TZ)
    status = resolve_today_attendance_status(
        session=None,
        leave=None,
        shift=shift,
        now_local=before_start,
    )
    assert status == "Scheduled"


def test_after_grace_without_check_in_is_absent(db, overnight_context, monkeypatch):
    user = overnight_context["user"]
    shift = overnight_context["shift"]
    db.delete(overnight_context["session"])
    db.commit()
    after_grace = datetime(2026, 6, 25, 17, 20, tzinfo=PK_TZ)
    status = resolve_today_attendance_status(
        session=None,
        leave=None,
        shift=shift,
        now_local=after_grace,
    )
    assert status == "Absent"


def test_session_business_date_uses_expected_shift_start(db, overnight_context):
    session = overnight_context["session"]
    shift = overnight_context["shift"]
    assert session_business_date(session, shift) == overnight_context["business_date"]
