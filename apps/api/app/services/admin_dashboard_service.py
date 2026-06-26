"""Admin dashboard tab analytics service."""
from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import ensure_pk_datetime, pk_day_end, pk_day_start, pk_now, pk_today, PK_TIMEZONE_NAME
from app.models.announcement import Announcement
from app.models.attendance_session import AttendanceSession
from app.models.communication import Conversation, ConversationParticipant, Message
from app.models.daily_stats import DailyStats
from app.models.department import Department
from app.models.eod_report import EODReport
from app.models.alert import Alert
from app.models.approval import Approval
from app.models.enums import (
    AlertStatus,
    ApprovalStatus,
    LeaveStatus,
    LeaveType,
    ProjectStatus,
    TaskStatus,
    TicketStatus,
    TimeLogStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.leave_request import LeaveRequest
from app.models.meetings import Meeting, MeetingParticipant
from app.models.project import Project
from app.models.support import SupportTicket
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.dashboard import (
    AdminAnalyticsDashboard,
    AdminAnalyticsDeptComparison,
    AdminAnalyticsKPIs,
    AdminAnalyticsPeopleException,
    AdminAnalyticsProjectStats,
    AdminAnalyticsRecentActivity,
    AdminAnalyticsTaskStats,
    AdminAnalyticsAttendanceTrend,
    CommunicationAnalyticsDashboard,
    CommunicationAnalyticsSummary,
    DepartmentAttendanceItem,
    DistributionItem,
    EmployeePerformanceItem,
    EmployeeRosterItem,
    MessagesByDayItem,
    ProjectTableItem,
    ProjectsTasksAnalyticsDashboard,
    ProjectsTasksSummary,
    RecentConversationItem,
    SupportTicketSummaryItem,
    TaskTableItem,
    UpcomingMeetingItem,
    UsersAnalyticsDashboard,
    UsersAnalyticsSummary,
)
from app.services.admin_user_management_service import (
    approved_leaves_for_date,
    is_present_status,
    logged_hours_by_user,
    resolve_today_attendance_status,
    roster_statuses_for_users,
    serialize_dt,
    sessions_for_business_date,
    task_counts_by_user,
)


logger = logging.getLogger(__name__)


def _serialize_dt(dt) -> str | None:
    if dt is None:
        return None
    v = ensure_pk_datetime(dt)
    return v.isoformat() if v else None


CLOSED_TASK_STATUSES = (TaskStatus.COMPLETED, TaskStatus.REVIEWED)
MAX_EMPLOYEE_PERFORMANCE_ROWS = 100


def _is_open_task(status: TaskStatus) -> bool:
    return status not in CLOSED_TASK_STATUSES


def _is_overdue_task(task: Task, today) -> bool:
    return bool(
        task.due_date
        and task.due_date < today
        and _is_open_task(task.status)
    )


def _project_progress_from_tasks(tasks: list[Task]) -> float:
    if not tasks:
        return 0.0
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    return round((completed / len(tasks)) * 100, 2)


def _attendance_trend_bulk(
    db: Session,
    *,
    active_user_count: int,
    days: int = 7,
) -> list[AdminAnalyticsAttendanceTrend]:
    """Build attendance trend from bulk session/leave queries (no per-user roster loop)."""
    from collections import defaultdict

    today = pk_today()
    range_start = today - timedelta(days=days - 1)
    sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.check_in_at >= pk_day_start(range_start),
            AttendanceSession.check_in_at < pk_day_end(today),
        )
        .all()
    )

    by_date_user: dict[date, dict[uuid.UUID, AttendanceSession]] = defaultdict(dict)
    for session in sessions:
        check_in = ensure_pk_datetime(session.check_in_at)
        if check_in is None:
            continue
        day = check_in.date()
        if day < range_start or day > today:
            continue
        existing = by_date_user[day].get(session.user_id)
        if existing is None or check_in > ensure_pk_datetime(existing.check_in_at):
            by_date_user[day][session.user_id] = session

    leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == LeaveStatus.APPROVED,
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= range_start,
        )
        .all()
    )

    trend: list[AdminAnalyticsAttendanceTrend] = []
    for offset in range(days - 1, -1, -1):
        target = today - timedelta(days=offset)
        day_sessions = by_date_user.get(target, {})
        wfh_leave_users = {
            leave.user_id
            for leave in leaves
            if leave.start_date <= target <= leave.end_date and leave.leave_type == LeaveType.WFH
        }
        on_leave_users = {
            leave.user_id
            for leave in leaves
            if leave.start_date <= target <= leave.end_date and leave.leave_type != LeaveType.WFH
        }
        checked_users = set(day_sessions.keys()) | wfh_leave_users
        checked = len(checked_users)
        late = sum(1 for session in day_sessions.values() if session.is_late_login)
        absent = max(0, active_user_count - checked - len(on_leave_users))
        trend.append(
            AdminAnalyticsAttendanceTrend(
                date=target.strftime("%Y-%m-%d"),
                checked_in=checked,
                late=late,
                absent=absent,
            )
        )
    return trend


