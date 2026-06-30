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


class EodAttendanceSummaryRead(BaseModel):
    work_mode: str | None = None
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    total_hours: float = 0
    status: str = "No Check-in"


class EodTaskMetricsRead(BaseModel):
    tasks_worked_on: int = 0
    completed: int = 0
    pending: int = 0
    blocked: int = 0
    key_actions: int = 0


class EodTimeLogEntryRead(BaseModel):
    id: uuid.UUID
    start_time: datetime
    end_time: datetime | None = None
    duration_seconds: int
    duration_hours: float
    source: str
    note: str | None = None
    is_active: bool = False


class EodTaskBreakdownItemRead(BaseModel):
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID | None = None
    project_name: str | None = None
    status: str
    priority: str | None = None
    completed_at: datetime | None = None
    completed_by_name: str | None = None
    total_logged_seconds: int
    total_logged_hours: float
    sessions_count: int
    time_logs: list[EodTimeLogEntryRead] = []


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
    report_date: date | None = None
    shift_window_start: datetime | None = None
    shift_window_end: datetime | None = None
    attendance_summary: EodAttendanceSummaryRead | None = None
    task_metrics: EodTaskMetricsRead | None = None
    task_breakdown: list[EodTaskBreakdownItemRead] = []
