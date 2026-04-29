"""Task routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.enums import TaskStatus
from app.models.user import User
from app.schemas.task import TaskComplexity, TaskCreate, TaskRead, TaskUpdate, TaskCommentRead, TaskCommentCreate
from app.services.task_service import TaskService

router = APIRouter()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create a task")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).create_task(payload, actor)


@router.get("", response_model=list[TaskRead], summary="List tasks (RBAC-scoped)")
def list_tasks(
    project_id: uuid.UUID | None = Query(None),
    assigned_to: uuid.UUID | None = Query(None),
    task_status: TaskStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[TaskRead]:
    return TaskService(db).list_tasks(project_id=project_id, assigned_to=assigned_to, task_status=task_status, actor=actor)


@router.get("/{task_id}", response_model=TaskRead, summary="Get task by ID")
def get_task(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).get_task(task_id, actor)


@router.patch("/{task_id}", response_model=TaskRead, summary="Update task")
def update_task(task_id: uuid.UUID, payload: TaskUpdate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).update_task(task_id, payload, actor)


@router.post("/{task_id}/complexity", response_model=TaskRead, summary="Set task complexity (manager/admin only)")
def set_complexity(task_id: uuid.UUID, payload: TaskComplexity, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).set_complexity(task_id, payload, actor)

@router.get("/{task_id}/subtasks", response_model=list[TaskRead], summary="List subtasks for a task")
def list_subtasks(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TaskRead]:
    return TaskService(db).list_subtasks(task_id, actor)

@router.post("/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED, summary="Add a comment to a task")
def create_comment(task_id: uuid.UUID, payload: TaskCommentCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskCommentRead:
    return TaskService(db).create_comment(task_id, payload, actor)

@router.get("/{task_id}/comments", response_model=list[TaskCommentRead], summary="List comments for a task")
def list_comments(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TaskCommentRead]:
    return TaskService(db).list_comments(task_id, actor)
