"""Attendance routes."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.attendance import (
    AttendanceSessionRead,
    CheckInRequest,
    CheckOutRequest,
    CorrectionRequest,
    CorrectionResolveRequest,
    AttendanceBreakRead,
    AttendanceBreakStartRequest
)
from app.schemas.attendance_exception import (
    AttendanceExceptionDismissRequest,
    AttendanceExceptionResolveRequest,
    AttendanceExceptionsResponse,
)
from app.services.attendance_exception_service import AttendanceExceptionService
from app.services.attendance_service import AttendanceService

router = APIRouter()


@router.post("/check-in", response_model=AttendanceSessionRead, summary="Check in for today")
def check_in(payload: CheckInRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AttendanceSessionRead:
    return AttendanceService(db).check_in(payload, actor)


@router.post("/check-out", response_model=AttendanceSessionRead, summary="Check out of active session")
def check_out(payload: CheckOutRequest | None = Body(default=None), db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AttendanceSessionRead:
    return AttendanceService(db).check_out(actor, payload)


@router.get("/active", response_model=AttendanceSessionRead | None, summary="Get current active session")
def get_active(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AttendanceSessionRead | None:
    return AttendanceService(db).get_active(actor)


@router.get("/me", response_model=list[AttendanceSessionRead], summary="My attendance history")
def get_my_sessions(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AttendanceSessionRead]:
    return AttendanceService(db).get_my_sessions(actor, date_from=date_from, date_to=date_to)


@router.get("/team", response_model=list[AttendanceSessionRead], summary="Team attendance (manager/admin)")
def get_team_sessions(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AttendanceSessionRead]:
    return AttendanceService(db).get_team_sessions(actor, date_from=date_from, date_to=date_to)


@router.get("/exceptions", response_model=AttendanceExceptionsResponse, summary="Attendance exceptions center")
def list_attendance_exceptions(
    date: date | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    status: str = Query("open"),
    type: str | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    scope: str = Query("my_team"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceExceptionsResponse:
    return AttendanceExceptionService(db).list_exceptions(
        actor=actor,
        business_date=date,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
        type_filter=type,
        user_id=user_id,
        department_id=department_id,
        search=search,
        scope=scope,
    )


@router.post("/exceptions/{exception_id}/resolve", summary="Resolve an attendance exception")
def resolve_attendance_exception(
    exception_id: uuid.UUID,
    payload: AttendanceExceptionResolveRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    AttendanceExceptionService(db).resolve(exception_id, actor, payload.resolution_note)
    return {"status": "resolved"}


@router.post("/exceptions/{exception_id}/dismiss", summary="Dismiss an attendance exception")
def dismiss_attendance_exception(
    exception_id: uuid.UUID,
    payload: AttendanceExceptionDismissRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    AttendanceExceptionService(db).dismiss(exception_id, actor, payload.resolution_note)
    return {"status": "dismissed"}


@router.patch("/{session_id}/correction-request", response_model=AttendanceSessionRead, summary="Request correction for a session")
def request_correction(
    session_id: uuid.UUID,
    payload: CorrectionRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceSessionRead:
    return AttendanceService(db).request_correction(session_id, payload, actor)


@router.get("/corrections/pending", response_model=list[AttendanceSessionRead], summary="Get pending corrections for manager team")
def get_pending_corrections(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AttendanceSessionRead]:
    return AttendanceService(db).get_pending_corrections(actor)


@router.patch("/{session_id}/resolve-correction", response_model=AttendanceSessionRead, summary="Resolve an attendance correction")
def resolve_correction(
    session_id: uuid.UUID,
    payload: CorrectionResolveRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceSessionRead:
    return AttendanceService(db).resolve_correction(session_id, payload, actor)


# --- Break Endpoints ---

@router.post("/breaks/start", response_model=AttendanceBreakRead)
def start_break(
    payload: AttendanceBreakStartRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceBreakRead:
    service = AttendanceService(db)
    return service.start_break(actor, payload.break_type, payload.note)


@router.post("/breaks/end", response_model=AttendanceBreakRead)
def end_break(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceBreakRead:
    service = AttendanceService(db)
    return service.end_break(actor)


@router.get("/breaks/current", response_model=AttendanceBreakRead | None)
def get_current_break(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AttendanceBreakRead | None:
    service = AttendanceService(db)
    return service.get_active_break(actor.id)


@router.get("/sessions/{session_id}/breaks", response_model=list[AttendanceBreakRead])
def get_session_breaks(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AttendanceBreakRead]:
    service = AttendanceService(db)
    return service.get_session_breaks(session_id)
