"""Pydantic schemas for Dashboard endpoint responses."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer

from app.models.enums import AttendanceSessionStatus, TaskStatus, WorkMode


# ---------------------------------------------------------------------------
# Shared building blocks
# ---------------------------------------------------------------------------

class AttendanceSummary(BaseModel):
    checked_in_today: bool
    check_in_at: datetime | None
    check_out_at: datetime | None
    work_mode: WorkMode | None
    session_status: AttendanceSessionStatus | None
    duration_minutes: int | None

    @field_serializer("check_in_at", "check_out_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None: return None
        if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
        else: v = v.astimezone(timezone.utc)
        return v.isoformat().replace("+00:00", "Z")


class TaskCounts(BaseModel):
    total: int
    in_progress: int
    completed: int
    blocked: int
    overdue: int


class TimerState(BaseModel):
    active: bool
    task_id: uuid.UUID | None
    task_title: str | None = None
    started_at: datetime | None
    elapsed_minutes: int | None

    @field_serializer("started_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None: return None
        if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
        else: v = v.astimezone(timezone.utc)
        return v.isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Employee dashboard
# ---------------------------------------------------------------------------

class EmployeeDashboard(BaseModel):
    attendance: AttendanceSummary
    tasks: TaskCounts
    timer: TimerState
    attendance_status: str | None = None
    total_time_today: int = 0
    productive_time_today: int = 0
    active_timer_task_id: uuid.UUID | None = None
    active_timer_task_title: str | None = None
    tasks_in_progress: int = 0
    tasks_due_soon: int = 0


# ---------------------------------------------------------------------------
# Manager dashboard
# ---------------------------------------------------------------------------

class TeamMemberAttendance(BaseModel):
    user_id: uuid.UUID
    full_name: str
    checked_in: bool
    work_mode: WorkMode | None
    check_in_at: datetime | None

    @field_serializer("check_in_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None: return None
        if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
        else: v = v.astimezone(timezone.utc)
        return v.isoformat().replace("+00:00", "Z")


class ManagerDashboard(BaseModel):
    team_attendance_today: list[TeamMemberAttendance]
    pending_approvals_count: int
    overdue_tasks_count: int
    blocked_tasks_count: int
    team_members_active: int = 0
    pending_approvals: int = 0
    overdue_tasks: int = 0
    blocked_tasks: int = 0


# ---------------------------------------------------------------------------
# Admin dashboard
# ---------------------------------------------------------------------------

class AdminDashboard(BaseModel):
    total_users: int
    active_users: int
    checked_in_today: int
    wfh_today: int
    office_today: int
    pending_approvals_count: int
    open_alerts_count: int
    overdue_tasks_count: int
    active_projects: int = 0
    open_alerts: int = 0


# ---------------------------------------------------------------------------
# Admin Analytics Dashboard
# ---------------------------------------------------------------------------

class AdminAnalyticsKPIs(BaseModel):
    total_employees: int
    total_projects: int
    pending_approvals: int
    attendance_rate: float
    checked_in_today: int
    late_today: int
    wfh_today: int

class AdminAnalyticsAttendanceTrend(BaseModel):
    date: str
    checked_in: int
    late: int
    absent: int

class AdminAnalyticsTaskStats(BaseModel):
    total: int
    completed: int
    in_progress: int
    on_hold: int
    pending: int
    rejected: int

class AdminAnalyticsProjectStats(BaseModel):
    total: int
    approved: int
    pending: int
    rejected: int
    active: int

class AdminAnalyticsDeptComparison(BaseModel):
    department_name: str
    employee_count: int
    attendance_rate: float
    completed_tasks: int
    pending_approvals: int

class AdminAnalyticsPeopleException(BaseModel):
    employee_name: str
    department_name: str
    status: str
    details: str

class AdminAnalyticsRecentActivity(BaseModel):
    title: str
    description: str
    created_at: str

class AdminAnalyticsDashboard(BaseModel):
    kpis: AdminAnalyticsKPIs
    attendance_trend: list[AdminAnalyticsAttendanceTrend]
    task_statistics: AdminAnalyticsTaskStats
    project_statistics: AdminAnalyticsProjectStats
    department_comparison: list[AdminAnalyticsDeptComparison]
    people_exceptions: list[AdminAnalyticsPeopleException]
    recent_activity: list[AdminAnalyticsRecentActivity]