def _task_stats_aggregate(db: Session) -> AdminAnalyticsTaskStats:
    row = (
        db.query(
            func.count(Task.id),
            func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)),
            func.sum(case((Task.status == TaskStatus.IN_PROGRESS, 1), else_=0)),
            func.sum(case((Task.status == TaskStatus.CREATED, 1), else_=0)),
            func.sum(case((Task.status == TaskStatus.BLOCKED, 1), else_=0)),
        )
        .one()
    )
    total, completed, in_progress, pending, rejected = row
    return AdminAnalyticsTaskStats(
        total=int(total or 0),
        completed=int(completed or 0),
        in_progress=int(in_progress or 0),
        on_hold=0,
        pending=int(pending or 0),
        rejected=int(rejected or 0),
    )


def _project_stats_aggregate(db: Session) -> AdminAnalyticsProjectStats:
    row = (
        db.query(
            func.count(Project.id),
            func.sum(case((Project.project_status == ProjectStatus.APPROVED, 1), else_=0)),
            func.sum(case((Project.project_status == ProjectStatus.PENDING_APPROVAL, 1), else_=0)),
            func.sum(case((Project.project_status == ProjectStatus.REJECTED, 1), else_=0)),
            func.sum(case((Project.project_status == ProjectStatus.ACTIVE, 1), else_=0)),
        )
        .one()
    )
    total, approved, pending, rejected, active = row
    return AdminAnalyticsProjectStats(
        total=int(total or 0),
        approved=int(approved or 0),
        pending=int(pending or 0),
        rejected=int(rejected or 0),
        active=int(active or 0),
    )


