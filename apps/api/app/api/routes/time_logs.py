"""Time log routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.time_log import ManualTimeLogRequest, TimeLogRead, StartTimerRequest, StopTimerRequest
from app.schemas.task_timer import TaskTimerRead
from app.services.task_timer_serializers import format_task_timer_read
from app.services.time_log_service import TimeLogService
from app.services.task_timer_service import TaskTimerService

router = APIRouter()


@router.post("/start", response_model=TaskTimerRead, summary="Start a timer session on a task")
def start_timer(payload: StartTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskTimerRead:
    session = TaskTimerService(db).start_timer(payload.task_id, actor)
    return format_task_timer_read(session)


@router.post("/pause", response_model=TaskTimerRead, summary="Pause a running timer session")
def pause_timer(payload: StartTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskTimerRead:
    session = TaskTimerService(db).pause_timer(payload.task_id, actor)
    return format_task_timer_read(session)


@router.post("/resume", response_model=TaskTimerRead, summary="Resume a paused timer session")
def resume_timer(payload: StartTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskTimerRead:
    session = TaskTimerService(db).resume_timer(payload.task_id, actor)
    return format_task_timer_read(session)


@router.post("/stop", response_model=TimeLogRead, summary="Stop and finalize the timer session into a TimeLog")
def stop_timer(payload: StopTimerRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TimeLogRead:
    return TaskTimerService(db).stop_timer(payload.task_id, actor, payload.notes)


@router.get("/active-timer", response_model=TaskTimerRead | None, summary="Get current active or paused timer session")
def get_active_timer(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskTimerRead | None:
    session = TaskTimerService(db).get_active_session(actor.id)
    return format_task_timer_read(session)


@router.post("/manual", response_model=TimeLogRead, summary="Add a manual time log")
def add_manual(payload: ManualTimeLogRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TimeLogRead:
    return TimeLogService(db).add_manual(payload, actor)


@router.get("/me", response_model=list[TimeLogRead], summary="My time logs")
def get_my_logs(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TimeLogRead]:
    return TimeLogService(db).get_my_logs(actor)


@router.get("/team", response_model=list[TimeLogRead], summary="Team time logs (manager/admin)")
def get_team_logs(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TimeLogRead]:
    return TimeLogService(db).get_team_logs(actor)
