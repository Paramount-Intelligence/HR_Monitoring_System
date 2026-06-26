"""Admin user management dashboard aggregation."""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.time_utils import PK_TIMEZONE_NAME, ensure_pk_datetime, pk_now, pk_today
from app.models.attendance_session import AttendanceSession
from app.models.department import Department
from app.models.enums import LeaveStatus, LeaveType, TaskStatus, TimeLogStatus, UserRole, UserStatus, WorkMode
from app.models.leave_request import LeaveRequest
from app.models.shift import Shift
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.shift_window_service import (
    current_shift_sessions_for_users,
    is_before_shift_start,
    is_past_absence_deadline,
    resolve_current_shift_business_date,
    sessions_for_business_date,
)

OPEN_TASK_STATUSES = (
    TaskStatus.CREATED,
    TaskStatus.APPROVED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.REOPENED,
)


def approved_leaves_for_date(db: Session, business_date: date) -> dict[uuid.UUID, LeaveRequest]:
    leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == LeaveStatus.APPROVED,
            LeaveRequest.start_date <= business_date,
            LeaveRequest.end_date >= business_date,
        )
        .all()
    )
    return {leave.user_id: leave for leave in leaves}


def resolve_today_attendance_status(
    *,
    session: AttendanceSession | None,
    leave: LeaveRequest | None,
    shift: Shift | None = None,
    now_local=None,
) -> str:
    is_wfh_leave = leave is not None and leave.leave_type == LeaveType.WFH
    is_on_leave = leave is not None and leave.leave_type != LeaveType.WFH

    if is_on_leave:
        return "On Leave"

    if session is not None:
        if session.work_mode == WorkMode.WFH or is_wfh_leave:
            return "WFH"
        if session.is_late_login:
            return "Late"
        if session.check_out_at is not None:
            return "Checked Out"
        return "Present"

    if is_wfh_leave:
        return "WFH"

    if shift is not None:
        now = now_local or pk_now()
        if is_before_shift_start(shift, now):
            return "Scheduled"
        if not is_past_absence_deadline(shift, now):
            return "Scheduled"

    return "Absent"


def is_present_status(status: str) -> bool:
    return status in {"Present", "Late", "Checked Out", "WFH", "Active Session"}


def task_counts_by_user(db: Session) -> dict[uuid.UUID, dict[str, int]]:
    rows = (
        db.query(
            Task.assigned_to,
            func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)).label("completed"),
            func.sum(case((Task.status.in_(OPEN_TASK_STATUSES), 1), else_=0)).label("active"),
        )
        .filter(Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .all()
    )
    return {
        uid: {"active": int(active or 0), "completed": int(completed or 0)}
        for uid, completed, active in rows
    }


def logged_hours_by_user(db: Session) -> dict[uuid.UUID, float]:
    rows = (
        db.query(
            TimeLog.user_id,
            func.coalesce(func.sum(TimeLog.duration_minutes), 0).label("minutes"),
        )
        .filter(TimeLog.status != TimeLogStatus.INVALID)
        .group_by(TimeLog.user_id)
        .all()
    )
    return {uid: round((minutes or 0) / 60.0, 1) for uid, minutes in rows}


def serialize_dt(dt) -> str | None:
    if dt is None:
        return None
    value = ensure_pk_datetime(dt)
    return value.isoformat() if value else None


def roster_statuses_for_users(
    db: Session,
    users: list[User],
    *,
    business_date: date | None = None,
    now_local=None,
) -> tuple[dict[uuid.UUID, AttendanceSession], dict[uuid.UUID, str]]:
    """Build shift-aware session map and attendance status per user."""
    if not users:
        return {}, {}

    now = now_local or pk_now()
    shift_ids = {user.shift_id for user in users if user.shift_id}
    shifts = (
        {shift.id: shift for shift in db.query(Shift).filter(Shift.id.in_(shift_ids)).all()}
        if shift_ids
        else {}
    )

    if business_date is None:
        session_by_user = current_shift_sessions_for_users(db, users, now)
    else:
        session_by_user = sessions_for_business_date(db, business_date, users)

    statuses: dict[uuid.UUID, str] = {}
    for user in users:
        shift = shifts.get(user.shift_id) if user.shift_id else None
        user_date = business_date if business_date is not None else resolve_current_shift_business_date(shift, now)
        leave = approved_leaves_for_date(db, user_date).get(user.id)
        statuses[user.id] = resolve_today_attendance_status(
            session=session_by_user.get(user.id),
            leave=leave,
            shift=shift,
            now_local=now if business_date is None else None,
        )

    return session_by_user, statuses
