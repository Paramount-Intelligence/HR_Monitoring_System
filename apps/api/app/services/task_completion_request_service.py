"""Intern task completion approval workflow."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.enums import (
    NotificationType,
    TaskCompletionRequestStatus,
    TaskStatus,
    UserRole,
    UserStatus,
)
from app.models.notifications import Notification
from app.models.project import Project
from app.models.task import Task
from app.models.task_completion_request import TaskCompletionRequest
from app.models.user import User
from app.schemas.task_completion_request import (
    TaskCompletionRequestCreate,
    TaskCompletionRequestRead,
    TaskCompletionRequestReject,
    TaskCompletionRequestReview,
    TaskCompletionRequestSummary,
)
from app.services.task_service import TASK_FULL_ACCESS_ROLES, TaskService
from app.services.task_timer_service import TaskTimerService

INTERN_ROLES = frozenset({UserRole.INTERN})


class TaskCompletionRequestService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_request(
        self, task_id: uuid.UUID, payload: TaskCompletionRequestCreate, actor: User
    ) -> TaskCompletionRequestRead:
        if actor.role not in INTERN_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only interns can request task completion approval",
            )

        task = self.db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if task.assigned_to != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if task.status in (TaskStatus.COMPLETED, TaskStatus.REVIEWED, TaskStatus.ARCHIVED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is already completed or archived",
            )

        active = TaskTimerService(self.db).get_active_session(actor.id)
        if active and active.task_id == task.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stop the timer before requesting completion",
            )

        existing = self._get_pending_request(task.id, actor.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending completion request already exists for this task",
            )

        manager_id = self._resolve_manager_id(task, actor)
        now = datetime.now(timezone.utc)
        request = TaskCompletionRequest(
            task_id=task.id,
            requested_by_user_id=actor.id,
            manager_id=manager_id,
            status=TaskCompletionRequestStatus.PENDING,
            request_note=(payload.request_note or "").strip() or None,
            requested_at=now,
        )
        self.db.add(request)
        self.db.flush()
        self._notify_manager(request, task, actor)
        self.db.commit()
        self.db.refresh(request)
        self._emit_request_created(request, task, actor)
        return self._to_read(request)

    def list_requests(
        self,
        *,
        actor: User,
        request_status: TaskCompletionRequestStatus | None = None,
    ) -> list[TaskCompletionRequestRead]:
        q = self.db.query(TaskCompletionRequest).options(
            joinedload(TaskCompletionRequest.task).joinedload(Task.project),
            joinedload(TaskCompletionRequest.requester),
            joinedload(TaskCompletionRequest.manager),
            joinedload(TaskCompletionRequest.reviewer),
        )

        if actor.role in TASK_FULL_ACCESS_ROLES:
            pass
        elif actor.role == UserRole.MANAGER:
            report_ids = TaskService(self.db)._manager_task_user_ids(actor)
            q = q.filter(
                TaskCompletionRequest.manager_id == actor.id,
                TaskCompletionRequest.requested_by_user_id.in_(report_ids),
            )
        elif actor.role in INTERN_ROLES:
            q = q.filter(TaskCompletionRequest.requested_by_user_id == actor.id)
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        if request_status:
            q = q.filter(TaskCompletionRequest.status == request_status)

        rows = q.order_by(TaskCompletionRequest.requested_at.desc()).all()
        return [self._to_read(row) for row in rows]

    def get_request(self, request_id: uuid.UUID, actor: User) -> TaskCompletionRequestRead:
        request = self._get_request_or_404(request_id)
        self._assert_can_view(request, actor)
        return self._to_read(request)

    def approve(
        self, request_id: uuid.UUID, payload: TaskCompletionRequestReview, actor: User
    ) -> TaskCompletionRequestRead:
        request = self._get_request_or_404(request_id)
        self._assert_can_review(request, actor)
        if request.status != TaskCompletionRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending requests can be approved",
            )

        task = self.db.get(Task, request.task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        active = TaskTimerService(self.db).get_active_session(request.requested_by_user_id)
        if active and active.task_id == task.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve while the intern still has an active timer on this task",
            )

        now = datetime.now(timezone.utc)
        request.status = TaskCompletionRequestStatus.APPROVED
        request.reviewed_at = now
        request.reviewed_by_user_id = actor.id
        comment = (payload.manager_comment or "").strip()
        request.manager_comment = comment or None

        task.status = TaskStatus.COMPLETED
        if not task.completed_at:
            task.completed_at = now

        self._notify_intern(
            request,
            task,
            title="Task completed",
            message=f"Your completion request for {task.title} was approved.",
        )
        self.db.commit()
        self.db.refresh(request)
        self._emit_reviewed(request, task, actor, "task_completion_approved")
        return self._to_read(request)

    def reject(
        self, request_id: uuid.UUID, payload: TaskCompletionRequestReject, actor: User
    ) -> TaskCompletionRequestRead:
        request = self._get_request_or_404(request_id)
        self._assert_can_review(request, actor)
        if request.status != TaskCompletionRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending requests can be rejected",
            )

        task = self.db.get(Task, request.task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        now = datetime.now(timezone.utc)
        request.status = TaskCompletionRequestStatus.REJECTED
        request.reviewed_at = now
        request.reviewed_by_user_id = actor.id
        request.manager_comment = payload.manager_comment.strip()

        self._notify_intern(
            request,
            task,
            title="Completion request rejected",
            message=f"Your manager rejected your completion request for {task.title}.",
        )
        self.db.commit()
        self.db.refresh(request)
        self._emit_reviewed(request, task, actor, "task_completion_rejected")
        return self._to_read(request)

    def supersede_pending_for_task(
        self,
        task_id: uuid.UUID,
        *,
        actor: User,
        note: str = "Task was completed manually by manager.",
    ) -> None:
        pending_rows = (
            self.db.query(TaskCompletionRequest)
            .filter(
                TaskCompletionRequest.task_id == task_id,
                TaskCompletionRequest.status == TaskCompletionRequestStatus.PENDING,
            )
            .all()
        )
        if not pending_rows:
            return

        now = datetime.now(timezone.utc)
        task = self.db.get(Task, task_id)
        for row in pending_rows:
            row.status = TaskCompletionRequestStatus.SUPERSEDED
            row.reviewed_at = now
            row.reviewed_by_user_id = actor.id
            row.manager_comment = note
            if task:
                self._notify_intern(
                    row,
                    task,
                    title="Task completed",
                    message=f"Your task {task.title} was marked completed by your manager.",
                )

    def get_summary_for_task(
        self, task_id: uuid.UUID, actor: User
    ) -> TaskCompletionRequestSummary | None:
        q = self.db.query(TaskCompletionRequest).filter(TaskCompletionRequest.task_id == task_id)
        if actor.role in INTERN_ROLES:
            q = q.filter(TaskCompletionRequest.requested_by_user_id == actor.id)
        elif actor.role == UserRole.MANAGER:
            q = q.filter(TaskCompletionRequest.manager_id == actor.id)
        elif actor.role not in TASK_FULL_ACCESS_ROLES:
            return None

        row = q.order_by(TaskCompletionRequest.requested_at.desc()).first()
        if not row:
            return None
        return TaskCompletionRequestSummary(
            id=row.id,
            status=row.status,
            request_note=row.request_note,
            manager_comment=row.manager_comment,
            requested_at=row.requested_at,
            reviewed_at=row.reviewed_at,
        )

    def summaries_for_tasks(
        self, task_ids: list[uuid.UUID], actor: User
    ) -> dict[uuid.UUID, TaskCompletionRequestSummary]:
        if not task_ids:
            return {}
        q = self.db.query(TaskCompletionRequest).filter(
            TaskCompletionRequest.task_id.in_(task_ids)
        )
        if actor.role in INTERN_ROLES:
            q = q.filter(TaskCompletionRequest.requested_by_user_id == actor.id)
        elif actor.role == UserRole.MANAGER:
            q = q.filter(TaskCompletionRequest.manager_id == actor.id)
        elif actor.role not in TASK_FULL_ACCESS_ROLES:
            return {}

        rows = q.order_by(TaskCompletionRequest.requested_at.desc()).all()
        result: dict[uuid.UUID, TaskCompletionRequestSummary] = {}
        for row in rows:
            if row.task_id in result:
                continue
            result[row.task_id] = TaskCompletionRequestSummary(
                id=row.id,
                status=row.status,
                request_note=row.request_note,
                manager_comment=row.manager_comment,
                requested_at=row.requested_at,
                reviewed_at=row.reviewed_at,
            )
        return result

    def _get_pending_request(
        self, task_id: uuid.UUID, requester_id: uuid.UUID
    ) -> TaskCompletionRequest | None:
        return (
            self.db.query(TaskCompletionRequest)
            .filter(
                TaskCompletionRequest.task_id == task_id,
                TaskCompletionRequest.requested_by_user_id == requester_id,
                TaskCompletionRequest.status == TaskCompletionRequestStatus.PENDING,
            )
            .first()
        )

    def _resolve_manager_id(self, task: Task, requester: User) -> uuid.UUID:
        if requester.manager_id:
            manager = self.db.get(User, requester.manager_id)
            if manager and manager.status == UserStatus.ACTIVE:
                return requester.manager_id

        project = task.project or self.db.get(Project, task.project_id)
        if project and project.manager_id:
            mgr = self.db.get(User, project.manager_id)
            if mgr and mgr.role == UserRole.MANAGER:
                return project.manager_id

        creator = self.db.get(User, task.created_by)
        if creator and creator.role == UserRole.MANAGER:
            return creator.id

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No manager is assigned for this completion request.",
        )

    def _get_request_or_404(self, request_id: uuid.UUID) -> TaskCompletionRequest:
        request = (
            self.db.query(TaskCompletionRequest)
            .options(
                joinedload(TaskCompletionRequest.task).joinedload(Task.project),
                joinedload(TaskCompletionRequest.requester),
                joinedload(TaskCompletionRequest.manager),
                joinedload(TaskCompletionRequest.reviewer),
            )
            .filter(TaskCompletionRequest.id == request_id)
            .first()
        )
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        return request

    def _assert_can_view(self, request: TaskCompletionRequest, actor: User) -> None:
        if actor.role in TASK_FULL_ACCESS_ROLES:
            return
        if actor.role == UserRole.MANAGER and request.manager_id == actor.id:
            report_ids = TaskService(self.db)._manager_task_user_ids(actor)
            if request.requested_by_user_id in report_ids:
                return
        if actor.role in INTERN_ROLES and request.requested_by_user_id == actor.id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _assert_can_review(self, request: TaskCompletionRequest, actor: User) -> None:
        if actor.role in TASK_FULL_ACCESS_ROLES:
            return
        if actor.role != UserRole.MANAGER or request.manager_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        report_ids = TaskService(self.db)._manager_task_user_ids(actor)
        if request.requested_by_user_id not in report_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _to_read(self, request: TaskCompletionRequest) -> TaskCompletionRequestRead:
        task = request.task or self.db.get(Task, request.task_id)
        project_title = task.project_title if task else None
        return TaskCompletionRequestRead(
            id=request.id,
            task_id=request.task_id,
            task_title=task.title if task else "",
            project_title=project_title,
            task_status=task.status if task else TaskStatus.IN_PROGRESS,
            requested_by_user_id=request.requested_by_user_id,
            requested_by_name=request.requester.full_name if request.requester else None,
            manager_id=request.manager_id,
            manager_name=request.manager.full_name if request.manager else None,
            status=request.status,
            request_note=request.request_note,
            manager_comment=request.manager_comment,
            requested_at=request.requested_at,
            reviewed_at=request.reviewed_at,
            reviewed_by_user_id=request.reviewed_by_user_id,
            reviewed_by_name=request.reviewer.full_name if request.reviewer else None,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )

    def _notify_manager(
        self, request: TaskCompletionRequest, task: Task, requester: User
    ) -> None:
        from app.services.notification_service import create_notification

        create_notification(
            self.db,
            recipient_id=request.manager_id,
            notification_type=NotificationType.SYSTEM,
            title="Task completion requested",
            body=f"{requester.full_name} requested completion approval for {task.title}.",
            related_entity_type="task_completion",
            related_entity_id=request.id,
            actor_id=requester.id,
        )

    def _notify_intern(
        self,
        request: TaskCompletionRequest,
        task: Task,
        *,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
    ) -> None:
        from app.services.notification_service import create_notification

        create_notification(
            self.db,
            recipient_id=request.requested_by_user_id,
            notification_type=notification_type,
            title=title,
            body=message,
            related_entity_type="task_completion",
            related_entity_id=request.id,
        )

    def _emit_request_created(
        self, request: TaskCompletionRequest, task: Task, requester: User
    ) -> None:
        from app.services.realtime_service import RealtimeService

        RealtimeService.emit_to_user(
            request.manager_id,
            RealtimeService.event(
                "task_completion_requested",
                {
                    "request_id": str(request.id),
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "requested_by_name": requester.full_name,
                },
                actor_id=requester.id,
                entity_type="task_completion",
                entity_id=request.id,
                route="/manager/tasks?tab=completion-requests",
            ),
        )

    def _emit_reviewed(
        self, request: TaskCompletionRequest, task: Task, actor: User, event_type: str
    ) -> None:
        from app.services.realtime_service import RealtimeService

        RealtimeService.emit_to_user(
            request.requested_by_user_id,
            RealtimeService.event(
                event_type,
                {
                    "request_id": str(request.id),
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "status": request.status.value,
                },
                actor_id=actor.id,
                entity_type="task_completion",
                entity_id=request.id,
                route="/employee/tasks",
            ),
        )
        RealtimeService.emit_task_event(
            "task_completed" if event_type == "task_completion_approved" else "task_updated",
            task_id=task.id,
            title=task.title,
            assignee_id=task.assigned_to,
            actor_id=actor.id,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
        )
