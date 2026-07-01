"""Shift window helpers for attendance business-date resolution."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.time_utils import PK_TZ, ensure_pk_datetime, pk_now
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceSessionStatus
from app.models.shift import Shift
from app.models.user import User


def get_shift_tz(shift: Shift | None):
    if shift and shift.timezone:
        try:
            from zoneinfo import ZoneInfo

            return ZoneInfo(shift.timezone)
        except Exception:
            pass
    return PK_TZ


def is_overnight_shift(start_time: time, end_time: time) -> bool:
    return end_time <= start_time


def get_shift_window_for_business_date(
    shift: Shift,
    business_date: date,
) -> tuple[datetime, datetime]:
    """Return local shift start/end for a business date."""
    tz = get_shift_tz(shift)
    start = datetime.combine(business_date, shift.start_time).replace(tzinfo=tz)
    if is_overnight_shift(shift.start_time, shift.end_time):
        end = datetime.combine(business_date + timedelta(days=1), shift.end_time).replace(tzinfo=tz)
    else:
        end = datetime.combine(business_date, shift.end_time).replace(tzinfo=tz)
    return start, end


def shift_window_to_utc(window_start: datetime, window_end: datetime) -> tuple[datetime, datetime]:
    return window_start.astimezone(timezone.utc), window_end.astimezone(timezone.utc)


def get_eod_post_shift_grace_hours() -> int:
    from app.core.config import settings

    return max(0, int(settings.eod_post_shift_grace_hours))


def resolve_current_shift_business_date(
    shift: Shift | None,
    now_local: datetime | None = None,
    *,
    grace_hours: int | None = None,
) -> date:
    """Map current local time to the active shift business date."""
    now = now_local or pk_now()
    if shift is None:
        return ensure_pk_datetime(now).date()

    tz = get_shift_tz(shift)
    now = now.astimezone(tz) if now.tzinfo else now.replace(tzinfo=tz)
    grace = get_eod_post_shift_grace_hours() if grace_hours is None else max(0, grace_hours)
    today = now.date()

    if is_overnight_shift(shift.start_time, shift.end_time):
        for candidate in (today, today - timedelta(days=1)):
            start, end = get_shift_window_for_business_date(shift, candidate)
            if start <= now < end + timedelta(hours=grace):
                return candidate
        return today

    return today


def resolve_shift_business_date_for_timestamp(
    shift: Shift | None,
    timestamp: datetime,
    *,
    grace_hours: int | None = None,
) -> date:
    """Map a check-in/check-out timestamp to its shift business date."""
    if shift is None:
        return ensure_pk_datetime(timestamp).date()

    ts = ensure_pk_datetime(timestamp)
    tz = get_shift_tz(shift)
    ts_local = ts.astimezone(tz)
    grace = get_eod_post_shift_grace_hours() if grace_hours is None else max(0, grace_hours)

    if is_overnight_shift(shift.start_time, shift.end_time):
        today = ts_local.date()
        for candidate in (today, today - timedelta(days=1)):
            start, end = get_shift_window_for_business_date(shift, candidate)
            if start <= ts_local < end + timedelta(hours=grace):
                return candidate
        return today

    return ts_local.date()


def session_business_date(session: AttendanceSession, shift: Shift | None) -> date:
    if session.expected_shift_start_at:
        tz = get_shift_tz(shift)
        return ensure_pk_datetime(session.expected_shift_start_at).astimezone(tz).date()
    return resolve_shift_business_date_for_timestamp(shift, session.check_in_at)


def is_before_shift_start(shift: Shift, now_local: datetime | None = None) -> bool:
    now = now_local or pk_now()
    tz = get_shift_tz(shift)
    now = now.astimezone(tz) if now.tzinfo else now.replace(tzinfo=tz)
    business_date = resolve_current_shift_business_date(shift, now)
    start, _ = get_shift_window_for_business_date(shift, business_date)
    return now < start


def is_past_absence_deadline(shift: Shift, now_local: datetime | None = None) -> bool:
    now = now_local or pk_now()
    tz = get_shift_tz(shift)
    now = now.astimezone(tz) if now.tzinfo else now.replace(tzinfo=tz)
    business_date = resolve_current_shift_business_date(shift, now)
    start, _ = get_shift_window_for_business_date(shift, business_date)
    deadline = start + timedelta(minutes=shift.grace_period_minutes)
    return now >= deadline


def _load_shifts(db: Session, users: list[User]) -> dict[uuid.UUID, Shift]:
    shift_ids = {user.shift_id for user in users if user.shift_id}
    if not shift_ids:
        return {}
    shifts = db.query(Shift).filter(Shift.id.in_(shift_ids)).all()
    return {shift.id: shift for shift in shifts}


def _active_sessions_for_users(
    db: Session,
    user_ids: list[uuid.UUID],
) -> dict[uuid.UUID, AttendanceSession]:
    if not user_ids:
        return {}
    sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id.in_(user_ids),
            AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE,
        )
        .all()
    )
    return {session.user_id: session for session in sessions}


def session_for_user_in_business_date(
    db: Session,
    user_id: uuid.UUID,
    shift: Shift | None,
    business_date: date,
) -> AttendanceSession | None:
    if shift:
        window_start, window_end = get_shift_window_for_business_date(shift, business_date)
        start_utc, end_utc = shift_window_to_utc(window_start, window_end)
        return (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.user_id == user_id,
                AttendanceSession.check_in_at >= start_utc,
                AttendanceSession.check_in_at < end_utc,
            )
            .order_by(AttendanceSession.check_in_at.desc())
            .first()
        )

    from app.core.time_utils import pk_day_end, pk_day_start

    day_start = pk_day_start(business_date)
    day_end = pk_day_end(business_date)
    return (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id == user_id,
            AttendanceSession.check_in_at >= day_start,
            AttendanceSession.check_in_at < day_end,
        )
        .order_by(AttendanceSession.check_in_at.desc())
        .first()
    )


def sessions_for_business_date(
    db: Session,
    business_date: date,
    users: list[User] | None = None,
) -> dict[uuid.UUID, AttendanceSession]:
    """Return the latest attendance session per user for a shift business date."""
    if users is None:
        from app.models.enums import UserStatus

        users = db.query(User).filter(User.status == UserStatus.ACTIVE).all()

    if not users:
        return {}

    shifts = _load_shifts(db, users)
    user_ids = [user.id for user in users]
    active_by_user = _active_sessions_for_users(db, user_ids)
    latest_by_user: dict[uuid.UUID, AttendanceSession] = {}

    for user in users:
        shift = shifts.get(user.shift_id) if user.shift_id else None
        active = active_by_user.get(user.id)
        if active and session_business_date(active, shift) == business_date:
            latest_by_user[user.id] = active
            continue

        session = session_for_user_in_business_date(db, user.id, shift, business_date)
        if session:
            latest_by_user[user.id] = session

    return latest_by_user


def current_shift_sessions_for_users(
    db: Session,
    users: list[User],
    now_local: datetime | None = None,
) -> dict[uuid.UUID, AttendanceSession]:
    """Resolve each user's session for their current shift business date."""
    if not users:
        return {}

    now = now_local or pk_now()
    shifts = _load_shifts(db, users)
    active_by_user = _active_sessions_for_users(db, [user.id for user in users])
    result: dict[uuid.UUID, AttendanceSession] = {}

    for user in users:
        shift = shifts.get(user.shift_id) if user.shift_id else None
        business_date = resolve_current_shift_business_date(shift, now)
        active = active_by_user.get(user.id)
        if active and session_business_date(active, shift) == business_date:
            result[user.id] = active
            continue

        session = session_for_user_in_business_date(db, user.id, shift, business_date)
        if session:
            result[user.id] = session

    return result
