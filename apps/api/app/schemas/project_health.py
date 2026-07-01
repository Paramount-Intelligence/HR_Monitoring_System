from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ProjectHealthSummary(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    overdue_tasks: int
    total_logged_hours: float
    active_members: int
    completion_rate: float
    risk_level: str


class ProjectHealthTask(BaseModel):
    id: uuid.UUID
    title: str
    assignee_name: str | None = None
    status: str
    due_date: date | None = None


class ProjectHealthActivity(BaseModel):
    title: str
    description: str
    created_at: datetime | None = None


class ProjectHealthMember(BaseModel):
    id: uuid.UUID
    name: str
    department: str | None = None
    active_tasks: int
    logged_hours: float


class ProjectHealthResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    summary: ProjectHealthSummary
    recent_activity: list[ProjectHealthActivity]
    members: list[ProjectHealthMember]
    overdue_tasks: list[ProjectHealthTask]
    blocked_tasks: list[ProjectHealthTask]
