"""Time log routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.time_log import ManualTimeLogRequest, StartTimerRequest, StopTimerRequest, TimeLogRead
from app.services.time_log_service import TimeLogService

router = APIRouter()


@router.post("/start", response_model=TimeLogRead, summary="Start a timer on a task")
def start_timer(payload: StartTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TimeLogRead:
    return TimeLogService(db).start_timer(payload, actor)


@router.post("/stop", response_model=TimeLogRead, summary="Stop the active timer")
def stop_timer(payload: StopTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TimeLogRead:
    return TimeLogService(db).stop_timer(payload, actor)


@router.post("/manual", response_model=TimeLogRead, summary="Add a manual time log")
def add_manual(payload: ManualTimeLogRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TimeLogRead:
    return TimeLogService(db).add_manual(payload, actor)


@router.get("/me", response_model=list[TimeLogRead], summary="My time logs")
def get_my_logs(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TimeLogRead]:
    return TimeLogService(db).get_my_logs(actor)


@router.get("/team", response_model=list[TimeLogRead], summary="Team time logs (manager/admin)")
def get_team_logs(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TimeLogRead]:
    return TimeLogService(db).get_team_logs(actor)
