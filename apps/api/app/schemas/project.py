"""Pydantic schemas for Project endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import ApprovalStatus, ProjectPriority, ProjectStatus


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    priority: ProjectPriority = ProjectPriority.MEDIUM
    due_date: date | None = None
    manager_id: uuid.UUID | None = None  # the manager who will approve (optional for admins)


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    priority: ProjectPriority | None = None
    due_date: date | None = None
    project_status: ProjectStatus | None = None
    manager_id: uuid.UUID | None = None


class ProjectRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    description: str | None
    owner_id: uuid.UUID
    owner_name: str | None = None
    manager_id: uuid.UUID
    manager_name: str | None = None
    priority: ProjectPriority
    approval_status: ApprovalStatus
    project_status: ProjectStatus
    due_date: date | None
    approved_at: datetime | None
    rejected_reason: str | None
    progress_percentage: float = 0.0
    created_at: datetime
    updated_at: datetime


class ProjectDecision(BaseModel):
    decision: ApprovalStatus  # approved | rejected
    reason: str | None = None
