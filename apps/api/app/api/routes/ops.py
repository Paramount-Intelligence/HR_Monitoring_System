from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin_or_manager
from app.core.time_utils import ensure_pk_datetime, pk_today
from app.models.attendance_session import AttendanceSession
from app.models.eod_report import EODReport
from app.models.eod_revision import EODRevision
from app.models.enums import TaskStatus, TimeLogStatus, UserRole
from app.models.personal_note import PersonalNote
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.ops import DutyCreate, DutyRead, DutyUpdate, EODReportRead, EODReviewRequest

router = APIRouter()


def _format_eod(report: EODReport, user_name: str) -> EODReportRead:
    session_work_mode = report.highlights_summary or "office"
    return EODReportRead(
        id=report.id,
        user_id=report.user_id,
        user_name=user_name,
        date=report.report_date,
        login_time=ensure_pk_datetime(report.login_time),
        logout_time=ensure_pk_datetime(report.logout_time),
        work_mode=session_work_mode,
        total_hours=float(report.total_hours),
        tasks_worked_on=report.tasks_worked_on,
        completed_tasks=report.completed_tasks,
        pending_tasks=report.pending_tasks,
        blocked_tasks=report.blocked_tasks,
        duties_performed=report.duties_performed,
        status=report.status,
        manager_comments=report.manager_comments,
        productivity_score=report.productivity_score,
        created_at=ensure_pk_datetime(report.created_at),
        updated_at=ensure_pk_datetime(report.updated_at),
    )


