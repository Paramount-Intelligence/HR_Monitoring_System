"""Live, shift-aware report metrics from source tables."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.time_utils import PK_TZ, ensure_pk_datetime, pk_day_end, pk_day_start, pk_now, pk_today
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    AttendanceSessionStatus,
    LeaveStatus,
    TaskStatus,
    TimeLogStatus,
    TimerSessionStatus,
    UserStatus,
    WorkMode,
)
from app.models.leave_request import LeaveRequest
from app.models.shift import Shift
from app.models.task import Task
from app.models.task_timer_session import TaskTimerSession
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.shift_service import ShiftService
from app.services.shift_window_service import (
    get_shift_window_for_business_date,
    is_past_absence_deadline,
    session_for_user_in_business_date,
    shift_window_to_utc,
)

COMPLETED_TASK_STATUSES = (TaskStatus.COMPLETED, TaskStatus.REVIEWED)


def get_user_report_window(user: User, report_date: date, db: Session) -> tuple[datetime, datetime]:
    """Return UTC bounds for a user's shift-aware business date window."""
    shift = db.get(Shift, user.shift_id) if user.shift_id else None
    if shift:
        local_start, local_end = get_shift_window_for_business_date(shift, report_date)
        return shift_window_to_utc(local_start, local_end)
    return pk_day_start(report_date).astimezone(timezone.utc), pk_day_end(report_date).astimezone(timezone.utc)


def overlap_seconds(
    segment_start: datetime,
    segment_end: datetime,
    window_start: datetime,
    window_end: datetime,
) -> int:
    start = ensure_pk_datetime(segment_start).astimezone(timezone.utc)
    end = ensure_pk_datetime(segment_end).astimezone(timezone.utc)
    w_start = ensure_pk_datetime(window_start).astimezone(timezone.utc)
    w_end = ensure_pk_datetime(window_end).astimezone(timezone.utc)
    overlap_start = max(start, w_start)
    overlap_end = min(end, w_end)
    if overlap_end <= overlap_start:
        return 0
    return int((overlap_end - overlap_start).total_seconds())


def iter_business_dates(start_date: date, end_date: date) -> Iterable[date]:
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _has_approved_leave(db: Session, user_id: uuid.UUID, business_date: date) -> bool:
    return (
        db.query(LeaveRequest.id)
        .filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.start_date <= business_date,
            LeaveRequest.end_date >= business_date,
            LeaveRequest.status == LeaveStatus.APPROVED,
        )
        .first()
        is not None
    )


def _timer_session_end(session: TaskTimerSession, now: datetime) -> datetime:
    if session.status == TimerSessionStatus.RUNNING:
        return now
    if session.status == TimerSessionStatus.PAUSED and session.paused_at:
        return ensure_pk_datetime(session.paused_at)
    if session.updated_at:
        return ensure_pk_datetime(session.updated_at)
    return now


def _timer_work_seconds(session: TaskTimerSession, now: datetime) -> int:
    if session.status == TimerSessionStatus.RUNNING:
        resumed = ensure_pk_datetime(session.last_resumed_at)
        return int(session.accumulated_seconds + max(0, (now - resumed).total_seconds()))
    return int(session.accumulated_seconds or 0)


