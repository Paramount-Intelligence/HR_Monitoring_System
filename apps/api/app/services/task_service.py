"""Task service — CRUD with RBAC, complexity assignment, and audit log."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.audit_log import AuditLog
from app.models.enums import ProjectStatus, TaskStatus, TimerSessionStatus, UserRole

TASK_FULL_ACCESS_ROLES = frozenset({UserRole.ADMIN, UserRole.HR_OPERATIONS})
CLOSED_TASK_STATUSES = frozenset({TaskStatus.COMPLETED, TaskStatus.REVIEWED, TaskStatus.ARCHIVED})
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
        self._validate_assignee(actor, payload.assigned_to)

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
        if task.assigned_to != actor.id:
            from app.models.enums import NotificationType
            from app.services.notification_service import create_notification

            create_notification(
                self.db,
                recipient_id=task.assigned_to,
                notification_type=NotificationType.SYSTEM,
                title="Task assigned",
                body=f"{actor.full_name} assigned you: {task.title}",
                related_entity_type="task",
                related_entity_id=task.id,
                actor_id=actor.id,
            )
            self.db.commit()
        return task

    def list_tasks(
        self,
        *,
        project_id: uuid.UUID | None = None,
        assigned_to: uuid.UUID | None = None,
        task_status: TaskStatus | None = None,
        include_archived: bool = False,
        actor: User,
    ) -> list[Task]:
        q = self.db.query(Task)
        if not include_archived or actor.role not in TASK_FULL_ACCESS_ROLES:
            q = q.filter(Task.status != TaskStatus.ARCHIVED)
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            q = q.filter(
                or_(Task.assigned_to == actor.id, Task.created_by == actor.id)
            )
        elif actor.role == UserRole.MANAGER:
            q = q.filter(Task.assigned_to.in_(self._manager_task_user_ids(actor)))
        if project_id:
            q = q.filter(Task.project_id == project_id)
        if assigned_to:
            q = q.filter(Task.assigned_to == assigned_to)
        if task_status:
            q = q.filter(Task.status == task_status)
        return (
            q.options(joinedload(Task.assignee), joinedload(Task.project))
            .order_by(Task.created_at.desc())
            .all()
        )

    def get_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        self._check_read_access(task, actor)
        return task

    def update_task(self, task_id: uuid.UUID, payload: TaskUpdate, actor: User) -> Task:
        task = self.get_task(task_id, actor)
        self._assert_can_modify(task, actor)
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            allowed = {"status", "blocked_reason"}
            if set(payload.model_dump(exclude_unset=True).keys()) - allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees can only update status and blocked_reason")
        old_snapshot = {
            "title": task.title,
            "status": task.status.value,
            "priority": task.priority.value,
            "assigned_to": str(task.assigned_to),
            "project_id": str(task.project_id),
        }
        changes = payload.model_dump(exclude_unset=True)
        audit_changes = payload.model_dump(exclude_unset=True, mode="json")
        if "assigned_to" in changes and changes["assigned_to"] is not None:
            self._validate_assignee(actor, changes["assigned_to"])
        if "project_id" in changes and changes["project_id"] is not None:
            project = self.db.get(Project, changes["project_id"])
            if not project:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
            status_val = project.project_status.value if hasattr(project.project_status, "value") else project.project_status
            if status_val not in ("approved", "active"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasks can only be linked to approved or active projects",
                )
        for field, value in changes.items():
            setattr(task, field, value)
        was_completed = old_snapshot["status"] == TaskStatus.COMPLETED.value
        becoming_completed = task.status == TaskStatus.COMPLETED
        if task.status == TaskStatus.ARCHIVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archived tasks cannot be updated",
            )
        if becoming_completed and actor.role in (
            UserRole.EMPLOYEE,
            UserRole.INTERN,
            UserRole.JUNIOR_EMPLOYEE,
        ):
            from app.services.task_timer_service import TaskTimerService

            active = TaskTimerService(self.db).get_active_session(actor.id)
            if (
                active
                and active.task_id == task.id
                and active.status in (TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Stop the timer before marking this task complete",
                )
        if becoming_completed and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
            task.completed_by = actor.id
        if was_completed and not becoming_completed:
            task.completed_at = None
            task.completed_by = None
        if becoming_completed and not was_completed:
            from app.services.task_completion_request_service import TaskCompletionRequestService

            TaskCompletionRequestService(self.db).supersede_pending_for_task(task.id, actor=actor)
        self._write_audit(actor, "TASK_UPDATED", task.id, old_value=old_snapshot, new_value=audit_changes)
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

    def complete_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.get_task(task_id, actor)
        if not self.can_complete_task(task, actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to complete this task",
            )
        from app.services.task_timer_service import TaskTimerService

        timer_service = TaskTimerService(self.db)
        active = timer_service.get_active_session(actor.id)
        if (
            active
            and active.task_id == task.id
            and active.status in (TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED)
        ):
            timer_service.stop_timer(task.id, actor)
        return self.update_task(task_id, TaskUpdate(status=TaskStatus.COMPLETED), actor)

    def can_complete_task(self, task: Task, actor: User) -> bool:
        if task.status in CLOSED_TASK_STATUSES:
            return False
        try:
            self._assert_can_modify(task, actor)
        except HTTPException:
            return False
        return True

    def task_action_flags(self, task: Task, actor: User) -> dict[str, bool]:
        can_modify = False
        try:
            self._assert_can_modify(task, actor)
            can_modify = True
        except HTTPException:
            pass
        is_open = task.status not in CLOSED_TASK_STATUSES
        can_complete = is_open and can_modify
        can_update_status = can_modify and (
            actor.role in TASK_FULL_ACCESS_ROLES
            or actor.role == UserRole.MANAGER
            or actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE)
        )
        can_start_timer = (
            is_open
            and task.assigned_to == actor.id
            and actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.MANAGER)
        )
        return {
            "can_complete": can_complete,
            "can_update_status": can_update_status,
            "can_start_timer": can_start_timer,
        }

    def archive_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.get_task(task_id, actor)
        self._assert_can_modify(task, actor)
        if task.status == TaskStatus.ARCHIVED:
            return task
        old_status = task.status.value if hasattr(task.status, "value") else str(task.status)
        task.status = TaskStatus.ARCHIVED
        self._write_audit(
            actor,
            "TASK_ARCHIVED",
            task.id,
            old_value={"status": old_status},
            new_value={"status": TaskStatus.ARCHIVED.value},
        )
        self.db.commit()
        self.db.refresh(task)
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
        if actor.role in TASK_FULL_ACCESS_ROLES:
            return
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            if task.assigned_to != actor.id and task.created_by != actor.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            return
        if actor.role == UserRole.MANAGER:
            if task.assigned_to not in self._manager_task_user_ids(actor):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _assert_can_modify(self, task: Task, actor: User) -> None:
        if actor.role in TASK_FULL_ACCESS_ROLES:
            return
        if actor.role == UserRole.MANAGER:
            if task.assigned_to not in self._manager_task_user_ids(actor):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to modify this task")
            return
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            if task.assigned_to != actor.id and task.created_by != actor.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _validate_assignee(self, actor: User, assignee_id: uuid.UUID) -> None:
        assignee = self.db.get(User, assignee_id)
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        if actor.role == UserRole.MANAGER and assignee.id != actor.id and assignee.manager_id != actor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assign tasks to your direct reports or yourself",
            )

    def _manager_task_user_ids(self, actor: User) -> list[uuid.UUID]:
        member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
        member_ids.append(actor.id)
        return member_ids

    def _write_audit(self, actor: User, action: str, entity_id: uuid.UUID, old_value: dict | None = None, new_value: dict | None = None) -> None:
        self.db.add(AuditLog(actor_user_id=actor.id, action_type=action, entity_type="task", entity_id=entity_id, old_value=old_value, new_value=new_value))
