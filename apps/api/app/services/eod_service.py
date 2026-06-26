from __future__ import annotations



import uuid

from datetime import date, datetime, timezone



from sqlalchemy.orm import Session



from app.core.time_utils import pk_today

from app.models.eod_report import EODReport

from app.models.shift import Shift

from app.models.user import User

from app.services.eod_metrics_service import (
    EodDailyMetrics,
    apply_daily_metrics_to_report,
    calculate_eod_metrics_for_user,
)

from app.services.shift_window_service import resolve_current_shift_business_date



SUBMITTABLE_STATUSES = frozenset({"Generated", "Needs Revision", "Draft"})

WORK_SUMMARY_MIN = 10

WORK_SUMMARY_MAX = 5000

TEXT_FIELD_MAX = 5000





def resolve_report_date(report_date: date | None, actor: User | None = None, db: Session | None = None) -> date:

    if report_date:

        return report_date

    if actor and actor.shift_id and db is not None:

        shift = db.get(Shift, actor.shift_id)

        if shift:

            return resolve_current_shift_business_date(shift)

    return pk_today()





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





def refresh_report_metrics(db: Session, report: EODReport, actor: User) -> EodDailyMetrics:

    metrics = calculate_eod_metrics_for_user(db, actor.id, report.report_date)

    apply_daily_metrics_to_report(report, metrics)

    return metrics





def format_eod_report_read(report: EODReport, user_name: str, metrics=None) -> "EODReportRead":

    from app.core.time_utils import ensure_pk_datetime

    from app.schemas.ops import EODReportRead



    attendance_status = None

    window_start = None

    window_end = None

    logged_hours = float(report.total_hours)

    if metrics is not None:

        attendance_status = metrics.attendance.status

        window_start = metrics.window_start

        window_end = metrics.window_end

        logged_hours = metrics.logged_hours



    return EODReportRead(

        id=report.id,

        user_id=report.user_id,

        user_name=user_name,

        date=report.report_date,

        login_time=ensure_pk_datetime(report.login_time),

        logout_time=ensure_pk_datetime(report.logout_time),

        work_mode=_read_work_mode(report),

        total_hours=float(report.total_hours),

        logged_hours=logged_hours,

        tasks_worked_on=report.tasks_worked_on,

        completed_tasks=report.completed_tasks,

        pending_tasks=report.pending_tasks,

        blocked_tasks=report.blocked_tasks,

        duties_performed=report.duties_performed,

        status=report.status,

        manager_comments=report.manager_comments,

        productivity_score=report.productivity_score,

        work_summary=report.work_summary,

        blockers=report.blockers,

        next_day_plan=report.next_day_plan,

        submitted_at=ensure_pk_datetime(report.submitted_at) if report.submitted_at else None,

        created_at=ensure_pk_datetime(report.created_at),

        updated_at=ensure_pk_datetime(report.updated_at),

        attendance_status=attendance_status,

        window_start=ensure_pk_datetime(window_start) if window_start else None,

        window_end=ensure_pk_datetime(window_end) if window_end else None,

    )





def populate_eod_metrics(db: Session, report: EODReport, actor: User) -> None:

    metrics = calculate_eod_metrics_for_user(db, actor.id, report.report_date)

    apply_daily_metrics_to_report(report, metrics)

    if report.status in (None, "", "Draft"):

        report.status = "Generated"





def generate_or_refresh_eod(db: Session, actor: User, report_date: date | None = None) -> EODReport:

    target_date = resolve_report_date(report_date, actor, db)

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

    target_date = resolve_report_date(report_date, actor, db)

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

