from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.time_utils import ensure_pk_datetime, pk_day_start, pk_today
from app.models.attendance_session import AttendanceSession
from app.models.eod_report import EODReport
from app.models.enums import TaskStatus, TimeLogStatus
from app.models.personal_note import PersonalNote
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User

SUBMITTABLE_STATUSES = frozenset({"Generated", "Needs Revision", "Draft"})
WORK_SUMMARY_MIN = 10
WORK_SUMMARY_MAX = 5000
TEXT_FIELD_MAX = 5000


def resolve_report_date(report_date: date | None) -> date:
    return report_date or pk_today()


def get_user_eod_report(db: Session, user_id: uuid.UUID, report_date: date) -> EODReport | None:
    return (
        db.query(EODReport)
        .filter(EODReport.user_id == user_id, EODReport.report_date == report_date)
        .first()
    )


def _read_work_mode(report: EODReport) -> str:
    if report.work_mode in {"office", "wfh"}:
        return report.work_mode
    legacy = report.highlights_summary or ""
    if legacy in {"office", "wfh"}:
        return legacy
    return "office"


def populate_eod_metrics(db: Session, report: EODReport, actor: User) -> None:
    today = report.report_date
    start_dt = pk_day_start(today)
    end_dt = start_dt + timedelta(days=1)

    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id == actor.id,
            AttendanceSession.check_in_at >= start_dt,
            AttendanceSession.check_in_at < end_dt,
        )
        .order_by(AttendanceSession.check_in_at.desc())
        .first()
    )
    tasks = db.query(Task).filter(Task.assigned_to == actor.id).all()
    duties = (
        db.query(PersonalNote)
        .filter(PersonalNote.user_id == actor.id, PersonalNote.note_date == today)
        .all()
    )
    time_logs = (
        db.query(TimeLog)
        .filter(
            TimeLog.user_id == actor.id,
            TimeLog.started_at >= start_dt,
            TimeLog.started_at < end_dt,
        )
        .all()
    )

    completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    pending_tasks = sum(
        1
        for t in tasks
        if t.status
        in (TaskStatus.CREATED, TaskStatus.APPROVED, TaskStatus.IN_PROGRESS, TaskStatus.REOPENED)
    )
    blocked_tasks = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)
    tasks_worked_on = len({log.task_id for log in time_logs}) if time_logs else len(tasks)
    total_minutes = sum(log.duration_minutes or 0 for log in time_logs if log.status != TimeLogStatus.INVALID)
    total_hours = round(total_minutes / 60, 2) if total_minutes else 0.0
    if total_hours == 0.0 and session and session.check_out_at:
        total_hours = round(
            (
                ensure_pk_datetime(session.check_out_at) - ensure_pk_datetime(session.check_in_at)
            ).total_seconds()
            / 3600,
            2,
        )
    duties_performed = sum(1 for d in duties if (d.content or "").startswith("[done]"))
    productivity_score = max(
        0,
        min(100, completed_tasks * 15 + duties_performed * 10 + int(total_hours * 5) - blocked_tasks * 10),
    )
    work_mode = session.work_mode.value if session else _read_work_mode(report)

    report.login_time = session.check_in_at if session else report.login_time
    report.logout_time = session.check_out_at if session else report.logout_time
    report.total_hours = total_hours
    report.tasks_worked_on = tasks_worked_on
    report.completed_tasks = completed_tasks
    report.pending_tasks = pending_tasks
    report.blocked_tasks = blocked_tasks
    report.duties_performed = duties_performed
    report.productivity_score = productivity_score
    report.work_mode = work_mode
    report.highlights_summary = work_mode
    if report.status in (None, "", "Draft"):
        report.status = "Generated"


