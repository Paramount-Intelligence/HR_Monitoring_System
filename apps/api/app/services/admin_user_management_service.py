"""Admin user management dashboard aggregation."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import PK_TIMEZONE_NAME, ensure_pk_datetime, pk_day_end, pk_day_start, pk_today
from app.models.attendance_session import AttendanceSession
from app.models.department import Department
from app.models.enums import LeaveStatus, LeaveType, TaskStatus, TimeLogStatus, UserRole, UserStatus, WorkMode
from app.models.leave_request import LeaveRequest
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User

OPEN_TASK_STATUSES = (
    TaskStatus.CREATED,
    TaskStatus.APPROVED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.REOPENED,
)


def sessions_for_business_date(db: Session, business_date: date) -> dict[uuid.UUID, AttendanceSession]:
    day_start = pk_day_start(business_date)
    day_end = pk_day_end(business_date)
    sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.check_in_at >= day_start,
            AttendanceSession.check_in_at < day_end,
        )
        .all()
    )
    latest_by_user: dict[uuid.UUID, AttendanceSession] = {}
    for session in sessions:
        existing = latest_by_user.get(session.user_id)
        if not existing or session.check_in_at > existing.check_in_at:
            latest_by_user[session.user_id] = session
    return latest_by_user


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

    return "Absent"


def is_present_status(status: str) -> bool:
    return status in {"Present", "Late", "Checked Out", "WFH"}


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
