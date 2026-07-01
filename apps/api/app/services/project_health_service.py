from __future__ import annotations

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.enums import TaskStatus
from app.models.project import Project
from app.models.task import Task
from app.models.task_activity_event import TaskActivityEvent
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.project_health import (
    ProjectHealthActivity,
    ProjectHealthMember,
    ProjectHealthResponse,
    ProjectHealthSummary,
    ProjectHealthTask,
)
from app.services.project_authorization import ProjectAuthorizationService


class ProjectHealthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.authz = ProjectAuthorizationService(db)

    def get_health(self, project_id: uuid.UUID, actor: User) -> ProjectHealthResponse:
        project = self.db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self.authz.assert_can_read(actor, project)

        tasks = (
            self.db.query(Task)
            .options(joinedload(Task.assignee))
            .filter(Task.project_id == project.id, Task.status != TaskStatus.ARCHIVED)
            .all()
        )
        today = date.today()
        closed = (TaskStatus.COMPLETED, TaskStatus.REVIEWED)
        total = len(tasks)
        completed = sum(1 for task in tasks if task.status in closed)
        in_progress = sum(1 for task in tasks if task.status == TaskStatus.IN_PROGRESS)
        blocked = [task for task in tasks if task.status == TaskStatus.BLOCKED]
        overdue = [task for task in tasks if task.due_date and task.due_date < today and task.status not in closed]
        task_ids = [task.id for task in tasks]
        total_minutes = (
            self.db.query(func.coalesce(func.sum(TimeLog.duration_minutes), 0))
            .filter(TimeLog.task_id.in_(task_ids))
            .scalar()
            if task_ids
            else 0
        )
        member_ids = {task.assigned_to for task in tasks}
        completion_rate = round((completed / total) * 100, 1) if total else 0.0
        risk_level = "high" if len(overdue) >= 3 or len(blocked) >= 3 else "medium" if overdue or blocked else "low"
        members = self._members(member_ids, tasks)
        activity = self._activity(task_ids)
        summary = ProjectHealthSummary(
            total_tasks=total,
            completed_tasks=completed,
            in_progress_tasks=in_progress,
            blocked_tasks=len(blocked),
            overdue_tasks=len(overdue),
            total_logged_hours=round(float(total_minutes or 0) / 60, 2),
            active_members=len(member_ids),
            completion_rate=completion_rate,
            risk_level=risk_level,
        )
        return ProjectHealthResponse(
            project_id=project.id,
            project_name=project.title,
            summary=summary,
            recent_activity=activity,
            members=members,
            overdue_tasks=[self._task_item(task) for task in overdue[:20]],
            blocked_tasks=[self._task_item(task) for task in blocked[:20]],
        )

    def _task_item(self, task: Task) -> ProjectHealthTask:
        return ProjectHealthTask(
            id=task.id,
            title=task.title,
            assignee_name=task.assignee.full_name if task.assignee else None,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
            due_date=task.due_date,
        )

    def _members(self, member_ids: set, tasks: list[Task]) -> list[ProjectHealthMember]:
        if not member_ids:
            return []
        users = {user.id: user for user in self.db.query(User).filter(User.id.in_(member_ids)).all()}
        rows = (
            self.db.query(TimeLog.user_id, func.coalesce(func.sum(TimeLog.duration_minutes), 0))
            .filter(TimeLog.user_id.in_(member_ids))
            .group_by(TimeLog.user_id)
            .all()
        )
        hours = {uid: round(float(minutes or 0) / 60, 2) for uid, minutes in rows}
        items = []
        for uid in member_ids:
            user = users.get(uid)
            items.append(
                ProjectHealthMember(
                    id=uid,
                    name=user.full_name if user else "Unknown",
                    department=user.department_name if user else None,
                    active_tasks=sum(1 for task in tasks if task.assigned_to == uid and task.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED)),
                    logged_hours=hours.get(uid, 0.0),
                )
            )
        return items

    def _activity(self, task_ids: list[uuid.UUID]) -> list[ProjectHealthActivity]:
        if not task_ids:
            return []
        events = (
            self.db.query(TaskActivityEvent)
            .options(joinedload(TaskActivityEvent.actor), joinedload(TaskActivityEvent.task))
            .filter(TaskActivityEvent.task_id.in_(task_ids))
            .order_by(TaskActivityEvent.created_at.desc())
            .limit(10)
            .all()
        )
        return [
            ProjectHealthActivity(
                title=event.event_type.replace("_", " ").title(),
                description=f"{event.actor_name} updated {event.task.title if event.task else 'a task'}",
                created_at=event.created_at,
            )
            for event in events
        ]