class AdminDashboardService:
    def __init__(self, db: Session):
        self.db = db

    def overview_analytics(self) -> AdminAnalyticsDashboard:
        active_roster_users = (
            self.db.query(User)
            .options(joinedload(User.dept))
            .filter(User.status == UserStatus.ACTIVE)
            .all()
        )
        active_user_count = len(active_roster_users)
        total_employees = self.db.query(User).filter(User.status != UserStatus.INACTIVE).count()
        total_projects = self.db.query(Project).count()
        pending_approvals = (
            self.db.query(Approval).filter(Approval.decision == ApprovalStatus.PENDING).count()
        )

        _, roster_statuses = roster_statuses_for_users(self.db, active_roster_users)
        checked_in_today = sum(
            1 for status in roster_statuses.values() if is_present_status(status)
        )
        late_today = sum(1 for status in roster_statuses.values() if status == "Late")
        wfh_today = sum(1 for status in roster_statuses.values() if status == "WFH")
        attendance_rate = (checked_in_today / total_employees * 100) if total_employees > 0 else 0.0

        kpis = AdminAnalyticsKPIs(
            total_employees=total_employees,
            total_projects=total_projects,
            pending_approvals=pending_approvals,
            attendance_rate=round(attendance_rate, 1),
            checked_in_today=checked_in_today,
            late_today=late_today,
            wfh_today=wfh_today,
        )

        attendance_trend = _attendance_trend_bulk(
            self.db,
            active_user_count=active_user_count,
            days=7,
        )
        task_stats = _task_stats_aggregate(self.db)
        project_stats = _project_stats_aggregate(self.db)

        completed_tasks_by_user = {
            uid: counts["completed"]
            for uid, counts in task_counts_by_user(self.db).items()
        }

        departments = self.db.query(Department).filter(Department.is_active == True).all()
        dept_comp: list[AdminAnalyticsDeptComparison] = []
        for dept in departments:
            dept_users = [user for user in active_roster_users if user.department_id == dept.id]
            if not dept_users:
                continue
            dept_present = sum(
                1
                for user in dept_users
                if is_present_status(roster_statuses.get(user.id, "Absent"))
            )
            dept_att_rate = (dept_present / len(dept_users) * 100) if dept_users else 0.0
            user_ids = {user.id for user in dept_users}
            dept_comp.append(
                AdminAnalyticsDeptComparison(
                    department_name=dept.name or "Unassigned",
                    employee_count=len(dept_users),
                    attendance_rate=round(dept_att_rate, 1),
                    completed_tasks=sum(
                        completed_tasks_by_user.get(uid, 0) for uid in user_ids
                    ),
                    pending_approvals=0,
                )
            )

        user_lookup = {user.id: user for user in active_roster_users}
        exceptions: list[AdminAnalyticsPeopleException] = []
        for user_id, status in roster_statuses.items():
            user = user_lookup.get(user_id)
            if not user:
                continue
            dept_name = user.department_name or "Unassigned"
            if status == "Late":
                exceptions.append(
                    AdminAnalyticsPeopleException(
                        employee_name=user.full_name,
                        department_name=dept_name,
                        status="Late",
                        details="Checked in late today",
                    )
                )
            elif status == "Absent":
                exceptions.append(
                    AdminAnalyticsPeopleException(
                        employee_name=user.full_name,
                        department_name=dept_name,
                        status="Absent",
                        details="Has not checked in today",
                    )
                )

        recent: list[AdminAnalyticsRecentActivity] = []
        alerts = self.db.query(Alert).order_by(Alert.created_at.desc()).limit(3).all()
        announcements = (
            self.db.query(Announcement).order_by(Announcement.created_at.desc()).limit(2).all()
        )
        for alert in alerts:
            recent.append(
                AdminAnalyticsRecentActivity(
                    title=f"Alert: {alert.title}",
                    description=alert.message or "",
                    created_at=_serialize_dt(alert.created_at) or "",
                )
            )
        for ann in announcements:
            recent.append(
                AdminAnalyticsRecentActivity(
                    title=f"Announcement: {ann.title}",
                    description=ann.content or "",
                    created_at=_serialize_dt(ann.created_at) or "",
                )
            )
        recent.sort(key=lambda item: item.created_at, reverse=True)

        return AdminAnalyticsDashboard(
            kpis=kpis,
            attendance_trend=attendance_trend,
            task_statistics=task_stats,
            project_statistics=project_stats,
            department_comparison=dept_comp,
            people_exceptions=exceptions[:15],
            recent_activity=recent[:5],
        )

    def users_analytics(self) -> UsersAnalyticsDashboard:
        try:
            return self._users_analytics_impl()
        except Exception:
            logger.exception("users_analytics impl failed")
            raise

    def _users_analytics_impl(self) -> UsersAnalyticsDashboard:
        active_users = (
            self.db.query(User)
            .options(joinedload(User.dept))
            .filter(User.status == UserStatus.ACTIVE)
            .all()
        )
        all_non_inactive = (
            self.db.query(User).filter(User.status != UserStatus.INACTIVE).all()
        )

        session_by_user, roster_statuses = roster_statuses_for_users(self.db, active_users)
        business_date = pk_today()
        month_start = business_date.replace(day=1)

        present_today = sum(
            1 for user in active_users if is_present_status(roster_statuses.get(user.id, "Absent"))
        )
        late_today = sum(
            1 for user in active_users if roster_statuses.get(user.id) == "Late"
        )
        on_leave_today = sum(
            1 for user in active_users if roster_statuses.get(user.id) == "On Leave"
        )
        wfh_today = sum(
            1 for user in active_users if roster_statuses.get(user.id) == "WFH"
        )

        role_counts = {r.value: 0 for r in UserRole}
        for user in active_users:
            role_counts[user.role.value] = role_counts.get(user.role.value, 0) + 1

        new_this_month = (
            self.db.query(User)
            .filter(User.created_at >= pk_day_start(month_start))
            .count()
        )

        summary = UsersAnalyticsSummary(
            total_employees=len(all_non_inactive),
            active_employees=len(active_users),
            admins=role_counts.get(UserRole.ADMIN.value, 0)
            + role_counts.get(UserRole.HR_OPERATIONS.value, 0),
            managers=role_counts.get(UserRole.MANAGER.value, 0)
            + role_counts.get(UserRole.TEAM_LEAD.value, 0),
            employees=role_counts.get(UserRole.EMPLOYEE.value, 0)
            + role_counts.get(UserRole.JUNIOR_EMPLOYEE.value, 0),
            interns=role_counts.get(UserRole.INTERN.value, 0),
            present_today=present_today,
            late_today=late_today,
            on_leave=on_leave_today,
            wfh_today=wfh_today,
            new_users_this_month=new_this_month,
        )

        role_distribution = [
            DistributionItem(label=k.replace("_", " ").title(), count=v)
            for k, v in role_counts.items()
            if v > 0
        ]

        dept_map: dict[str, int] = {}
        for user in active_users:
            dept = user.department_name or "Unassigned"
            dept_map[dept] = dept_map.get(dept, 0) + 1
        department_distribution = [
            DistributionItem(label=k, count=v) for k, v in sorted(dept_map.items())
        ]

        attendance_rate_by_department: list[DistributionItem] = []
        attendance_by_department: list[DepartmentAttendanceItem] = []
        departments = self.db.query(Department).filter(Department.is_active == True).all()
        for dept in departments:
            dept_users = [user for user in active_users if user.department_id == dept.id]
            if not dept_users:
                continue
            present = sum(
                1
                for user in dept_users
                if is_present_status(roster_statuses.get(user.id, "Absent"))
            )
            late = sum(1 for user in dept_users if roster_statuses.get(user.id) == "Late")
            rate = round(present / len(dept_users) * 100) if dept_users else 0
            dept_label = dept.name or "Unassigned"
            attendance_rate_by_department.append(DistributionItem(label=dept_label, count=rate))
            attendance_by_department.append(
                DepartmentAttendanceItem(
                    department=dept_label,
                    active_users=len(dept_users),
                    present_today=present,
                    late_today=late,
                    attendance_rate=rate,
                )
            )

        employee_activity_trend = _attendance_trend_bulk(
            self.db,
            active_user_count=len(active_users),
            days=7,
        )

        tasks_by_user = task_counts_by_user(self.db)
        hours_by_user = logged_hours_by_user(self.db)

        roster = []
        for user in sorted(
            active_users,
            key=lambda item: ((item.department_name or "Unassigned").lower(), item.full_name.lower()),
        ):
            session = session_by_user.get(user.id)
            attendance = roster_statuses.get(user.id, "Unknown")
            task_counts = tasks_by_user.get(user.id, {"active": 0, "completed": 0})
            roster.append(
                EmployeeRosterItem(
                    id=user.id,
                    full_name=user.full_name or "Unknown",
                    email=user.email or "",
                    avatar_url=user.avatar_url or None,
                    role=user.role.value if hasattr(user.role, "value") else str(user.role),
                    department=user.department_name or "Unassigned",
                    designation=user.designation or "N/A",
                    status=user.status.value if hasattr(user.status, "value") else str(user.status),
                    presence_status=getattr(user, "presence_status", None) or "active",
                    today_attendance=attendance,
                    check_in_at=serialize_dt(session.check_in_at) if session else None,
                    check_out_at=serialize_dt(session.check_out_at) if session else None,
                    active_tasks=int(task_counts.get("active", 0) or 0),
                    completed_tasks=int(task_counts.get("completed", 0) or 0),
                    logged_hours=float(hours_by_user.get(user.id, 0.0) or 0.0),
                    productivity_score=None,
                    last_active=serialize_dt(user.updated_at),
                )
            )

        try:
            performance = self._build_performance(active_users)
        except Exception:
            logger.exception("employee_performance failed")
            performance = []

        try:
            recent = self._recent_user_activity(limit=8)
        except Exception:
            logger.exception("recent_user_activity failed")
            recent = []

        return UsersAnalyticsDashboard(
            business_date=business_date,
            timezone=PK_TIMEZONE_NAME,
            summary=summary,
            role_distribution=role_distribution,
            department_distribution=department_distribution,
            attendance_rate_by_department=attendance_rate_by_department,
            attendance_by_department=attendance_by_department,
            employee_activity_trend=employee_activity_trend,
            employee_roster=roster,
            employee_performance=performance,
            recent_user_activity=recent,
        )

    def _build_performance(self, active_users: list[User]) -> list[EmployeePerformanceItem]:
        today = pk_today()
        period_start = today - timedelta(days=30)
        period_start_dt = pk_day_start(period_start)

        open_statuses = [
            TaskStatus.CREATED,
            TaskStatus.APPROVED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.REOPENED,
        ]

        stats = (
            self.db.query(DailyStats)
            .filter(DailyStats.date >= period_start)
            .all()
        )
        stats_by_user: dict = {}
        for s in stats:
            if s.user_id not in stats_by_user:
                stats_by_user[s.user_id] = {"late": 0, "days": 0, "present": 0}
            stats_by_user[s.user_id]["days"] += 1
            if s.is_late_login:
                stats_by_user[s.user_id]["late"] += 1
            if not s.is_absent:
                stats_by_user[s.user_id]["present"] += 1

        eod_counts = (
            self.db.query(EODReport.user_id, func.count(EODReport.id))
            .filter(EODReport.created_at >= period_start_dt)
            .group_by(EODReport.user_id)
            .all()
        )
        eod_by_user = {uid: cnt for uid, cnt in eod_counts}

        task_rows = (
            self.db.query(
                Task.assigned_to,
                func.count(Task.id).label("total"),
                func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)).label("completed"),
                func.sum(case((Task.status.in_(open_statuses), 1), else_=0)).label("active"),
            )
            .filter(Task.assigned_to.isnot(None))
            .group_by(Task.assigned_to)
            .all()
        )
        tasks_by_user = {
            uid: {
                "total": int(total or 0),
                "completed": int(completed or 0),
                "active": int(active or 0),
            }
            for uid, total, completed, active in task_rows
        }

        log_rows = (
            self.db.query(
                TimeLog.user_id,
                func.coalesce(func.sum(TimeLog.duration_minutes), 0).label("minutes"),
                func.count(TimeLog.id).label("cnt"),
            )
            .filter(TimeLog.user_id.isnot(None), TimeLog.status != TimeLogStatus.INVALID)
            .group_by(TimeLog.user_id)
            .all()
        )
        logs_by_user = {
            uid: {"minutes": int(minutes or 0), "cnt": int(cnt or 0)}
            for uid, minutes, cnt in log_rows
        }

        overdue_rows = (
            self.db.query(Task.assigned_to, func.count(Task.id))
            .filter(
                Task.assigned_to.isnot(None),
                Task.due_date.isnot(None),
                Task.due_date < today,
                Task.status.in_(open_statuses),
            )
            .group_by(Task.assigned_to)
            .all()
        )
        overdue_by_user = {uid: cnt for uid, cnt in overdue_rows}

        items = []
        for u in active_users:
            tc = tasks_by_user.get(u.id, {"total": 0, "completed": 0, "active": 0})
            total_t = tc["total"]
            completed = tc["completed"]
            completion_rate = round(completed / total_t * 100, 1) if total_t else 0.0

            log_info = logs_by_user.get(u.id, {"minutes": 0, "cnt": 0})
            avg_hours = (
                round(log_info["minutes"] / max(log_info["cnt"], 1) / 60, 1)
                if log_info["cnt"]
                else 0.0
            )

            st = stats_by_user.get(u.id, {"late": 0, "days": 0, "present": 0})
            att_rate = (
                round(st["present"] / st["days"] * 100, 1) if st["days"] else 0.0
            )

            active_count = tc["active"]
            overdue = overdue_by_user.get(u.id, 0)

            risk = None
            if overdue >= 3 or att_rate < 50:
                risk = "High"
            elif overdue >= 1 or att_rate < 75:
                risk = "Medium"

            eod_rate = None
            if st["days"]:
                eod_rate = round(
                    min(eod_by_user.get(u.id, 0) / st["days"] * 100, 100), 1
                )

            items.append(
                EmployeePerformanceItem(
                    id=u.id,
                    full_name=u.full_name or "Unknown",
                    avatar_url=u.avatar_url or None,
                    department=u.department_name or "Unassigned",
                    attendance_rate=att_rate,
                    task_completion_rate=completion_rate,
                    average_logged_hours=avg_hours,
                    late_count=st["late"],
                    eod_completion_rate=eod_rate,
                    productivity_index=None,
                    current_workload=active_count,
                    risk_flag=risk,
                )
            )

        risk_rank = {"High": 0, "Medium": 1, None: 2}
        items.sort(
            key=lambda item: (
                risk_rank.get(item.risk_flag, 2),
                -item.late_count,
                -item.current_workload,
            )
        )
        return items[:MAX_EMPLOYEE_PERFORMANCE_ROWS]

    def _recent_user_activity(self, limit: int = 8) -> list[AdminAnalyticsRecentActivity]:
        recent_users = (
            self.db.query(User)
            .filter(User.status == UserStatus.ACTIVE)
            .order_by(User.updated_at.desc())
            .limit(limit)
            .all()
        )
        return [
            AdminAnalyticsRecentActivity(
                title=f"{u.full_name} profile updated",
                description=f"Role: {u.role.value.replace('_', ' ').title()}",
                created_at=_serialize_dt(u.updated_at) or "",
            )
            for u in recent_users
        ]

    def _conversation_type_label(self, conv: Conversation) -> str:
        conv_type = getattr(conv, "type", None)
        if conv_type is None:
            return "Conversation"
        return conv_type.value.replace("_", " ").title() if hasattr(conv_type, "value") else str(conv_type)

    def communication_analytics(self, actor: User) -> CommunicationAnalyticsDashboard:
        today_start = pk_day_start()
        now = pk_now()
        week_start = today_start - timedelta(days=today_start.weekday())

        unread_msgs = 0
        unread_convs = 0
        participants = (
            self.db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.user_id == actor.id,
                ConversationParticipant.left_at.is_(None),
            )
            .all()
        )
        for p in participants:
            last_read = p.last_read_at
            m_query = self.db.query(Message).filter(
                Message.conversation_id == p.conversation_id,
                Message.sender_id != actor.id,
                Message.is_deleted == False,  # noqa: E712
            )
            if last_read:
                m_query = m_query.filter(Message.created_at > last_read)
            conv_unread = m_query.count()
            if conv_unread > 0:
                unread_convs += 1
                unread_msgs += conv_unread

        active_conversations = (
            self.db.query(Conversation)
            .filter(Conversation.is_archived == False)  # noqa: E712
            .count()
        )

        meetings_today = (
            self.db.query(Meeting)
            .filter(
                Meeting.start_at >= today_start,
                Meeting.start_at < today_start + timedelta(days=1),
                Meeting.status == "scheduled",
            )
            .count()
        )

        upcoming_count = (
            self.db.query(Meeting)
            .filter(Meeting.start_at >= now, Meeting.status == "scheduled")
            .count()
        )

        announcements_week = (
            self.db.query(Announcement)
            .filter(Announcement.created_at >= week_start)
            .count()
        )

        open_tickets = (
            self.db.query(SupportTicket)
            .filter(
                SupportTicket.status.in_(
                    [
                        TicketStatus.OPEN,
                        TicketStatus.IN_PROGRESS,
                        TicketStatus.WAITING_FOR_USER,
                    ]
                )
            )
            .count()
        )

        summary = CommunicationAnalyticsSummary(
            unread_messages=unread_msgs,
            active_conversations=active_conversations,
            meetings_today=meetings_today,
            upcoming_meetings=upcoming_count,
            announcements_this_week=announcements_week,
            open_support_tickets=open_tickets,
        )

        try:
            messages_by_day = []
            for i in range(6, -1, -1):
                d = pk_today() - timedelta(days=i)
                d_start = pk_day_start(d)
                d_end = d_start + timedelta(days=1)
                cnt = (
                    self.db.query(Message)
                    .filter(Message.created_at >= d_start, Message.created_at < d_end)
                    .count()
                )
                messages_by_day.append(
                    MessagesByDayItem(date=d.strftime("%Y-%m-%d"), count=cnt)
                )
        except Exception:
            messages_by_day = []

        try:
            meetings_by_week = []
            for i in range(4):
                w_start = week_start - timedelta(weeks=i)
                w_end = w_start + timedelta(days=7)
                cnt = (
                    self.db.query(Meeting)
                    .filter(Meeting.start_at >= w_start, Meeting.start_at < w_end)
                    .count()
                )
                label = w_start.strftime("%b %d")
                meetings_by_week.append(DistributionItem(label=label, count=cnt))
            meetings_by_week.reverse()
        except Exception:
            meetings_by_week = []

        try:
            ticket_status_counts = (
                self.db.query(SupportTicket.status, func.count(SupportTicket.id))
                .group_by(SupportTicket.status)
                .all()
            )
            support_by_status = [
                DistributionItem(
                    label=(s.value if hasattr(s, "value") else str(s)).replace("_", " ").title(),
                    count=c,
                )
                for s, c in ticket_status_counts
            ]
        except Exception:
            support_by_status = []

        try:
            recent_conversations = self._recent_conversations(actor)
        except Exception:
            recent_conversations = []

        try:
            upcoming_meetings = self._upcoming_meetings(limit=10)
        except Exception:
            upcoming_meetings = []

        try:
            recent_announcements = self._recent_announcements(limit=5)
        except Exception:
            recent_announcements = []

        try:
            support_tickets = self._support_tickets(limit=10)
        except Exception:
            support_tickets = []

        return CommunicationAnalyticsDashboard(
            summary=summary,
            messages_by_day=messages_by_day,
            meetings_by_week=meetings_by_week,
            support_tickets_by_status=support_by_status,
            recent_conversations=recent_conversations,
            upcoming_meetings=upcoming_meetings,
            recent_announcements=recent_announcements,
            support_tickets=support_tickets,
        )

    def _recent_conversations(self, actor: User) -> list[RecentConversationItem]:
        parts = (
            self.db.query(ConversationParticipant)
            .options(joinedload(ConversationParticipant.conversation))
            .filter(
                ConversationParticipant.user_id == actor.id,
                ConversationParticipant.left_at.is_(None),
            )
            .order_by(ConversationParticipant.joined_at.desc())
            .limit(8)
            .all()
        )
        items = []
        for p in parts:
            conv = p.conversation
            if not conv:
                continue
            pcount = (
                self.db.query(ConversationParticipant)
                .filter(
                    ConversationParticipant.conversation_id == conv.id,
                    ConversationParticipant.left_at.is_(None),
                )
                .count()
            )
            items.append(
                RecentConversationItem(
                    id=conv.id,
                    title=conv.title or self._conversation_type_label(conv),
                    conversation_type=conv.type.value if hasattr(conv.type, "value") else str(conv.type),
                    participant_count=pcount,
                    last_message_at=_serialize_dt(conv.updated_at),
                    unread=False,
                )
            )
        return items

    def _upcoming_meetings(self, limit: int = 10) -> list[UpcomingMeetingItem]:
        now = pk_now()
        meetings = (
            self.db.query(Meeting)
            .options(joinedload(Meeting.organizer))
            .filter(Meeting.start_at >= now, Meeting.status == "scheduled")
            .order_by(Meeting.start_at.asc())
            .limit(limit)
            .all()
        )
        items = []
        for m in meetings:
            pcount = (
                self.db.query(MeetingParticipant)
                .filter(MeetingParticipant.meeting_id == m.id)
                .count()
            )
            items.append(
                UpcomingMeetingItem(
                    id=m.id,
                    title=m.title,
                    start_at=_serialize_dt(m.start_at) or "",
                    end_at=_serialize_dt(m.end_at) or "",
                    status=m.status,
                    organizer_name=m.organizer.full_name if m.organizer else "Unknown",
                    participant_count=pcount,
                )
            )
        return items

    def _recent_announcements(self, limit: int = 5) -> list[AdminAnalyticsRecentActivity]:
        anns = (
            self.db.query(Announcement)
            .order_by(Announcement.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            AdminAnalyticsRecentActivity(
                title=ann.title,
                description=(ann.content or "")[:200],
                created_at=_serialize_dt(ann.created_at) or "",
            )
            for ann in anns
        ]

    def _support_tickets(self, limit: int = 10) -> list[SupportTicketSummaryItem]:
        tickets = (
            self.db.query(SupportTicket)
            .options(joinedload(SupportTicket.created_by))
            .order_by(SupportTicket.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            SupportTicketSummaryItem(
                id=t.id,
                ticket_number=t.ticket_number,
                subject=t.subject,
                priority=t.priority.value,
                status=t.status.value,
                created_by_name=t.created_by.full_name if t.created_by else "Unknown",
                created_at=_serialize_dt(t.created_at) or "",
            )
            for t in tickets
        ]

    def projects_tasks_analytics(self) -> ProjectsTasksAnalyticsDashboard:
        today = pk_today()
        all_projects = self.db.query(Project).all()
        all_tasks = (
            self.db.query(Task)
            .options(joinedload(Task.assignee), joinedload(Task.project))
            .all()
        )

        active_projects = sum(
            1
            for p in all_projects
            if p.project_status in (ProjectStatus.ACTIVE, ProjectStatus.APPROVED)
        )
        completed_projects = sum(
            1 for p in all_projects if p.project_status == ProjectStatus.COMPLETED
        )
        blocked_projects = sum(
            1 for p in all_projects if p.project_status == ProjectStatus.ON_HOLD
        )

        active_tasks = sum(
            1
            for t in all_tasks
            if t.status in (TaskStatus.IN_PROGRESS, TaskStatus.CREATED)
        )
        overdue_tasks = sum(1 for t in all_tasks if _is_overdue_task(t, today))
        completed_tasks = sum(
            1 for t in all_tasks if t.status == TaskStatus.COMPLETED
        )
        pending_tasks = sum(1 for t in all_tasks if t.status == TaskStatus.CREATED)

        summary = ProjectsTasksSummary(
            total_projects=len(all_projects),
            active_projects=active_projects,
            completed_projects=completed_projects,
            blocked_projects=blocked_projects,
            active_tasks=active_tasks,
            overdue_tasks=overdue_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
        )

        status_map: dict[str, int] = {}
        for t in all_tasks:
            status_map[t.status.value] = status_map.get(t.status.value, 0) + 1
        task_status_distribution = [
            DistributionItem(label=k.replace("_", " ").title(), count=v)
            for k, v in status_map.items()
        ]

        priority_map: dict[str, int] = {}
        for t in all_tasks:
            priority_map[t.priority.value] = priority_map.get(t.priority.value, 0) + 1
        task_priority_distribution = [
            DistributionItem(label=k.title(), count=v) for k, v in priority_map.items()
        ]

        project_progress = []
        for p in all_projects[:12]:
            p_tasks = [t for t in all_tasks if t.project_id == p.id]
            project_progress.append(
                DistributionItem(label=p.title[:30], count=int(_project_progress_from_tasks(p_tasks)))
            )

        dept_task_map: dict[str, int] = {}
        for t in all_tasks:
            if t.assignee:
                dept = t.assignee.department_name or "Unassigned"
                dept_task_map[dept] = dept_task_map.get(dept, 0) + 1
        tasks_by_department = [
            DistributionItem(label=k, count=v)
            for k, v in sorted(dept_task_map.items(), key=lambda x: -x[1])[:8]
        ]

        project_items = []
        for p in all_projects:
            p_tasks = [t for t in all_tasks if t.project_id == p.id]
            active_t = sum(1 for t in p_tasks if _is_open_task(t.status))
            completed_t = sum(
                1 for t in p_tasks if t.status == TaskStatus.COMPLETED
            )
            overdue_t = sum(1 for t in p_tasks if _is_overdue_task(t, today))
            owner = self.db.get(User, p.owner_id)
            team_size = len({t.assigned_to for t in p_tasks})
            deadline = p.due_date.isoformat() if p.due_date else None
            project_items.append(
                ProjectTableItem(
                    id=p.id,
                    name=p.title,
                    owner_name=owner.full_name if owner else "Unknown",
                    team_size=team_size,
                    status=p.project_status.value,
                    progress=_project_progress_from_tasks(p_tasks),
                    active_tasks=active_t,
                    completed_tasks=completed_t,
                    overdue_tasks=overdue_t,
                    deadline=deadline,
                )
            )

        task_items = []
        for t in sorted(all_tasks, key=lambda x: (x.due_date or today))[:50]:
            logged = (
                self.db.query(func.coalesce(func.sum(TimeLog.duration_minutes), 0))
                .filter(TimeLog.task_id == t.id)
                .scalar()
                or 0
            )
            assignee = t.assignee
            task_items.append(
                TaskTableItem(
                    id=t.id,
                    title=t.title,
                    project_name=t.project.title if t.project else None,
                    assignee_id=t.assigned_to,
                    assignee_name=assignee.full_name if assignee else "Unassigned",
                    assignee_avatar_url=assignee.avatar_url if assignee else None,
                    priority=t.priority.value,
                    status=t.status.value,
                    due_date=t.due_date.isoformat() if t.due_date else None,
                    logged_minutes=int(logged),
                    project_id=t.project_id,
                )
            )

        return ProjectsTasksAnalyticsDashboard(
            summary=summary,
            task_status_distribution=task_status_distribution,
            task_priority_distribution=task_priority_distribution,
            project_progress=project_progress,
            tasks_by_department=tasks_by_department,
            projects=project_items,
            tasks=task_items,
        )