def generate_or_refresh_eod(db: Session, actor: User, report_date: date | None = None) -> EODReport:
    target_date = resolve_report_date(report_date)
    report = get_user_eod_report(db, actor.id, target_date)
    saved_summary = None
    saved_blockers = None
    saved_plan = None
    saved_submitted_at = None

    if not report:
        report = EODReport(user_id=actor.id, report_date=target_date, status="Generated")
        db.add(report)
    else:
        saved_summary = report.work_summary
        saved_blockers = report.blockers
        saved_plan = report.next_day_plan
        saved_submitted_at = report.submitted_at

    populate_eod_metrics(db, report, actor)
    report.status = "Generated"
    if saved_summary is not None:
        report.work_summary = saved_summary
        report.blockers = saved_blockers
        report.next_day_plan = saved_plan
        report.submitted_at = saved_submitted_at

    db.commit()
    db.refresh(report)
    return report


def validate_work_summary(work_summary: str) -> str:
    normalized = (work_summary or "").strip()
    if len(normalized) < WORK_SUMMARY_MIN:
        raise ValueError(f"Work summary must be at least {WORK_SUMMARY_MIN} characters.")
    if len(normalized) > WORK_SUMMARY_MAX:
        raise ValueError(f"Work summary must be at most {WORK_SUMMARY_MAX} characters.")
    return normalized


def validate_optional_text(value: str | None, field_name: str) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if len(normalized) > TEXT_FIELD_MAX:
        raise ValueError(f"{field_name} must be at most {TEXT_FIELD_MAX} characters.")
    return normalized


def submit_user_eod(
    db: Session,
    actor: User,
    *,
    report_date: date | None,
    work_summary: str,
    blockers: str | None = None,
    next_day_plan: str | None = None,
) -> EODReport:
    target_date = resolve_report_date(report_date)
    summary = validate_work_summary(work_summary)
    blockers_text = validate_optional_text(blockers, "Blockers")
    plan_text = validate_optional_text(next_day_plan, "Next day plan")

    report = get_user_eod_report(db, actor.id, target_date)
    if not report:
        report = EODReport(user_id=actor.id, report_date=target_date)
        db.add(report)
        db.flush()
        populate_eod_metrics(db, report, actor)

    if report.status not in SUBMITTABLE_STATUSES:
        raise ValueError(f"EOD cannot be submitted while status is '{report.status}'.")

    report.work_summary = summary
    report.blockers = blockers_text
    report.next_day_plan = plan_text
    report.status = "Pending Approval"
    report.submitted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)
    _notify_reporting_manager_on_submit(db, actor, report)
    db.commit()
    return report


def _notify_reporting_manager_on_submit(db: Session, actor: User, report: EODReport) -> None:
    if not actor.manager_id:
        return
    manager = db.get(User, actor.manager_id)
    if not manager:
        return
    from app.models.enums import NotificationType
    from app.services.notification_service import create_notification

    create_notification(
        db,
        recipient_id=manager.id,
        notification_type=NotificationType.SYSTEM,
        title="EOD submitted",
        body=f"{actor.full_name} submitted EOD for {report.report_date.isoformat()}.",
        related_entity_type="eod_report",
        related_entity_id=report.id,
        actor_id=actor.id,
        skip_if_disabled=True,
    )


def notify_submitter_on_eod_review(
    db: Session,
    *,
    report: EODReport,
    reviewer: User,
    action: str,
) -> None:
    submitter = db.get(User, report.user_id)
    if not submitter:
        return
    from app.models.enums import NotificationType
    from app.services.notification_service import create_notification

    date_label = report.report_date.isoformat()
    if action == "Approved":
        body = f"Your EOD for {date_label} was approved."
    elif action == "Needs Revision":
        body = f"Revision requested for your EOD for {date_label}."
    elif action == "Rejected":
        body = f"Your EOD for {date_label} was rejected."
    else:
        return

    create_notification(
        db,
        recipient_id=submitter.id,
        notification_type=NotificationType.EOD_FEEDBACK,
        title="EOD review update",
        body=body,
        related_entity_type="eod_report",
        related_entity_id=report.id,
        actor_id=reviewer.id,
        skip_if_disabled=True,
    )
