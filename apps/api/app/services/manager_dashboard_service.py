"""Manager Command Center analytics — scoped to manager's direct reports."""
from __future__ import annotations

import logging
from datetime import timedelta

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import ensure_pk_datetime, pk_day_start, pk_now, pk_today
from app.models.attendance_correction import AttendanceCorrection
from app.models.attendance_session import AttendanceSession
from app.models.eod_report import EODReport
from app.models.enums import (
    CorrectionStatus,
    LeaveStatus,
    LeaveType,
    ProjectStatus,
    TaskStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.leave_request import LeaveRequest
from app.models.meetings import Meeting, MeetingParticipant
from app.models.project import Project
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.dashboard import (
    AdminAnalyticsAttendanceTrend,
    AdminAnalyticsPeopleException,
    AdminAnalyticsRecentActivity,
    DistributionItem,
    EmployeePerformanceItem,
    EmployeeRosterItem,
    ManagerApprovalCorrectionItem,
    ManagerApprovalLeaveItem,
    ManagerApprovalsAnalyticsDashboard,
    ManagerApprovalsSummary,
    ManagerEodReportItem,
    ManagerEodReportsAnalyticsDashboard,
    ManagerEodSummary,
    ManagerOverviewDashboard,
    ManagerOverviewKPIs,
    ManagerPendingAction,
    ManagerTeamAnalyticsDashboard,
    ManagerTeamHealth,
    ManagerTeamSummary,
    ProjectTableItem,
    ProjectsTasksAnalyticsDashboard,
    ProjectsTasksSummary,
    TaskTableItem,
    UpcomingMeetingItem,
)

logger = logging.getLogger(__name__)

CLOSED_TASK_STATUSES = (TaskStatus.COMPLETED, TaskStatus.REVIEWED)


def _serialize_dt(dt) -> str | None:
    if dt is None:
        return None
    v = ensure_pk_datetime(dt)
    return v.isoformat() if v else None


def _is_open_task(status: TaskStatus) -> bool:
    return status not in CLOSED_TASK_STATUSES


def _is_overdue_task(task: Task, today) -> bool:
    return bool(task.due_date and task.due_date < today and _is_open_task(task.status))


class ManagerDashboardService:
    def __init__(self, db: Session):
        self.db = db

    def _team_members(self, actor: User) -> list[User]:
        if actor.role == UserRole.MANAGER:
            direct = (
                self.db.query(User)
                .options(joinedload(User.dept))
                .filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE)
                .all()
            )
            if direct:
                return direct
            if actor.department_id:
                return (
                    self.db.query(User)
                    .options(joinedload(User.dept))
                    .filter(
                        User.department_id == actor.department_id,
                        User.status == UserStatus.ACTIVE,
                        User.id != actor.id,
                    )
                    .all()
                )
            return []
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            return (
                self.db.query(User)
                .options(joinedload(User.dept))
                .filter(User.status == UserStatus.ACTIVE)
                .all()
            )
        return []

    def _member_ids(self, actor: User) -> list:
        return [m.id for m in self._team_members(actor)]

    def _today_sessions_map(self, member_ids: list, today_start) -> dict:
        if not member_ids:
            return {}
        sessions = (
            self.db.query(AttendanceSession)
            .filter(
                AttendanceSession.user_id.in_(member_ids),
                AttendanceSession.check_in_at >= today_start,
            )
            .all()
        )
        return {s.user_id: s for s in sessions}

    def _task_counts_by_user(self, member_ids: list) -> dict:
        if not member_ids:
            return {}
        open_statuses = [
            TaskStatus.CREATED,
            TaskStatus.APPROVED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.REOPENED,
        ]
        rows = (
            self.db.query(
                Task.assigned_to,
                func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)).label("completed"),
                func.sum(case((Task.status.in_(open_statuses), 1), else_=0)).label("active"),
            )
            .filter(Task.assigned_to.in_(member_ids))
            .group_by(Task.assigned_to)
            .all()
        )
        return {
            row[0]: {
                "active": int(row.active or 0),
                "completed": int(row.completed or 0),
            }
            for row in rows
        }

    def _logged_hours_by_user(self, member_ids: list, days: int = 30) -> dict:
        if not member_ids:
            return {}
        since = pk_day_start(pk_today() - timedelta(days=days))
        rows = (
            self.db.query(
                TimeLog.user_id,
                func.coalesce(func.sum(TimeLog.duration_minutes), 0).label("mins"),
            )
            .filter(TimeLog.user_id.in_(member_ids), TimeLog.started_at >= since)
            .group_by(TimeLog.user_id)
            .all()
        )
        return {r[0]: round(float(r[1] or 0) / 60, 1) for r in rows}

    def overview(self, actor: User) -> ManagerOverviewDashboard:
        team = self._team_members(actor)
        member_ids = [m.id for m in team]
        today_start = pk_day_start()
        today = pk_today()
        session_map = self._today_sessions_map(member_ids, today_start)

        present = sum(1 for uid in member_ids if uid in session_map)
        late = sum(
            1 for uid in member_ids if uid in session_map and session_map[uid].is_late_login
        )
        wfh = sum(
            1
            for uid in member_ids
            if uid in session_map and session_map[uid].work_mode == WorkMode.WFH
        )

        pending_leaves = (
            self.db.query(LeaveRequest)
            .filter(
                LeaveRequest.current_approver_id == actor.id,
                LeaveRequest.status == LeaveStatus.PENDING,
            )
            .count()
        )
        pending_corrections = (
            self.db.query(AttendanceCorrection)
            .join(AttendanceSession, AttendanceCorrection.session_id == AttendanceSession.id)
            .filter(
                AttendanceCorrection.status == CorrectionStatus.PENDING,
                AttendanceSession.user_id.in_(member_ids) if member_ids else False,
            )
            .count()
            if member_ids
            else 0
        )
        pending_approvals = pending_leaves + pending_corrections

        team_tasks = (
            self.db.query(Task).filter(Task.assigned_to.in_(member_ids)).all()
            if member_ids
            else []
        )
        active_tasks = sum(1 for t in team_tasks if _is_open_task(t.status))
        overdue_tasks = sum(1 for t in team_tasks if _is_overdue_task(t, today))
        blocked_tasks = sum(1 for t in team_tasks if t.status == TaskStatus.BLOCKED)

        managed_projects = (
            self.db.query(Project)
            .filter(
                or_(Project.manager_id == actor.id, Project.owner_id == actor.id),
                Project.project_status.in_([ProjectStatus.ACTIVE, ProjectStatus.APPROVED]),
            )
            .count()
        )

        pending_eods = (
            self.db.query(EODReport)
            .filter(
                EODReport.user_id.in_(member_ids),
                EODReport.status == "Pending Approval",
            )
            .count()
            if member_ids
            else 0
        )

        team_workload = sum(
            1
            for t in team_tasks
            if t.status in (TaskStatus.IN_PROGRESS, TaskStatus.CREATED, TaskStatus.APPROVED)
        )

        kpis = ManagerOverviewKPIs(
            team_members=len(team),
            present_today=present,
            pending_approvals=pending_approvals,
            active_tasks=active_tasks,
            overdue_tasks=overdue_tasks,
            projects_in_progress=managed_projects,
            eod_reports_pending=pending_eods,
            team_workload=team_workload,
        )

        attendance_trend = []
        for i in range(6, -1, -1):
            target_date = pk_today() - timedelta(days=i)
            target_start = pk_day_start(target_date)
            target_end = target_start + timedelta(days=1)
            sessions = (
                self.db.query(AttendanceSession)
                .filter(
                    AttendanceSession.user_id.in_(member_ids),
                    AttendanceSession.check_in_at >= target_start,
                    AttendanceSession.check_in_at < target_end,
                )
                .all()
                if member_ids
                else []
            )
            checked = len(sessions)
            late_count = sum(1 for s in sessions if s.is_late_login)
            absent = max(0, len(team) - checked)
            attendance_trend.append(
                AdminAnalyticsAttendanceTrend(
                    date=target_date.strftime("%Y-%m-%d"),
                    checked_in=checked,
                    late=late_count,
                    absent=absent,
                )
            )

        health_deduction = min(50, (blocked_tasks * 10) + (overdue_tasks * 5))
        health_score = max(0, 100 - health_deduction)
        health_label = (
            "Excellent"
            if health_score >= 80
            else "Good"
            if health_score >= 60
            else "Fair"
            if health_score >= 40
            else "At Risk"
        )
        team_health = ManagerTeamHealth(
            score=health_score,
            label=health_label,
            blocked_tasks=blocked_tasks,
            overdue_tasks=overdue_tasks,
            active_members=present,
        )

        pending_actions: list[ManagerPendingAction] = []
        if pending_leaves:
            pending_actions.append(
                ManagerPendingAction(
                    title="Leave requests pending",
                    description=f"{pending_leaves} request(s) awaiting review",
                    route="/manager/approvals",
                    priority="high",
                )
            )
        if pending_corrections:
            pending_actions.append(
                ManagerPendingAction(
                    title="Attendance corrections",
                    description=f"{pending_corrections} correction(s) pending",
                    route="/manager/approvals",
                    priority="normal",
                )
            )
        if pending_eods:
            pending_actions.append(
                ManagerPendingAction(
                    title="EOD reviews pending",
                    description=f"{pending_eods} report(s) to review",
                    route="/manager/eod-reviews",
                    priority="normal",
                )
            )
        if overdue_tasks:
            pending_actions.append(
                ManagerPendingAction(
                    title="Overdue team tasks",
                    description=f"{overdue_tasks} task(s) past due date",
                    route="/manager/tasks",
                    priority="high",
                )
            )

        recent_activity: list[AdminAnalyticsRecentActivity] = []
        user_map = {m.id: m for m in team}
        recent_eods = (
            self.db.query(EODReport)
            .filter(EODReport.user_id.in_(member_ids))
            .order_by(EODReport.updated_at.desc())
            .limit(5)
            .all()
            if member_ids
            else []
        )
        for eod in recent_eods:
            u = user_map.get(eod.user_id)
            name = u.full_name if u else "Team member"
            recent_activity.append(
                AdminAnalyticsRecentActivity(
                    title=f"EOD: {name}",
                    description=f"Status: {eod.status}",
                    created_at=_serialize_dt(eod.updated_at) or "",
                )
            )

        members_needing_attention: list[AdminAnalyticsPeopleException] = []
        for m in team:
            if m.id not in session_map:
                dept = m.department_name or "No Department"
                members_needing_attention.append(
                    AdminAnalyticsPeopleException(
                        employee_name=m.full_name,
                        department_name=dept,
                        status="Absent",
                        details="Has not checked in today",
                    )
                )
            elif session_map[m.id].is_late_login:
                members_needing_attention.append(
                    AdminAnalyticsPeopleException(
                        employee_name=m.full_name,
                        department_name=m.department_name or "No Department",
                        status="Late",
                        details="Checked in late today",
                    )
                )

        upcoming_meetings: list[UpcomingMeetingItem] = []
        now = pk_now()
        parts = (
            self.db.query(MeetingParticipant)
            .options(joinedload(MeetingParticipant.meeting).joinedload(Meeting.organizer))
            .filter(MeetingParticipant.user_id == actor.id)
            .all()
        )
        seen_meeting_ids = set()
        for part in parts:
            meeting = part.meeting
            if not meeting or meeting.id in seen_meeting_ids:
                continue
            if meeting.start_at and ensure_pk_datetime(meeting.start_at) >= now:
                seen_meeting_ids.add(meeting.id)
                p_count = (
                    self.db.query(MeetingParticipant)
                    .filter(MeetingParticipant.meeting_id == meeting.id)
                    .count()
                )
                upcoming_meetings.append(
                    UpcomingMeetingItem(
                        id=meeting.id,
                        title=meeting.title,
                        start_at=_serialize_dt(meeting.start_at) or "",
                        end_at=_serialize_dt(meeting.end_at) or "",
                        status=meeting.status or "scheduled",
                        organizer_name=meeting.organizer.full_name if meeting.organizer else "Organizer",
                        participant_count=p_count,
                    )
                )
        upcoming_meetings.sort(key=lambda x: x.start_at)
        upcoming_meetings = upcoming_meetings[:5]

        return ManagerOverviewDashboard(
            kpis=kpis,
            attendance_trend=attendance_trend,
            team_health=team_health,
            pending_actions=pending_actions,
            recent_activity=recent_activity,
            members_needing_attention=members_needing_attention[:10],
            upcoming_meetings=upcoming_meetings,
        )

    def team_analytics(self, actor: User) -> ManagerTeamAnalyticsDashboard:
        team = self._team_members(actor)
        member_ids = [m.id for m in team]
        today_start = pk_day_start()
        session_map = self._today_sessions_map(member_ids, today_start)
        task_counts = self._task_counts_by_user(member_ids)
        logged_hours = self._logged_hours_by_user(member_ids)

        checked_in = len(session_map)
        late_today = sum(1 for s in session_map.values() if s.is_late_login)
        wfh_today = sum(1 for s in session_map.values() if s.work_mode == WorkMode.WFH)

        high_workload = sum(
            1 for uid in member_ids if task_counts.get(uid, {}).get("active", 0) >= 5
        )

        summary = ManagerTeamSummary(
            total_members=len(team),
            checked_in=checked_in,
            late_today=late_today,
            on_leave=0,
            wfh_today=wfh_today,
            high_workload_members=high_workload,
        )

        attendance_by_member = [
            DistributionItem(label=m.full_name, count=1 if m.id in session_map else 0)
            for m in team[:20]
        ]
        workload_distribution = [
            DistributionItem(
                label=m.full_name,
                count=task_counts.get(m.id, {}).get("active", 0),
            )
            for m in team[:20]
        ]
        task_completion_by_member = [
            DistributionItem(
                label=m.full_name,
                count=task_counts.get(m.id, {}).get("completed", 0),
            )
            for m in team[:20]
        ]

        logged_hours_trend = []
        for i in range(6, -1, -1):
            target_date = pk_today() - timedelta(days=i)
            target_start = pk_day_start(target_date)
            target_end = target_start + timedelta(days=1)
            mins = (
                self.db.query(func.coalesce(func.sum(TimeLog.duration_minutes), 0))
                .filter(
                    TimeLog.user_id.in_(member_ids),
                    TimeLog.started_at >= target_start,
                    TimeLog.started_at < target_end,
                )
                .scalar()
                if member_ids
                else 0
            )
            logged_hours_trend.append(
                AdminAnalyticsAttendanceTrend(
                    date=target_date.strftime("%Y-%m-%d"),
                    checked_in=int(mins or 0),
                    late=0,
                    absent=0,
                )
            )

        roster: list[EmployeeRosterItem] = []
        for m in team:
            sess = session_map.get(m.id)
            today_att = "Present" if sess else "Absent"
            if sess and sess.is_late_login:
                today_att = "Late"
            tc = task_counts.get(m.id, {})
            roster.append(
                EmployeeRosterItem(
                    id=m.id,
                    full_name=m.full_name,
                    email=m.email,
                    avatar_url=m.avatar_url,
                    role=m.role.value if hasattr(m.role, "value") else str(m.role),
                    department=m.department_name,
                    designation=m.designation,
                    status=m.status.value if hasattr(m.status, "value") else str(m.status),
                    today_attendance=today_att,
                    active_tasks=tc.get("active", 0),
                    completed_tasks=tc.get("completed", 0),
                    logged_hours=logged_hours.get(m.id, 0.0),
                    productivity_score=None,
                    last_active=_serialize_dt(sess.check_in_at) if sess else None,
                )
            )

        performance: list[EmployeePerformanceItem] = []
        for m in team[:15]:
            tc = task_counts.get(m.id, {"active": 0, "completed": 0})
            total = tc.get("active", 0) + tc.get("completed", 0)
            completion_rate = round((tc.get("completed", 0) / total * 100), 1) if total else 0.0
            performance.append(
                EmployeePerformanceItem(
                    id=m.id,
                    full_name=m.full_name,
                    avatar_url=m.avatar_url,
                    department=m.department_name,
                    attendance_rate=100.0 if m.id in session_map else 0.0,
                    task_completion_rate=completion_rate,
                    average_logged_hours=logged_hours.get(m.id, 0.0),
                    late_count=1 if m.id in session_map and session_map[m.id].is_late_login else 0,
                    eod_completion_rate=None,
                    productivity_index=None,
                    current_workload=tc.get("active", 0),
                    risk_flag="High workload" if tc.get("active", 0) >= 5 else None,
                )
            )

        return ManagerTeamAnalyticsDashboard(
            summary=summary,
            attendance_by_member=attendance_by_member,
            workload_distribution=workload_distribution,
            task_completion_by_member=task_completion_by_member,
            logged_hours_trend=logged_hours_trend,
            employee_roster=roster,
            employee_performance=performance,
        )

    def approvals_analytics(self, actor: User) -> ManagerApprovalsAnalyticsDashboard:
        member_ids = self._member_ids(actor)
        week_start = pk_day_start(pk_today() - timedelta(days=7))

        pending_leaves_q = (
            self.db.query(LeaveRequest)
            .options(joinedload(LeaveRequest.user))
            .filter(
                LeaveRequest.current_approver_id == actor.id,
                LeaveRequest.status == LeaveStatus.PENDING,
            )
        )
        pending_leaves_list = pending_leaves_q.all()
        pending_wfh = sum(
            1
            for lr in pending_leaves_list
            if lr.leave_type == LeaveType.WFH or getattr(lr.leave_type, "value", "") == "wfh"
        )
        pending_leave_count = len(pending_leaves_list) - pending_wfh

        pending_corrections_q = (
            self.db.query(AttendanceCorrection)
            .join(AttendanceSession, AttendanceCorrection.session_id == AttendanceSession.id)
            .filter(
                AttendanceCorrection.status == CorrectionStatus.PENDING,
                AttendanceSession.user_id.in_(member_ids),
            )
            if member_ids
            else self.db.query(AttendanceCorrection).filter(False)
        )
        pending_corrections_list = pending_corrections_q.all()
        user_map = {m.id: m for m in self._team_members(actor)}

        pending_eods = (
            self.db.query(EODReport)
            .filter(
                EODReport.user_id.in_(member_ids),
                EODReport.status == "Pending Approval",
            )
            .count()
            if member_ids
            else 0
        )

        approved_week = (
            self.db.query(LeaveRequest)
            .filter(
                LeaveRequest.current_approver_id == actor.id,
                LeaveRequest.status == LeaveStatus.APPROVED,
                LeaveRequest.updated_at >= week_start,
            )
            .count()
        )
        rejected_week = (
            self.db.query(LeaveRequest)
            .filter(
                LeaveRequest.current_approver_id == actor.id,
                LeaveRequest.status == LeaveStatus.REJECTED,
                LeaveRequest.updated_at >= week_start,
            )
            .count()
        )

        summary = ManagerApprovalsSummary(
            pending_leave_requests=pending_leave_count,
            pending_wfh_requests=pending_wfh,
            attendance_corrections=len(pending_corrections_list),
            eod_reports_pending=pending_eods,
            approved_this_week=approved_week,
            rejected_this_week=rejected_week,
        )

        leave_items = []
        for lr in pending_leaves_list:
            user = lr.user
            leave_items.append(
                ManagerApprovalLeaveItem(
                    id=lr.id,
                    requester_name=user.full_name if user else "Team member",
                    requester_avatar_url=user.avatar_url if user else None,
                    leave_type=lr.leave_type.value if hasattr(lr.leave_type, "value") else str(lr.leave_type),
                    start_date=lr.start_date.isoformat() if lr.start_date else "",
                    end_date=lr.end_date.isoformat() if lr.end_date else "",
                    reason=(lr.reason or "").strip(),
                    submitted_at=_serialize_dt(lr.created_at) or "",
                    status=lr.status.value if hasattr(lr.status, "value") else str(lr.status),
                )
            )

        correction_items = []
        for corr in pending_corrections_list:
            user = user_map.get(corr.user_id)
            session = self.db.get(AttendanceSession, corr.session_id) if corr.session_id else None
            correction_items.append(
                ManagerApprovalCorrectionItem(
                    id=corr.id,
                    requester_name=user.full_name if user else "Team member",
                    requester_avatar_url=user.avatar_url if user else None,
                    session_date=_serialize_dt(session.check_in_at)[:10] if session and session.check_in_at else "",
                    reason=(corr.reason or "").strip(),
                    submitted_at=_serialize_dt(corr.created_at) or "",
                    status=corr.status.value if hasattr(corr.status, "value") else str(corr.status),
                )
            )

        return ManagerApprovalsAnalyticsDashboard(
            summary=summary,
            pending_leaves=leave_items,
            pending_corrections=correction_items,
        )

    def projects_tasks_analytics(self, actor: User) -> ProjectsTasksAnalyticsDashboard:
        member_ids = self._member_ids(actor)
        today = pk_today()

        if actor.role == UserRole.MANAGER:
            projects = (
                self.db.query(Project)
                .filter(
                    or_(
                        Project.manager_id == actor.id,
                        Project.owner_id == actor.id,
                    )
                )
                .all()
            )
        else:
            projects = self.db.query(Project).all()

        manager_map = {
            u.id: u
            for u in self.db.query(User)
            .filter(User.id.in_({p.manager_id for p in projects}))
            .all()
        }

        project_ids = [p.id for p in projects]
        all_tasks = (
            self.db.query(Task)
            .options(joinedload(Task.assignee), joinedload(Task.project))
            .filter(
                or_(
                    Task.assigned_to.in_(member_ids),
                    Task.project_id.in_(project_ids),
                )
            )
            .all()
            if member_ids or project_ids
            else []
        )

        active_projects = sum(
            1 for p in projects if p.project_status in (ProjectStatus.ACTIVE, ProjectStatus.APPROVED)
        )
        blocked_projects = sum(1 for p in projects if p.project_status == ProjectStatus.ON_HOLD)
        completed_projects = sum(1 for p in projects if p.project_status == ProjectStatus.COMPLETED)

        active_tasks = sum(1 for t in all_tasks if _is_open_task(t.status))
        overdue_tasks = sum(1 for t in all_tasks if _is_overdue_task(t, today))
        completed_tasks = sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED)
        pending_tasks = sum(1 for t in all_tasks if t.status == TaskStatus.CREATED)

        summary = ProjectsTasksSummary(
            total_projects=len(projects),
            active_projects=active_projects,
            completed_projects=completed_projects,
            blocked_projects=blocked_projects,
            active_tasks=active_tasks,
            overdue_tasks=overdue_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
        )

        status_dist: dict[str, int] = {}
        priority_dist: dict[str, int] = {}
        for t in all_tasks:
            st = t.status.value if hasattr(t.status, "value") else str(t.status)
            status_dist[st] = status_dist.get(st, 0) + 1
            pr = t.priority.value if hasattr(t.priority, "value") else str(t.priority)
            priority_dist[pr] = priority_dist.get(pr, 0) + 1

        project_table: list[ProjectTableItem] = []
        for p in projects[:30]:
            p_tasks = [t for t in all_tasks if t.project_id == p.id]
            mgr = manager_map.get(p.manager_id)
            project_table.append(
                ProjectTableItem(
                    id=p.id,
                    name=p.title,
                    owner_name=mgr.full_name if mgr else "Unassigned",
                    team_size=len({t.assigned_to for t in p_tasks}),
                    status=p.project_status.value if hasattr(p.project_status, "value") else str(p.project_status),
                    progress=round(
                        sum(1 for t in p_tasks if t.status == TaskStatus.COMPLETED)
                        / max(len(p_tasks), 1)
                        * 100,
                        1,
                    ),
                    active_tasks=sum(1 for t in p_tasks if _is_open_task(t.status)),
                    completed_tasks=sum(1 for t in p_tasks if t.status == TaskStatus.COMPLETED),
                    overdue_tasks=sum(1 for t in p_tasks if _is_overdue_task(t, today)),
                    deadline=p.due_date.isoformat() if p.due_date else None,
                )
            )

        task_table: list[TaskTableItem] = []
        for t in all_tasks[:50]:
            logged = (
                self.db.query(func.coalesce(func.sum(TimeLog.duration_minutes), 0))
                .filter(TimeLog.task_id == t.id)
                .scalar()
            )
            assignee = t.assignee
            task_table.append(
                TaskTableItem(
                    id=t.id,
                    title=t.title,
                    project_name=t.project.title if t.project else None,
                    assignee_id=t.assigned_to,
                    assignee_name=assignee.full_name if assignee else "Unassigned",
                    assignee_avatar_url=assignee.avatar_url if assignee else None,
                    priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                    status=t.status.value if hasattr(t.status, "value") else str(t.status),
                    due_date=t.due_date.isoformat() if t.due_date else None,
                    logged_minutes=int(logged or 0),
                    project_id=t.project_id,
                )
            )

        return ProjectsTasksAnalyticsDashboard(
            summary=summary,
            task_status_distribution=[DistributionItem(label=k, count=v) for k, v in status_dist.items()],
            task_priority_distribution=[DistributionItem(label=k, count=v) for k, v in priority_dist.items()],
            project_progress=[
                DistributionItem(label=p.name, count=int(p.progress)) for p in project_table[:10]
            ],
            tasks_by_department=[],
            projects=project_table,
            tasks=task_table,
        )

    def eod_reports_analytics(self, actor: User) -> ManagerEodReportsAnalyticsDashboard:
        team = self._team_members(actor)
        member_ids = [m.id for m in team]
        user_map = {m.id: m for m in team}

        reports = (
            self.db.query(EODReport)
            .filter(EODReport.user_id.in_(member_ids))
            .order_by(EODReport.report_date.desc())
            .limit(50)
            .all()
            if member_ids
            else []
        )

        today = pk_today()
        today_reports = [r for r in reports if r.report_date == today]
        pending_reviews = sum(1 for r in reports if r.status == "Pending Approval")
        productivity_scores = [
            float(r.productivity_score)
            for r in reports
            if r.productivity_score is not None
        ]
        avg_productivity = (
            round(sum(productivity_scores) / len(productivity_scores), 1)
            if productivity_scores
            else 0.0
        )
        blockers = sum(r.blocked_tasks or 0 for r in reports)
        team_hours = sum(float(r.total_hours or 0) for r in today_reports)
        missing = max(0, len(team) - len(today_reports))

        summary = ManagerEodSummary(
            submitted_today=len(today_reports),
            pending_reviews=pending_reviews,
            average_productivity=avg_productivity,
            blockers_reported=blockers,
            team_logged_hours=round(team_hours, 1),
            missing_eods=missing,
        )

        report_items: list[ManagerEodReportItem] = []
        for r in reports:
            user = user_map.get(r.user_id)
            report_items.append(
                ManagerEodReportItem(
                    id=r.id,
                    employee_name=user.full_name if user else "Team member",
                    employee_avatar_url=user.avatar_url if user else None,
                    date=r.report_date.isoformat() if r.report_date else "",
                    attendance_status=(r.highlights_summary or "—"),
                    logged_hours=float(r.total_hours or 0),
                    productivity_score=float(r.productivity_score) if r.productivity_score is not None else None,
                    tasks_completed=r.completed_tasks or 0,
                    blockers=r.blocked_tasks or 0,
                    status=r.status or "Draft",
                )
            )

        productivity_trend = [
            DistributionItem(
                label=r.report_date.strftime("%Y-%m-%d") if r.report_date else "—",
                count=int(r.productivity_score or 0),
            )
            for r in reports[:7]
            if r.productivity_score is not None
        ]
        blocker_trend = [
            DistributionItem(
                label=r.report_date.strftime("%Y-%m-%d") if r.report_date else "—",
                count=r.blocked_tasks or 0,
            )
            for r in reports[:7]
        ]

        return ManagerEodReportsAnalyticsDashboard(
            summary=summary,
            reports=report_items,
            productivity_trend=productivity_trend,
            blocker_trend=blocker_trend,
        )
