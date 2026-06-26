"""Pydantic schemas for Report endpoints."""
from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

ReportPeriod = Literal["daily", "weekly", "monthly", "custom"]


class WeeklyReportRead(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    user_name: str
    start_date: date
    end_date: date
    total_hours: float
    late_logins: int
    early_logouts: int
    absences: int
    wfh_days: int


class MonthlyReportRead(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    user_name: str
    report_month: date
    total_hours: float
    late_logins: int
    early_logouts: int
    absences: int
    wfh_days: int
    escalated_approvals: int = 0


class TeamPerformanceSummary(BaseModel):
    team_hours: float = 0.0
    total_exceptions: int = 0
    team_absences: int = 0
    late_count: int = 0
    early_count: int = 0
    wfh_count: int = 0


class TeamPerformanceRow(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: str
    department: str | None = None
    designation: str | None = None
    avatar_url: str | None = None
    presence_status: str | None = None
    hours: float = 0.0
    late_count: int = 0
    early_count: int = 0
    wfh_count: int = 0
    absence_count: int = 0
    completed_tasks: int = 0
    tasks_worked_on: int = 0
    eod_status: str = "not_submitted"
    eod_submitted_days: int | None = None


class TeamPerformanceResponse(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    timezone: str = "Asia/Karachi"
    summary: TeamPerformanceSummary
    rows: list[TeamPerformanceRow] = Field(default_factory=list)
    total_count: int = 0
    page: int = 1
    page_size: int = 50
