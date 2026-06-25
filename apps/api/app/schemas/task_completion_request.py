"""Pydantic schemas for intern task completion approval requests."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import TaskCompletionRequestStatus, TaskStatus


class TaskCompletionRequestCreate(BaseModel):
    request_note: str | None = Field(None, max_length=2000)


class TaskCompletionRequestReview(BaseModel):
    manager_comment: str | None = Field(None, max_length=2000)


class TaskCompletionRequestReject(BaseModel):
    manager_comment: str = Field(..., min_length=1, max_length=2000)


class TaskCompletionRequestSummary(BaseModel):
    """Lightweight request state embedded on task responses."""

    id: uuid.UUID
    status: TaskCompletionRequestStatus
    request_note: str | None = None
    manager_comment: str | None = None
    requested_at: datetime
    reviewed_at: datetime | None = None


class TaskCompletionRequestRead(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    task_title: str
    project_title: str | None = None
    task_status: TaskStatus
    requested_by_user_id: uuid.UUID
    requested_by_name: str | None = None
    manager_id: uuid.UUID
    manager_name: str | None = None
    status: TaskCompletionRequestStatus
    request_note: str | None = None
    manager_comment: str | None = None
    requested_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by_user_id: uuid.UUID | None = None
    reviewed_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