def live_hours_in_window(
    db: Session,
    user_id: uuid.UUID,
    window_start: datetime,
    window_end: datetime,
    *,
    now: datetime | None = None,
) -> float:
    """Sum task timer / time-log overlap inside a UTC window."""
    now_utc = ensure_pk_datetime(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    effective_now = min(now_utc, ensure_pk_datetime(window_end).astimezone(timezone.utc))
    total_seconds = 0

    logs = (
        db.query(TimeLog)
        .filter(
            TimeLog.user_id == user_id,
            TimeLog.status == TimeLogStatus.COMPLETED,
            TimeLog.started_at < window_end,
            or_(TimeLog.ended_at.is_(None), TimeLog.ended_at > window_start),
        )
        .all()
    )
    for log in logs:
        end = log.ended_at or effective_now
        total_seconds += overlap_seconds(log.started_at, end, window_start, window_end)

    active_sessions = (
        db.query(TaskTimerSession)
        .filter(
            TaskTimerSession.user_id == user_id,
            TaskTimerSession.status.in_([TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED]),
            TaskTimerSession.started_at < window_end,
        )
        .all()
    )
    for session in active_sessions:
        seg_start = ensure_pk_datetime(session.started_at)
        seg_end = _timer_session_end(session, effective_now)
        overlap = overlap_seconds(seg_start, seg_end, window_start, window_end)
        if overlap <= 0:
            continue
        span = max(1, int((seg_end - seg_start).total_seconds()))
        work_seconds = _timer_work_seconds(session, effective_now)
        total_seconds += int(work_seconds * (overlap / span))

    return round(total_seconds / 3600, 2)


def live_attendance_for_business_date(
    db: Session,
    user: User,
    business_date: date,
    *,
    now: datetime | None = None,
) -> dict[str, float | int | bool]:
    """Compute attendance flags for one shift-aware business date."""
    shift = db.get(Shift, user.shift_id) if user.shift_id else None
    window_start, window_end = get_user_report_window(user, business_date, db)
    now_local = ensure_pk_datetime(now or pk_now())
    today = pk_today()
    on_leave = _has_approved_leave(db, user.id, business_date)

    session = session_for_user_in_business_date(db, user.id, shift, business_date)
    if session:
        is_late = bool(session.is_late_login)
        if not is_late and shift and session.check_in_at:
            is_late, _ = ShiftService.is_late(session.check_in_at, shift)
        is_early = bool(session.is_early_logout)
        if not is_early and shift and session.check_out_at and session.expected_shift_end_at:
            is_early, _ = ShiftService.is_early_logout(
                session.check_out_at,
                shift,
                session.expected_shift_end_at,
            )
        is_wfh = session.work_mode == WorkMode.WFH
        hours = live_hours_in_window(db, user.id, window_start, window_end, now=now_local)
        if hours == 0 and session.session_status == AttendanceSessionStatus.ACTIVE:
            checkout = session.check_out_at or now_local
            hours = round(
                overlap_seconds(session.check_in_at, checkout, window_start, window_end) / 3600,
                2,
            )
        elif hours == 0 and session.total_hours:
            hours = float(session.total_hours)
        return {
            "hours": hours,
            "late": 1 if is_late else 0,
            "early": 1 if is_early else 0,
            "wfh": 1 if is_wfh else 0,
            "absent": 0,
            "present": True,
        }

    if on_leave:
        return {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absent": 0, "present": False}

    if business_date > today:
        return {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absent": 0, "present": False}

    if business_date == today and shift and not is_past_absence_deadline(shift, now_local):
        return {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absent": 0, "present": False}

    if business_date == today and not shift:
        day_start = pk_day_start(business_date)
        if now_local < day_start + timedelta(hours=1):
            return {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absent": 0, "present": False}

    return {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absent": 1, "present": False}


def live_attendance_metrics(
    db: Session,
    user: User,
    start_date: date,
    end_date: date,
    *,
    now: datetime | None = None,
) -> dict[str, float | int]:
    totals = {"hours": 0.0, "late": 0, "early": 0, "wfh": 0, "absences": 0}
    for business_date in iter_business_dates(start_date, end_date):
        day = live_attendance_for_business_date(db, user, business_date, now=now)
        totals["hours"] += float(day["hours"])
        totals["late"] += int(day["late"])
        totals["early"] += int(day["early"])
        totals["wfh"] += int(day["wfh"])
        totals["absences"] += int(day["absent"])
    totals["hours"] = round(totals["hours"], 2)
    return totals


def live_hours_metrics(
    db: Session,
    user: User,
    start_date: date,
    end_date: date,
    *,
    now: datetime | None = None,
) -> float:
    """Canonical logged work hours from timers/time logs across shift-aware windows."""
    now_utc = ensure_pk_datetime(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    total = 0.0
    for business_date in iter_business_dates(start_date, end_date):
        window_start, window_end = get_user_report_window(user, business_date, db)
        total += live_hours_in_window(db, user.id, window_start, window_end, now=now_utc)
    return round(total, 2)


def live_completed_tasks_count(
    db: Session,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> int:
    range_start = pk_day_start(start_date).astimezone(timezone.utc)
    range_end = pk_day_end(end_date).astimezone(timezone.utc)
    return int(
        db.query(Task.id)
        .filter(
            Task.assigned_to == user_id,
            Task.status.in_(COMPLETED_TASK_STATUSES),
            Task.completed_at.isnot(None),
            Task.completed_at >= range_start,
            Task.completed_at < range_end,
        )
        .count()
    )


def live_tasks_worked_on_count(
    db: Session,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
    *,
    now: datetime | None = None,
) -> int:
    now_utc = ensure_pk_datetime(now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    task_ids: set[uuid.UUID] = set()
    range_start = pk_day_start(start_date).astimezone(timezone.utc)
    range_end = pk_day_end(end_date).astimezone(timezone.utc)

    logs = (
        db.query(TimeLog.task_id)
        .filter(
            TimeLog.user_id == user_id,
            TimeLog.started_at < range_end,
            or_(TimeLog.ended_at.is_(None), TimeLog.ended_at > range_start),
        )
        .distinct()
        .all()
    )
    task_ids.update(row[0] for row in logs)

    sessions = (
        db.query(TaskTimerSession.task_id)
        .filter(
            TaskTimerSession.user_id == user_id,
            TaskTimerSession.started_at < range_end,
        )
        .distinct()
        .all()
    )
    task_ids.update(row[0] for row in sessions)
    return len(task_ids)


def load_user_shift(db: Session, user: User) -> Shift | None:
    return db.get(Shift, user.shift_id) if user.shift_id else None


def live_user_metrics(
    db: Session,
    user: User,
    start_date: date,
    end_date: date,
    *,
    now: datetime | None = None,
) -> dict[str, float | int]:
    attendance = live_attendance_metrics(db, user, start_date, end_date, now=now)
    hours = live_hours_metrics(db, user, start_date, end_date, now=now)
    if hours > attendance["hours"]:
        attendance["hours"] = hours
    attendance["completed_tasks"] = live_completed_tasks_count(db, user.id, start_date, end_date)
    attendance["tasks_worked_on"] = live_tasks_worked_on_count(
        db,
        user.id,
        start_date,
        end_date,
        now=now,
    )
    return attendance
