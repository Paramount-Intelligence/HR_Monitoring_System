"""Task service — CRUD with RBAC, complexity assignment, and audit log."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import ProjectStatus, TaskStatus, UserRole
from app.models.project import Project
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User
from app.schemas.task import TaskComplexity, TaskCreate, TaskUpdate, TaskCommentCreate


class TaskService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_task(self, payload: TaskCreate, actor: User) -> Task:
        project = self.db.get(Project, payload.project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
        # Robust comparison against string vs enum representation
        status_val = project.project_status.value if hasattr(project.project_status, 'value') else project.project_status
        if status_val not in ("approved", "active"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tasks can only be created for approved or active projects",
            )
        assignee = self.db.get(User, payload.assigned_to)
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        if actor.role == UserRole.MANAGER and assignee.id != actor.id and assignee.manager_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only assign tasks to your direct reports or yourself")

        task = Task(
            project_id=payload.project_id,
            assigned_to=payload.assigned_to,
            created_by=actor.id,
            title=payload.title,
            description=payload.description,
            priority=payload.priority,
            due_date=payload.due_date,
            status=TaskStatus.CREATED,
        )
        self.db.add(task)
        self.db.flush()
        self._write_audit(actor, "TASK_CREATED", task.id, new_value={"title": task.title})
        self.db.commit()
        self.db.refresh(task)
        from app.services.realtime_service import RealtimeService

        RealtimeService.emit_task_event(
            "task_assigned",
            task_id=task.id,
            title=task.title,
            assignee_id=task.assigned_to,
            actor_id=actor.id,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
        )
        return task

    def list_tasks(self, *, project_id: uuid.UUID | None = None, assigned_to: uuid.UUID | None = None, task_status: TaskStatus | None = None, actor: User) -> list[Task]:
        q = self.db.query(Task)
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            q = q.filter(Task.assigned_to == actor.id)
        elif actor.role == UserRole.MANAGER:
            member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
            q = q.filter(Task.assigned_to.in_(member_ids))
        if project_id:
            q = q.filter(Task.project_id == project_id)
        if assigned_to:
            q = q.filter(Task.assigned_to == assigned_to)
        if task_status:
            q = q.filter(Task.status == task_status)
        return q.order_by(Task.created_at.desc()).all()

    def get_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        self._check_read_access(task, actor)
        return task

    def update_task(self, task_id: uuid.UUID, payload: TaskUpdate, actor: User) -> Task:
        task = self.get_task(task_id, actor)
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            allowed = {"status", "blocked_reason"}
            if set(payload.model_dump(exclude_unset=True).keys()) - allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees can only update status and blocked_reason")
        old_snapshot = {"status": task.status.value, "priority": task.priority.value}
        changes = payload.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(task, field, value)
        if task.status == TaskStatus.COMPLETED and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        self._write_audit(actor, "TASK_UPDATED", task.id, old_value=old_snapshot, new_value=changes)
        self.db.commit()
        self.db.refresh(task)
        from app.services.realtime_service import RealtimeService

        event_type = "task_completed" if task.status == TaskStatus.COMPLETED else "task_updated"
        RealtimeService.emit_task_event(
            event_type,
            task_id=task.id,
            title=task.title,
            assignee_id=task.assigned_to,
            actor_id=actor.id,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
        )
        return task

    def set_complexity(self, task_id: uuid.UUID, payload: TaskComplexity, actor: User) -> Task:
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees cannot set complexity")
        task = self.get_task(task_id, actor)
        old = {"complexity_level": task.complexity_level, "expected_duration_minutes": task.expected_duration_minutes}
        task.complexity_level = payload.complexity_level
        task.expected_duration_minutes = payload.expected_duration_minutes
        self._write_audit(actor, "TASK_COMPLEXITY_SET", task.id, old_value=old, new_value=payload.model_dump())
        self.db.commit()
        self.db.refresh(task)
        return task

    def list_subtasks(self, task_id: uuid.UUID, actor: User) -> list[Task]:
        task = self.get_task(task_id, actor)
        return self.db.query(Task).filter(Task.parent_id == task.id).order_by(Task.created_at.asc()).all()

    def create_comment(self, task_id: uuid.UUID, payload: TaskCommentCreate, actor: User) -> TaskComment:
        task = self.get_task(task_id, actor)
        comment = TaskComment(
            task_id=task.id,
            user_id=actor.id,
            content=payload.content
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def list_comments(self, task_id: uuid.UUID, actor: User) -> list[TaskComment]:
        task = self.get_task(task_id, actor)
        return self.db.query(TaskComment).filter(TaskComment.task_id == task.id).order_by(TaskComment.created_at.asc()).all()


    def _check_read_access(self, task: Task, actor: User) -> None:
        if actor.role == UserRole.ADMIN:
            return
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE) and task.assigned_to != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if actor.role == UserRole.MANAGER:
            member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
            if task.assigned_to not in member_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _write_audit(self, actor: User, action: str, entity_id: uuid.UUID, old_value: dict | None = None, new_value: dict | None = None) -> None:
        self.db.add(AuditLog(actor_user_id=actor.id, action_type=action, entity_type="task", entity_id=entity_id, old_value=old_value, new_value=new_value))
