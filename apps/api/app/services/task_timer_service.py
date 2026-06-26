"""TaskTimer service — start/pause/resume/stop timer logic."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.enums import TaskStatus, TimerPauseReason, TimerSessionStatus, TimeLogSourceType, TimeLogStatus, UserRole
from app.models.task import Task
from app.models.task_timer_session import TaskTimerSession
from app.models.time_log import TimeLog
from app.models.user import User
from app.models.attendance_session import AttendanceSession, AttendanceSessionStatus


class TaskTimerService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def start_timer(self, task_id: uuid.UUID, actor: User) -> TaskTimerSession:
        # Rule: User must be checked in
        if not self._is_user_checked_in(actor.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must check in before starting a task."
            )

        # Rule: Only one active or paused session per user
        active = self.get_active_session(actor.id)
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active or paused task timer."
            )

        task = self._validate_task(task_id, actor)

        now = datetime.now(timezone.utc)
        session = TaskTimerSession(
            task_id=task.id,
            user_id=actor.id,
            status=TimerSessionStatus.RUNNING,
            started_at=now,
            last_resumed_at=now,
            accumulated_seconds=0
        )
        self.db.add(session)
        
        # Update task status if not already in progress
        if task.status == TaskStatus.CREATED or task.status == TaskStatus.APPROVED:
            task.status = TaskStatus.IN_PROGRESS

        self.db.commit()
        return self._reload_session(session.id)

    def pause_timer(self, task_id: uuid.UUID, actor: User, reason: TimerPauseReason = TimerPauseReason.MANUAL) -> TaskTimerSession:
        session = self.get_active_session(actor.id)
        if not session or session.task_id != task_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active task timer not found.")
        
        if session.status != TimerSessionStatus.RUNNING:
            return self._reload_session(session.id)

        now = datetime.now(timezone.utc)
        delta = now - session.last_resumed_at.replace(tzinfo=timezone.utc) if session.last_resumed_at.tzinfo is None else now - session.last_resumed_at
        
        session.accumulated_seconds += int(delta.total_seconds())
        session.status = TimerSessionStatus.PAUSED
        session.paused_at = now
        session.pause_reason = reason

        self.db.commit()
        return self._reload_session(session.id)

    def resume_timer(self, task_id: uuid.UUID, actor: User) -> TaskTimerSession:
        # Rule: User must be checked in
        if not self._is_user_checked_in(actor.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must check in before resuming a task."
            )

        session = self.get_active_session(actor.id)
        if not session or session.task_id != task_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paused task timer not found.")
        
        if session.status == TimerSessionStatus.RUNNING:
            return self._reload_session(session.id)

        now = datetime.now(timezone.utc)
        session.status = TimerSessionStatus.RUNNING
        session.last_resumed_at = now
        session.paused_at = None
        session.pause_reason = None

        self.db.commit()
        return self._reload_session(session.id)

    def stop_timer(self, task_id: uuid.UUID, actor: User, notes: str | None = None) -> TimeLog:
        session = self.get_active_session(actor.id)
        if not session or session.task_id != task_id:
            # Maybe it was already completed? Try to find a completed one today?
            # No, keep it strict.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active task timer not found.")

        now = datetime.now(timezone.utc)
        total_seconds = session.accumulated_seconds
        
        if session.status == TimerSessionStatus.RUNNING:
            delta = now - session.last_resumed_at.replace(tzinfo=timezone.utc) if session.last_resumed_at.tzinfo is None else now - session.last_resumed_at
            total_seconds += int(delta.total_seconds())

        duration_minutes = max(0, total_seconds // 60)

        # Create finalized TimeLog
        log = TimeLog(
            task_id=session.task_id,
            user_id=actor.id,
            started_at=session.started_at,
            ended_at=now,
            duration_minutes=duration_minutes,
            source_type=TimeLogSourceType.TIMER,
            status=TimeLogStatus.COMPLETED,
            notes=notes
        )
        self.db.add(log)

        # Update Task actual duration
        task = self.db.get(Task, session.task_id)
        if task:
            task.actual_duration_minutes = (task.actual_duration_minutes or 0) + duration_minutes

        # Finalize session
        session.status = TimerSessionStatus.COMPLETED
        
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_active_session(self, user_id: uuid.UUID) -> TaskTimerSession | None:
        return (
            self._session_query()
            .filter(
                TaskTimerSession.user_id == user_id,
                TaskTimerSession.status.in_([TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED])
            )
            .first()
        )

    # ------------------------------------------------------------------
    # Internal Helpers
    # ------------------------------------------------------------------

    def _session_query(self):
        return (
            self.db.query(TaskTimerSession)
            .options(
                joinedload(TaskTimerSession.task).joinedload(Task.project),
            )
        )

    def _reload_session(self, session_id: uuid.UUID) -> TaskTimerSession:
        session = self._session_query().filter(TaskTimerSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task timer session not found.")
        return session

    def _is_user_checked_in(self, user_id: uuid.UUID) -> bool:
        return self.db.query(AttendanceSession).filter(
            AttendanceSession.user_id == user_id,
            AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE
        ).first() is not None

    def _validate_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if task.status == TaskStatus.BLOCKED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start timer on a blocked task")
        if task.status == TaskStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start timer on a completed task")
        
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            if task.assigned_to != actor.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only log time on tasks assigned to you")
        elif actor.role == UserRole.MANAGER:
            if task.assigned_to != actor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only start timers for tasks assigned to you.",
                )

        return task
