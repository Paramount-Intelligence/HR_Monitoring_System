from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class DutyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class DutyUpdate(BaseModel):
    status: str | None = None
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class DutyRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class EODReviewRequest(BaseModel):
    action: str
    comments: str | None = None


class EODReportRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    date: date
    login_time: datetime | None
    logout_time: datetime | None
    work_mode: str
    total_hours: float
    tasks_worked_on: int
    completed_tasks: int
    pending_tasks: int
    blocked_tasks: int
    duties_performed: int
    status: str
    manager_comments: str | None
    productivity_score: int
    created_at: datetime
    updated_at: datetime
