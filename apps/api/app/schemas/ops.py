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


class EODSubmitRequest(BaseModel):
    report_date: date | None = None
    work_summary: str = Field(..., min_length=10, max_length=5000)
    blockers: str | None = Field(None, max_length=5000)
    next_day_plan: str | None = Field(None, max_length=5000)


class EODReportRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    date: date
    login_time: datetime | None
    logout_time: datetime | None
    work_mode: str
    total_hours: float
    logged_hours: float | None = None
    tasks_worked_on: int
    completed_tasks: int
    pending_tasks: int
    blocked_tasks: int
    duties_performed: int
    status: str
    manager_comments: str | None
    productivity_score: int
    work_summary: str | None = None
    blockers: str | None = None
    next_day_plan: str | None = None
    submitted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    attendance_status: str | None = None
    window_start: datetime | None = None
    window_end: datetime | None = None