@router.get("/duties", response_model=list[DutyRead], summary="Get my duties")
def get_my_duties(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[DutyRead]:
    today = pk_today()
    notes = (
        db.query(PersonalNote)
        .filter(PersonalNote.user_id == actor.id, PersonalNote.note_date == today)
        .order_by(PersonalNote.created_at.desc())
        .all()
    )
    duties: list[DutyRead] = []
    for note in notes:
        content = note.content or ""
        parts = content.split("\n", 1)
        title = parts[0].strip() or "Duty"
        description = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
        status_value = "completed" if content.startswith("[done]") else "pending"
        if title.startswith("[done]"):
            title = title.removeprefix("[done]").strip() or "Duty"
        duties.append(
            DutyRead(
                id=note.id,
                user_id=note.user_id,
                title=title,
                description=description,
                status=status_value,
                created_at=ensure_pk_datetime(note.created_at),
                updated_at=ensure_pk_datetime(note.updated_at),
            )
        )
    return duties


@router.post("/duties", response_model=DutyRead, status_code=status.HTTP_201_CREATED, summary="Create a duty")
def create_duty(payload: DutyCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> DutyRead:
    note = PersonalNote(
        user_id=actor.id,
        note_date=pk_today(),
        content=payload.title if not payload.description else f"{payload.title}\n{payload.description}",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return DutyRead(
        id=note.id,
        user_id=note.user_id,
        title=payload.title,
        description=payload.description,
        status="pending",
        created_at=ensure_pk_datetime(note.created_at),
        updated_at=ensure_pk_datetime(note.updated_at),
    )


@router.patch("/duties/{duty_id}", response_model=DutyRead, summary="Update a duty")
def update_duty(duty_id: uuid.UUID, payload: DutyUpdate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> DutyRead:
    note = db.get(PersonalNote, duty_id)
    if not note or note.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    content = note.content or ""
    parts = content.split("\n", 1)
    current_title = parts[0].removeprefix("[done]").strip() or "Duty"
    current_description = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None

    title = payload.title if payload.title is not None else current_title
    description = payload.description if payload.description is not None else current_description
    status_value = payload.status or ("completed" if content.startswith("[done]") else "pending")

    prefix = "[done] " if status_value == "completed" else ""
    note.content = f"{prefix}{title}" if not description else f"{prefix}{title}\n{description}"
    db.commit()
    db.refresh(note)

    return DutyRead(
        id=note.id,
        user_id=note.user_id,
        title=title,
        description=description,
        status=status_value,
        created_at=ensure_pk_datetime(note.created_at),
        updated_at=ensure_pk_datetime(note.updated_at),
    )


@router.delete("/duties/{duty_id}", summary="Delete a duty")
def delete_duty(duty_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> dict[str, bool]:
    note = db.get(PersonalNote, duty_id)
    if not note or note.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")
    db.delete(note)
    db.commit()
    return {"success": True}


@router.get("/eod/me", response_model=EODReportRead | None, summary="Get my EOD")
def get_my_eod(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> EODReportRead | None:
    today = pk_today()
    report = (
        db.query(EODReport)
        .filter(EODReport.user_id == actor.id, EODReport.report_date == today)
        .order_by(EODReport.created_at.desc())
        .first()
    )
    if not report:
        return None
    return _format_eod(report, actor.full_name)


@router.post("/eod/me/generate", response_model=EODReportRead, summary="Generate my EOD")
def generate_my_eod(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> EODReportRead:
    today = pk_today()
    report = (
        db.query(EODReport)
        .filter(EODReport.user_id == actor.id, EODReport.report_date == today)
        .order_by(EODReport.created_at.desc())
        .first()
    )

    from app.core.time_utils import pk_day_start
    from datetime import timedelta
    start_dt = pk_day_start(today)
    end_dt = start_dt + timedelta(days=1)

    session = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.user_id == actor.id, AttendanceSession.check_in_at >= start_dt, AttendanceSession.check_in_at < end_dt)
        .order_by(AttendanceSession.check_in_at.desc())
        .first()
    )
    tasks = db.query(Task).filter(Task.assigned_to == actor.id).all()
    duties = db.query(PersonalNote).filter(PersonalNote.user_id == actor.id, PersonalNote.note_date == today).all()
    time_logs = db.query(TimeLog).filter(TimeLog.user_id == actor.id, TimeLog.started_at >= start_dt, TimeLog.started_at < end_dt).all()

    completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    pending_tasks = sum(1 for t in tasks if t.status in (TaskStatus.CREATED, TaskStatus.APPROVED, TaskStatus.IN_PROGRESS, TaskStatus.REOPENED))
    blocked_tasks = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)
    tasks_worked_on = len({log.task_id for log in time_logs}) if time_logs else len(tasks)
    total_minutes = sum(log.duration_minutes or 0 for log in time_logs if log.status != TimeLogStatus.INVALID)
    total_hours = round(total_minutes / 60, 2) if total_minutes else 0.0
    if total_hours == 0.0 and session and session.check_out_at:
        total_hours = round((ensure_pk_datetime(session.check_out_at) - ensure_pk_datetime(session.check_in_at)).total_seconds() / 3600, 2)
    duties_performed = sum(1 for d in duties if (d.content or "").startswith("[done]"))
    productivity_score = max(0, min(100, completed_tasks * 15 + duties_performed * 10 + int(total_hours * 5) - blocked_tasks * 10))
    work_mode = session.work_mode.value if session else "office"

    if not report:
        report = EODReport(user_id=actor.id, report_date=today)
        db.add(report)

    report.login_time = session.check_in_at if session else None
    report.logout_time = session.check_out_at if session else None
    report.total_hours = total_hours
    report.tasks_worked_on = tasks_worked_on
    report.completed_tasks = completed_tasks
    report.pending_tasks = pending_tasks
    report.blocked_tasks = blocked_tasks
    report.duties_performed = duties_performed
    report.productivity_score = productivity_score
    report.status = "Generated"
    report.highlights_summary = work_mode

    db.commit()
    db.refresh(report)
    return _format_eod(report, actor.full_name)


@router.post("/eod/me/submit", response_model=EODReportRead, summary="Submit my EOD")
def submit_my_eod(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> EODReportRead:
    today = pk_today()
    report = (
        db.query(EODReport)
        .filter(EODReport.user_id == actor.id, EODReport.report_date == today)
        .order_by(EODReport.created_at.desc())
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generate EOD first")
    report.status = "Pending Approval"
    db.commit()
    db.refresh(report)
    return _format_eod(report, actor.full_name)


@router.get("/eod/team", response_model=list[EODReportRead], summary="Get team EODs")
def get_team_eods(db: Session = Depends(get_db), actor: User = Depends(require_admin_or_manager)) -> list[EODReportRead]:
    if actor.role == UserRole.MANAGER:
        team_members = db.query(User).filter(User.manager_id == actor.id).all()
    else:
        team_members = db.query(User).all()
    user_map = {u.id: u.full_name for u in team_members}
    if not user_map:
        return []
    reports = (
        db.query(EODReport)
        .filter(EODReport.user_id.in_(list(user_map.keys())))
        .order_by(EODReport.report_date.desc(), EODReport.created_at.desc())
        .all()
    )
    return [_format_eod(report, user_map.get(report.user_id, "Unknown User")) for report in reports]


@router.post("/eod/{report_id}/review", response_model=EODReportRead, summary="Review an EOD")
def review_eod(report_id: uuid.UUID, payload: EODReviewRequest, db: Session = Depends(get_db), actor: User = Depends(require_admin_or_manager)) -> EODReportRead:
    report = db.get(EODReport, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EOD not found")

    if payload.action not in {"Approved", "Rejected", "Needs Revision", "Pending Approval", "Generated"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review action")

    report.status = payload.action
    report.manager_comments = payload.comments
    revision = EODRevision(
        eod_report_id=report.id,
        status=payload.action,
        manager_comments=payload.comments,
        snapshot_data=f"status={payload.action}",
    )
    db.add(revision)
    db.commit()
    db.refresh(report)
    user = db.get(User, report.user_id)
    return _format_eod(report, user.full_name if user else "Unknown User")
