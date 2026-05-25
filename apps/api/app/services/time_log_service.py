"""TimeLog service — start/stop timer, manual entry, with business rule enforcement."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import ApprovalStatus, ProjectStatus, TaskStatus, TimeLogSourceType, TimeLogStatus, UserRole
from app.models.project import Project
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.time_log import ManualTimeLogRequest, StartTimerRequest, StopTimerRequest


class TimeLogService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def start_timer(self, payload: StartTimerRequest, actor: User) -> TimeLog:
        # Rule: one active timer per user
        active = self._get_active_timer(actor.id)
        if active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have an active timer. Stop it first.")

        task = self._validate_task_for_timer(payload.task_id, actor)

        log = TimeLog(
            task_id=task.id,
            user_id=actor.id,
            started_at=datetime.now(timezone.utc),
            source_type=TimeLogSourceType.TIMER,
            status=TimeLogStatus.ACTIVE,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def stop_timer(self, payload: StopTimerRequest, actor: User) -> TimeLog:
        log = self._get_active_timer(actor.id)
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active timer found.")
        if log.task_id != payload.task_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_id does not match the active timer.")

        now = datetime.now(timezone.utc)
        delta = now - log.started_at.replace(tzinfo=timezone.utc) if log.started_at.tzinfo is None else now - log.started_at
        duration = max(0, int(delta.total_seconds() // 60))

        log.ended_at = now
        log.duration_minutes = duration
        log.status = TimeLogStatus.COMPLETED
        log.notes = payload.notes

        # Update task actual_duration_minutes
        task = self.db.get(Task, log.task_id)
        if task:
            task.actual_duration_minutes = (task.actual_duration_minutes or 0) + duration

        self.db.commit()
        self.db.refresh(log)
        return log

    def add_manual(self, payload: ManualTimeLogRequest, actor: User) -> TimeLog:
        task = self._validate_task_for_timer(payload.task_id, actor)

        # Rule: no overlapping logs for this user
        overlap = (
            self.db.query(TimeLog)
            .filter(
                TimeLog.user_id == actor.id,
                TimeLog.status == TimeLogStatus.COMPLETED,
                TimeLog.started_at < payload.ended_at,
                TimeLog.ended_at > payload.started_at,
            )
            .first()
        )
        if overlap:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manual log overlaps an existing time log.")

        duration = max(0, int((payload.ended_at - payload.started_at).total_seconds() // 60))
        log = TimeLog(
            task_id=task.id,
            user_id=actor.id,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            duration_minutes=duration,
            source_type=TimeLogSourceType.MANUAL,
            status=TimeLogStatus.COMPLETED,
            notes=payload.notes,
        )
        self.db.add(log)

        task.actual_duration_minutes = (task.actual_duration_minutes or 0) + duration
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_my_logs(self, actor: User) -> list[TimeLog]:
        return self.db.query(TimeLog).filter(TimeLog.user_id == actor.id).order_by(TimeLog.started_at.desc()).all()

    def get_team_logs(self, actor: User) -> list[TimeLog]:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if actor.role == UserRole.MANAGER:
            member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
        else:
            member_ids = [u.id for u in self.db.query(User).all()]
        return self.db.query(TimeLog).filter(TimeLog.user_id.in_(member_ids)).order_by(TimeLog.started_at.desc()).all()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_active_timer(self, user_id: uuid.UUID) -> TimeLog | None:
        return self.db.query(TimeLog).filter(TimeLog.user_id == user_id, TimeLog.status == TimeLogStatus.ACTIVE).first()

    def _validate_task_for_timer(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if task.status == TaskStatus.BLOCKED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start timer on a blocked task")
        if task.status == TaskStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start timer on a completed task")

        project = self.db.get(Project, task.project_id)
        status_val = project.project_status.value if project and hasattr(project.project_status, 'value') else (project.project_status if project else None)
        if not project or status_val not in ("approved", "active"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task project is not approved or active")

        if actor.role == UserRole.EMPLOYEE and task.assigned_to != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only log time on tasks assigned to you")

        return task
