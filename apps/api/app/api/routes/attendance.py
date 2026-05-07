"""Attendance routes."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.attendance import AttendanceSessionRead, CheckInRequest, CheckOutRequest, CorrectionRequest, CorrectionResolveRequest
from app.services.attendance_service import AttendanceService

router = APIRouter()


@router.post("/check-in", response_model=AttendanceSessionRead, summary="Check in for today")
def check_in(payload: CheckInRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AttendanceSessionRead:
    return AttendanceService(db).check_in(payload, actor)


@router.post("/check-out", response_model=AttendanceSessionRead, summary="Check out of active session")
def check_out(payload: CheckOutRequest | None = None, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AttendanceSessionRead:
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
