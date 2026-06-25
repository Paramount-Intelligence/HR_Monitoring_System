from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from app.schemas.ops import (
    DutyCreate,
    DutyRead,
    DutyUpdate,
    EODReportRead,
    EODReviewRequest,
    EODSubmitRequest,
)
from app.services.eod_service import (
    generate_or_refresh_eod,
    get_user_eod_report,
    notify_submitter_on_eod_review,
    resolve_report_date,
    submit_user_eod,
)

router = APIRouter()

MANAGER_VISIBLE_EOD_STATUSES = (
    "Pending Approval",
    "Approved",
    "Rejected",
    "Needs Revision",
)


def _read_work_mode(report: EODReport) -> str:
    if report.work_mode in {"office", "wfh"}:
        return report.work_mode
    legacy = report.highlights_summary or ""
    if legacy in {"office", "wfh"}:
        return legacy
    return "office"


def _format_eod(report: EODReport, user_name: str) -> EODReportRead:
    return EODReportRead(
        id=report.id,
        user_id=report.user_id,
        user_name=user_name,
        date=report.report_date,
        login_time=ensure_pk_datetime(report.login_time),
        logout_time=ensure_pk_datetime(report.logout_time),
        work_mode=_read_work_mode(report),
        total_hours=float(report.total_hours),
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
def get_my_eod(
    report_date: date | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> EODReportRead | None:
    target_date = resolve_report_date(report_date)
    report = get_user_eod_report(db, actor.id, target_date)
    if not report:
        return None
    return _format_eod(report, actor.full_name)


@router.get("/eod/me/today", response_model=EODReportRead | None, summary="Get my EOD for today")
def get_my_eod_today(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> EODReportRead | None:
    return get_my_eod(report_date=None, db=db, actor=actor)


@router.post("/eod/me/generate", response_model=EODReportRead, summary="Generate my EOD")
def generate_my_eod(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> EODReportRead:
    report = generate_or_refresh_eod(db, actor)
    return _format_eod(report, actor.full_name)


@router.post("/eod/me/submit", response_model=EODReportRead, summary="Submit my EOD")
def submit_my_eod(
    payload: EODSubmitRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> EODReportRead:
    try:
        report = submit_user_eod(
            db,
            actor,
            report_date=payload.report_date,
            work_summary=payload.work_summary,
            blockers=payload.blockers,
            next_day_plan=payload.next_day_plan,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
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
        .filter(
            EODReport.user_id.in_(list(user_map.keys())),
            EODReport.user_id != actor.id,
            EODReport.status.in_(MANAGER_VISIBLE_EOD_STATUSES),
        )
        .order_by(EODReport.report_date.desc(), EODReport.created_at.desc())
        .all()
    )
    return [_format_eod(report, user_map.get(report.user_id, "Unknown User")) for report in reports]


@router.post("/eod/{report_id}/review", response_model=EODReportRead, summary="Review an EOD")
def review_eod(report_id: uuid.UUID, payload: EODReviewRequest, db: Session = Depends(get_db), actor: User = Depends(require_admin_or_manager)) -> EODReportRead:
    report = db.get(EODReport, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EOD not found")

    if report.user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot review your own EOD",
        )

    if actor.role == UserRole.MANAGER:
        employee = db.get(User, report.user_id)
        if not employee or employee.manager_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to review this EOD")

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
    notify_submitter_on_eod_review(db, report=report, reviewer=actor, action=payload.action)
    db.commit()
    db.refresh(report)
    user = db.get(User, report.user_id)
    return _format_eod(report, user.full_name if user else "Unknown User")
