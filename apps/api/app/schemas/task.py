"""Pydantic schemas for Task endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import ProjectPriority, TaskStatus
from app.schemas.task_completion_request import TaskCompletionRequestSummary


class TaskCreate(BaseModel):
    project_id: uuid.UUID
    assigned_to: uuid.UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    priority: ProjectPriority = ProjectPriority.MEDIUM
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    project_id: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    priority: ProjectPriority | None = None
    due_date: date | None = None
    status: TaskStatus | None = None
    blocked_reason: str | None = None


class TaskComplexity(BaseModel):
    complexity_level: int = Field(..., ge=1, le=10)
    expected_duration_minutes: int = Field(..., gt=0)


class TaskRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    project_id: uuid.UUID
    project_title: str | None = None
    assigned_to: uuid.UUID
    assigned_to_name: str | None = None
    assigned_to_role: str | None = None
    created_by: uuid.UUID
    created_by_name: str | None = None
    title: str
    description: str | None
    parent_id: uuid.UUID | None = None
    complexity_level: int | None
    expected_duration_minutes: int | None
    actual_duration_minutes: int | None
    priority: ProjectPriority
    status: TaskStatus
    blocked_reason: str | None
    due_date: date | None
    completed_at: datetime | None
    completed_by: uuid.UUID | None = None
    completed_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    pending_completion_request: TaskCompletionRequestSummary | None = None
    can_complete: bool = False
    can_update_status: bool = False
    can_start_timer: bool = False

class TaskCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)

class TaskCommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class TaskCommentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime


class TaskActivityEventRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    actor_id: uuid.UUID
    actor_name: str
    event_type: str
    old_value: str | None = None
    new_value: str | None = None
    metadata: dict | None = Field(default=None, alias="extra_metadata")
    created_at: datetime
