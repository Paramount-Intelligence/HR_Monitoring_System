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


# ---------------------------------------------------------------------------
# Tab-specific admin analytics
# ---------------------------------------------------------------------------

class DistributionItem(BaseModel):
    label: str
    count: int


class EmployeeRosterItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    avatar_url: str | None = None
    role: str
    department: str | None = None
    designation: str | None = None
    status: str
    today_attendance: str
    active_tasks: int
    completed_tasks: int
    logged_hours: float
    productivity_score: float | None = None
    last_active: str | None = None


class EmployeePerformanceItem(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: str | None = None
    department: str | None = None
    attendance_rate: float
    task_completion_rate: float
    average_logged_hours: float
    late_count: int
    eod_completion_rate: float | None = None
    productivity_index: float | None = None
    current_workload: int
    risk_flag: str | None = None


class UsersAnalyticsSummary(BaseModel):
    total_employees: int
    active_employees: int
    admins: int
    managers: int
    employees: int
    interns: int
    present_today: int
    late_today: int
    on_leave: int
    wfh_today: int
    new_users_this_month: int


class UsersAnalyticsDashboard(BaseModel):
    summary: UsersAnalyticsSummary
    role_distribution: list[DistributionItem]
    department_distribution: list[DistributionItem]
    attendance_rate_by_department: list[DistributionItem]
    employee_activity_trend: list[AdminAnalyticsAttendanceTrend]
    employee_roster: list[EmployeeRosterItem]
    employee_performance: list[EmployeePerformanceItem]
    recent_user_activity: list[AdminAnalyticsRecentActivity]


class CommunicationAnalyticsSummary(BaseModel):
    unread_messages: int
    active_conversations: int
    meetings_today: int
    upcoming_meetings: int
    announcements_this_week: int
    open_support_tickets: int


class MessagesByDayItem(BaseModel):
    date: str
    count: int


class RecentConversationItem(BaseModel):
    id: uuid.UUID
    title: str
    conversation_type: str
    participant_count: int
    last_message_at: str | None = None
    unread: bool


class UpcomingMeetingItem(BaseModel):
    id: uuid.UUID
    title: str
    start_at: str
    end_at: str
    status: str
    organizer_name: str
    participant_count: int


class SupportTicketSummaryItem(BaseModel):
    id: uuid.UUID
    ticket_number: int
    subject: str
    priority: str
    status: str
    created_by_name: str
    created_at: str


class CommunicationAnalyticsDashboard(BaseModel):
    summary: CommunicationAnalyticsSummary
    messages_by_day: list[MessagesByDayItem]
    meetings_by_week: list[DistributionItem]
    support_tickets_by_status: list[DistributionItem]
    recent_conversations: list[RecentConversationItem]
    upcoming_meetings: list[UpcomingMeetingItem]
    recent_announcements: list[AdminAnalyticsRecentActivity]
    support_tickets: list[SupportTicketSummaryItem]


class ProjectsTasksSummary(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    blocked_projects: int
    active_tasks: int
    overdue_tasks: int
    completed_tasks: int
    pending_tasks: int


class ProjectTableItem(BaseModel):
    id: uuid.UUID
    name: str
    owner_name: str
    team_size: int
    status: str
    progress: float
    active_tasks: int
    completed_tasks: int
    overdue_tasks: int
    deadline: str | None = None


class TaskTableItem(BaseModel):
    id: uuid.UUID
    title: str
    project_name: str | None = None
    assignee_id: uuid.UUID
    assignee_name: str
    assignee_avatar_url: str | None = None
    priority: str
    status: str
    due_date: str | None = None
    logged_minutes: int
    project_id: uuid.UUID | None = None


class ProjectsTasksAnalyticsDashboard(BaseModel):
    summary: ProjectsTasksSummary
    task_status_distribution: list[DistributionItem]
    task_priority_distribution: list[DistributionItem]
    project_progress: list[DistributionItem]
    tasks_by_department: list[DistributionItem]
    projects: list[ProjectTableItem]
    tasks: list[TaskTableItem]


# ---------------------------------------------------------------------------
# Manager Command Center analytics (team-scoped)
# ---------------------------------------------------------------------------

class ManagerOverviewKPIs(BaseModel):
    team_members: int
    present_today: int
    pending_approvals: int
    active_tasks: int
    overdue_tasks: int
    projects_in_progress: int
    eod_reports_pending: int
    team_workload: int


class ManagerTeamHealth(BaseModel):
    score: int
    label: str
    blocked_tasks: int
    overdue_tasks: int
    active_members: int


class ManagerPendingAction(BaseModel):
    title: str
    description: str
    route: str
    priority: str = "normal"


class ManagerOverviewDashboard(BaseModel):
    kpis: ManagerOverviewKPIs
    attendance_trend: list[AdminAnalyticsAttendanceTrend]
    team_health: ManagerTeamHealth
    pending_actions: list[ManagerPendingAction]
    recent_activity: list[AdminAnalyticsRecentActivity]
    members_needing_attention: list[AdminAnalyticsPeopleException]
    upcoming_meetings: list[UpcomingMeetingItem]


class ManagerTeamSummary(BaseModel):
    total_members: int
    checked_in: int
    late_today: int
    on_leave: int
    wfh_today: int
    high_workload_members: int


class ManagerTeamAnalyticsDashboard(BaseModel):
    summary: ManagerTeamSummary
    attendance_by_member: list[DistributionItem]
    workload_distribution: list[DistributionItem]
    task_completion_by_member: list[DistributionItem]
    logged_hours_trend: list[AdminAnalyticsAttendanceTrend]
    employee_roster: list[EmployeeRosterItem]
    employee_performance: list[EmployeePerformanceItem]


class ManagerApprovalsSummary(BaseModel):
    pending_leave_requests: int
    pending_wfh_requests: int
    attendance_corrections: int
    eod_reports_pending: int
    approved_this_week: int
    rejected_this_week: int


class ManagerApprovalLeaveItem(BaseModel):
    id: uuid.UUID
    requester_name: str
    requester_avatar_url: str | None = None
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    submitted_at: str
    status: str


class ManagerApprovalCorrectionItem(BaseModel):
    id: uuid.UUID
    requester_name: str
    requester_avatar_url: str | None = None
    session_date: str
    reason: str
    submitted_at: str
    status: str


class ManagerApprovalsAnalyticsDashboard(BaseModel):
    summary: ManagerApprovalsSummary
    pending_leaves: list[ManagerApprovalLeaveItem]
    pending_corrections: list[ManagerApprovalCorrectionItem]


class ManagerEodSummary(BaseModel):
    submitted_today: int
    pending_reviews: int
    average_productivity: float
    blockers_reported: int
    team_logged_hours: float
    missing_eods: int


class ManagerEodReportItem(BaseModel):
    id: uuid.UUID
    employee_name: str
    employee_avatar_url: str | None = None
    date: str
    attendance_status: str
    logged_hours: float
    productivity_score: float | None = None
    tasks_completed: int
    blockers: int
    status: str


class ManagerEodReportsAnalyticsDashboard(BaseModel):
    summary: ManagerEodSummary
    reports: list[ManagerEodReportItem]
    productivity_trend: list[DistributionItem]
    blocker_trend: list[DistributionItem]
