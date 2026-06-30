"""Daily-scoped EOD metric calculation from source records."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import ensure_pk_datetime, pk_day_start, pk_now
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    AttendanceSessionStatus,
    TaskStatus,
    TimeLogSourceType,
    TimeLogStatus,
    TimerSessionStatus,
)
from app.models.personal_note import PersonalNote
from app.models.shift import Shift
from app.models.task import Task
from app.models.task_timer_session import TaskTimerSession
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.report_metrics_service import (
    _timer_session_end,
    _timer_work_seconds,
    overlap_seconds,
)
from app.services.shift_window_service import (
    get_shift_window_for_business_date,
    resolve_current_shift_business_date,
    shift_window_to_utc,
)

PENDING_STATUSES = frozenset(
    {
        TaskStatus.CREATED,
        TaskStatus.APPROVED,
        TaskStatus.IN_PROGRESS,
        TaskStatus.REOPENED,
    }
)

DELETED_TASK_TITLE = "Deleted or unavailable task"


@dataclass
class EodAttendanceMetrics:
    check_in_at: datetime | None
    check_out_at: datetime | None
    work_mode: str | None
    total_hours: float
    status: str


@dataclass
class EodTaskMetrics:
    tasks_worked_on: int
    completed: int
    pending: int
    blocked: int
    key_actions: int


@dataclass
class EodTimeLogEntry:
    id: uuid.UUID
    start_time: datetime
    end_time: datetime | None
    duration_seconds: int
    source: str
    note: str | None
    is_active: bool


@dataclass
class EodTaskBreakdownItem:
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID | None
    project_name: str | None
    status: str
    priority: str | None
    completed_at: datetime | None
    completed_by_name: str | None
    total_logged_seconds: int
    total_logged_hours: float
    sessions_count: int
    time_logs: list[EodTimeLogEntry] = field(default_factory=list)


@dataclass
class EodDailyMetrics:
    report_date: date
    window_start: datetime
    window_end: datetime
    attendance: EodAttendanceMetrics
    task_metrics: EodTaskMetrics
    logged_hours: float
    productivity_score: int
    task_breakdown: list[EodTaskBreakdownItem] = field(default_factory=list)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_eod_window_for_user(db: Session, user: User, report_date: date) -> tuple[datetime, datetime]:
    shift = db.get(Shift, user.shift_id) if user.shift_id else None
    if shift:
        window_start, window_end = get_shift_window_for_business_date(shift, report_date)
        return shift_window_to_utc(window_start, window_end)
    start_dt = pk_day_start(report_date)
    end_dt = start_dt + timedelta(days=1)
    return _as_utc(start_dt), _as_utc(end_dt)


def _effective_window_end(
    db: Session,
    user: User,
    report_date: date,
    window_end: datetime,
) -> datetime:
    now = _utc_now()
    shift = db.get(Shift, user.shift_id) if user.shift_id else None
    current_business_date = resolve_current_shift_business_date(shift, pk_now())
    if report_date == current_business_date:
        from app.services.shift_window_service import get_eod_post_shift_grace_hours

        grace = timedelta(hours=get_eod_post_shift_grace_hours())
        return min(now, window_end + grace)
    return window_end


def _overlap_minutes(
    start: datetime,
    end: datetime | None,
    window_start: datetime,
    window_end: datetime,
) -> int:
    effective_end = min(end or window_end, window_end)
    effective_start = max(_as_utc(start), window_start)
    if effective_end <= effective_start:
        return 0
    return max(0, int((effective_end - effective_start).total_seconds() // 60))


def _user_task_scope_filter(user_id: uuid.UUID):
    return or_(Task.assigned_to == user_id, Task.created_by == user_id)


def _task_completed_in_window(task: Task, window_start: datetime, window_end: datetime) -> bool:
    if task.status != TaskStatus.COMPLETED:
        return False
    completed_at = task.completed_at or task.updated_at
    if not completed_at:
        return False
    return window_start <= _as_utc(completed_at) < window_end


def _build_task_breakdown(
    db: Session,
    user: User,
    user_tasks: list[Task],
    time_logs: list[TimeLog],
    timer_sessions: list[TaskTimerSession],
    window_start: datetime,
    effective_end: datetime,
    worked_task_ids: set[uuid.UUID],
) -> list[EodTaskBreakdownItem]:
    task_by_id: dict[uuid.UUID, Task] = {task.id: task for task in user_tasks}
    entries_by_task: dict[uuid.UUID, list[EodTimeLogEntry]] = {tid: [] for tid in worked_task_ids}

    for log in time_logs:
        log_end = log.ended_at
        is_active = log.status == TimeLogStatus.ACTIVE and log_end is None
        if is_active:
            log_end = effective_end
        seconds = overlap_seconds(log.started_at, log_end or effective_end, window_start, effective_end)
        if seconds <= 0:
            continue
        source = "timer" if log.source_type == TimeLogSourceType.TIMER else "manual"
        entries_by_task.setdefault(log.task_id, []).append(
            EodTimeLogEntry(
                id=log.id,
                start_time=_as_utc(log.started_at),
                end_time=_as_utc(log_end) if log_end else None,
                duration_seconds=seconds,
                source=source,
                note=log.notes,
                is_active=is_active,
            )
        )
        if log.task_id not in task_by_id:
            extra = db.get(Task, log.task_id)
            if extra:
                task_by_id[log.task_id] = extra

    for session in timer_sessions:
        seg_start = ensure_pk_datetime(session.started_at)
        seg_end = _timer_session_end(session, effective_end)
        seconds = overlap_seconds(seg_start, seg_end, window_start, effective_end)
        if seconds <= 0:
            continue
        span = max(1, int((seg_end - seg_start).total_seconds()))
        work_seconds = _timer_work_seconds(session, effective_end)
        overlap_work = int(work_seconds * (seconds / span))
        if overlap_work <= 0:
            continue
        is_active = session.status == TimerSessionStatus.RUNNING
        entries_by_task.setdefault(session.task_id, []).append(
            EodTimeLogEntry(
                id=session.id,
                start_time=seg_start,
                end_time=seg_end if not is_active else None,
                duration_seconds=overlap_work,
                source="timer",
                note=None,
                is_active=is_active,
            )
        )
        if session.task_id not in task_by_id:
            extra = db.get(Task, session.task_id)
            if extra:
                task_by_id[session.task_id] = extra

    breakdown: list[EodTaskBreakdownItem] = []
    for task_id in worked_task_ids:
        task = task_by_id.get(task_id)
        task_entries = entries_by_task.get(task_id, [])
        total_seconds = sum(entry.duration_seconds for entry in task_entries)
        task_entries.sort(key=lambda e: e.start_time)

        if task:
            project = task.project
            priority = task.priority.value if task.priority is not None else None
            title = task.title or DELETED_TASK_TITLE
            status = task.status.value if hasattr(task.status, "value") else str(task.status)
            project_id = task.project_id
            project_name = project.title if project else None
            completed_at = task.completed_at
            completed_by_name = task.completed_by_name
        else:
            title = DELETED_TASK_TITLE
            status = "unknown"
            priority = None
            project_id = None
            project_name = None
            completed_at = None
            completed_by_name = None

        breakdown.append(
            EodTaskBreakdownItem(
                task_id=task_id,
                task_title=title,
                project_id=project_id,
                project_name=project_name,
                status=status,
                priority=priority,
                completed_at=completed_at,
                completed_by_name=completed_by_name,
                total_logged_seconds=total_seconds,
                total_logged_hours=round(total_seconds / 3600, 2),
                sessions_count=len(task_entries),
                time_logs=task_entries,
            )
        )

    breakdown.sort(key=lambda item: (-item.total_logged_seconds, item.task_title))
    return breakdown


def calculate_eod_metrics_for_user(
    db: Session,
    user_id: uuid.UUID,
    report_date: date,
) -> EodDailyMetrics:
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    window_start, window_end = get_eod_window_for_user(db, user, report_date)
    effective_end = _effective_window_end(db, user, report_date, window_end)

    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id == user.id,
            AttendanceSession.check_in_at >= window_start,
            AttendanceSession.check_in_at < window_end,
        )
        .order_by(AttendanceSession.check_in_at.desc())
        .first()
    )

    time_logs = (
        db.query(TimeLog)
        .filter(
            TimeLog.user_id == user.id,
            TimeLog.status != TimeLogStatus.INVALID,
            TimeLog.started_at < window_end,
            or_(TimeLog.ended_at.is_(None), TimeLog.ended_at > window_start),
        )
        .all()
    )

    timer_sessions = (
        db.query(TaskTimerSession)
        .filter(
            TaskTimerSession.user_id == user.id,
            TaskTimerSession.status.in_([TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED]),
            TaskTimerSession.started_at < window_end,
        )
        .all()
    )

    user_tasks = (
        db.query(Task)
        .options(joinedload(Task.project))
        .filter(_user_task_scope_filter(user.id))
        .all()
    )
    task_by_id = {task.id: task for task in user_tasks}

    worked_task_ids: set[uuid.UUID] = set()
    logged_seconds = 0

    for log in time_logs:
        log_end = log.ended_at
        if log.status == TimeLogStatus.ACTIVE and log_end is None:
            log_end = effective_end
        seconds = overlap_seconds(log.started_at, log_end or effective_end, window_start, effective_end)
        if seconds > 0:
            worked_task_ids.add(log.task_id)
            logged_seconds += seconds

    for session_row in timer_sessions:
        seg_start = ensure_pk_datetime(session_row.started_at)
        seg_end = _timer_session_end(session_row, effective_end)
        seconds = overlap_seconds(seg_start, seg_end, window_start, effective_end)
        if seconds <= 0:
            continue
        span = max(1, int((seg_end - seg_start).total_seconds()))
        work_seconds = _timer_work_seconds(session_row, effective_end)
        overlap_work = int(work_seconds * (seconds / span))
        if overlap_work > 0:
            worked_task_ids.add(session_row.task_id)
            logged_seconds += overlap_work

    session_minutes = 0
    if session:
        session_end = session.check_out_at or effective_end
        session_minutes = _overlap_minutes(
            session.check_in_at,
            session_end,
            window_start,
            effective_end,
        )

    completed_task_ids: set[uuid.UUID] = set()
    for task in user_tasks:
        if _task_completed_in_window(task, window_start, window_end):
            completed_task_ids.add(task.id)
            worked_task_ids.add(task.id)

    for task in user_tasks:
        created_at = task.created_at
        if created_at and window_start <= _as_utc(created_at) < window_end:
            worked_task_ids.add(task.id)

    for task in user_tasks:
        if task.status != TaskStatus.BLOCKED:
            continue
        updated_at = task.updated_at
        if updated_at and window_start <= _as_utc(updated_at) < window_end:
            worked_task_ids.add(task.id)

    for task in user_tasks:
        if task.id in worked_task_ids:
            continue
        updated_at = task.updated_at
        if not updated_at:
            continue
        if window_start <= _as_utc(updated_at) < window_end and task.status in PENDING_STATUSES:
            has_log = any(log.task_id == task.id for log in time_logs)
            has_timer = any(s.task_id == task.id for s in timer_sessions)
            if has_log or has_timer:
                worked_task_ids.add(task.id)

    pending_count = sum(
        1
        for task_id in worked_task_ids
        if (task := task_by_id.get(task_id)) and task.status in PENDING_STATUSES
    )
    blocked_count = sum(
        1
        for task_id in worked_task_ids
        if (task := task_by_id.get(task_id)) and task.status == TaskStatus.BLOCKED
    )

    duties = (
        db.query(PersonalNote)
        .filter(PersonalNote.user_id == user.id, PersonalNote.note_date == report_date)
        .all()
    )
    key_actions = sum(1 for duty in duties if (duty.content or "").startswith("[done]"))

    logged_hours = round(logged_seconds / 3600, 2)
    attendance_total_hours = round(session_minutes / 60, 2) if session else 0.0

    productivity_score = max(
        0,
        min(
            100,
            len(completed_task_ids) * 15
            + key_actions * 10
            + int(logged_hours * 5)
            - blocked_count * 10,
        ),
    )

    if session and session.session_status == AttendanceSessionStatus.ACTIVE and not session.check_out_at:
        attendance_status = "Active Session"
    elif session and session.check_out_at:
        attendance_status = "Checked Out"
    elif session:
        attendance_status = "Present"
    else:
        attendance_status = "No Check-in"

    work_mode = session.work_mode.value if session else None

    task_breakdown = _build_task_breakdown(
        db,
        user,
        user_tasks,
        time_logs,
        timer_sessions,
        window_start,
        effective_end,
        worked_task_ids,
    )

    return EodDailyMetrics(
        report_date=report_date,
        window_start=window_start,
        window_end=window_end,
        attendance=EodAttendanceMetrics(
            check_in_at=session.check_in_at if session else None,
            check_out_at=session.check_out_at if session else None,
            work_mode=work_mode,
            total_hours=attendance_total_hours,
            status=attendance_status,
        ),
        task_metrics=EodTaskMetrics(
            tasks_worked_on=len(worked_task_ids),
            completed=len(completed_task_ids),
            pending=pending_count,
            blocked=blocked_count,
            key_actions=key_actions,
        ),
        logged_hours=logged_hours,
        productivity_score=productivity_score,
        task_breakdown=task_breakdown,
    )


def apply_daily_metrics_to_report(report, metrics: EodDailyMetrics) -> None:
    report.login_time = metrics.attendance.check_in_at
    report.logout_time = metrics.attendance.check_out_at
    report.work_mode = metrics.attendance.work_mode or "office"
    report.total_hours = metrics.logged_hours
    report.tasks_worked_on = metrics.task_metrics.tasks_worked_on
    report.completed_tasks = metrics.task_metrics.completed
    report.pending_tasks = metrics.task_metrics.pending
    report.blocked_tasks = metrics.task_metrics.blocked
    report.duties_performed = metrics.task_metrics.key_actions
    report.productivity_score = metrics.productivity_score
    if metrics.attendance.work_mode:
        report.highlights_summary = metrics.attendance.work_mode
