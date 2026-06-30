"""Dashboard aggregation routes — employee, manager, admin."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin, require_admin_or_manager, require_admin_hr
from app.core.time_utils import ensure_pk_datetime, pk_day_start, pk_now, pk_today
from app.models.alert import Alert
from app.models.announcement import Announcement
from app.models.approval import Approval
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    AlertStatus,
    ApprovalStatus,
    AttendanceSessionStatus,
    ProjectStatus,
    TaskStatus,
    TimerSessionStatus,
    TimeLogStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.project import Project
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.dashboard import (
    AdminDashboard,
    AttendanceSummary,
    EmployeeDashboard,
    ManagerDashboard,
    TaskCounts,
    TeamMemberAttendance,
    TimerState,
    AdminAnalyticsDashboard,
    AdminAnalyticsKPIs,
    AdminAnalyticsAttendanceTrend,
    AdminAnalyticsTaskStats,
    AdminAnalyticsProjectStats,
    AdminAnalyticsDeptComparison,
    AdminAnalyticsPeopleException,
    AdminAnalyticsRecentActivity,
    UsersAnalyticsDashboard,
    CommunicationAnalyticsDashboard,
    ProjectsTasksAnalyticsDashboard,
    ManagerOverviewDashboard,
    ManagerTeamAnalyticsDashboard,
    ManagerApprovalsAnalyticsDashboard,
    ManagerEodReportsAnalyticsDashboard,
)
from app.schemas.dashboard_alerts import DashboardAlertCard, DashboardAlertsResponse
from app.services.admin_dashboard_service import AdminDashboardService
from app.services.admin_user_management_service import roster_statuses_for_users
from app.services.manager_dashboard_service import ManagerDashboardService
from app.services.shift_window_service import current_shift_sessions_for_users, sessions_for_business_date

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/employee", response_model=EmployeeDashboard, summary="Employee personal dashboard")
def employee_dashboard(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> EmployeeDashboard:
    session_map = current_shift_sessions_for_users(db, [actor])
    session = session_map.get(actor.id)
    duration = None
    if session and session.check_in_at and session.check_out_at:
        delta = ensure_pk_datetime(session.check_out_at) - ensure_pk_datetime(session.check_in_at)
        duration = max(0, int(delta.total_seconds() // 60))

    attendance = AttendanceSummary(
        checked_in_today=session is not None,
        check_in_at=ensure_pk_datetime(session.check_in_at) if session else None,
        check_out_at=ensure_pk_datetime(session.check_out_at) if session else None,
        work_mode=session.work_mode if session else None,
        session_status=session.session_status if session else None,
        duration_minutes=duration,
    )

    all_tasks = db.query(Task).filter(Task.assigned_to == actor.id).all()
    today = pk_today()
    task_counts = TaskCounts(
        total=len(all_tasks),
        in_progress=sum(1 for t in all_tasks if t.status == TaskStatus.IN_PROGRESS),
        completed=sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED),
        blocked=sum(1 for t in all_tasks if t.status == TaskStatus.BLOCKED),
        overdue=sum(1 for t in all_tasks if t.due_date and t.due_date < today and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED)),
    )

    active_log = db.query(TimeLog).filter(TimeLog.user_id == actor.id, TimeLog.status == TimeLogStatus.ACTIVE).first()
    elapsed = None
    if active_log and active_log.started_at:
        started = ensure_pk_datetime(active_log.started_at)
        elapsed = max(0, int((pk_now() - started).total_seconds() // 60))

    timer = TimerState(
        active=active_log is not None,
        task_id=active_log.task_id if active_log else None,
        task_title=active_log.task.title if active_log and active_log.task else None,
        started_at=ensure_pk_datetime(active_log.started_at) if active_log else None,
        elapsed_minutes=elapsed,
    )

    due_soon = sum(
        1
        for t in all_tasks
        if t.due_date and 0 <= (t.due_date - today).days <= 2 and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED)
    )
    total_logged = sum(log.duration_minutes or 0 for log in db.query(TimeLog).filter(TimeLog.user_id == actor.id).all())

    return EmployeeDashboard(
        attendance=attendance,
        tasks=task_counts,
        timer=timer,
        attendance_status=session.session_status.value if session else "not_checked_in",
        total_time_today=duration or 0,
        productive_time_today=total_logged,
        active_timer_task_id=active_log.task_id if active_log else None,
        active_timer_task_title=active_log.task.title if active_log and active_log.task else None,
        tasks_in_progress=task_counts.in_progress,
        tasks_due_soon=due_soon,
    )


@router.get("/manager", response_model=ManagerDashboard, summary="Manager team dashboard")
def manager_dashboard(db: Session = Depends(get_db), actor: User = Depends(require_admin_or_manager)) -> ManagerDashboard:
    if actor.role == UserRole.MANAGER:
        team = db.query(User).filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE).all()
    else:
        team = db.query(User).filter(User.status == UserStatus.ACTIVE).all()

    member_ids = [m.id for m in team]
    session_map = current_shift_sessions_for_users(db, team)

    team_attendance = [
        TeamMemberAttendance(
            user_id=m.id,
            full_name=m.full_name,
            checked_in=m.id in session_map,
            work_mode=session_map[m.id].work_mode if m.id in session_map else None,
            check_in_at=ensure_pk_datetime(session_map[m.id].check_in_at) if m.id in session_map else None,
        )
        for m in team
    ]

    from app.models.leave_request import LeaveRequest
    from app.models.attendance_correction import AttendanceCorrection
    from app.models.enums import LeaveStatus, CorrectionStatus
    
    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.current_approver_id == actor.id,
        LeaveRequest.status == LeaveStatus.PENDING
    ).count()

    pending_corrections = db.query(AttendanceCorrection).join(
        AttendanceSession, AttendanceCorrection.session_id == AttendanceSession.id
    ).filter(
        AttendanceCorrection.status == CorrectionStatus.PENDING,
        AttendanceSession.user_id.in_(member_ids)
    ).count()

    pending_approvals = pending_leaves + pending_corrections

    today = pk_today()
    team_tasks = db.query(Task).filter(Task.assigned_to.in_(member_ids)).all()
    overdue = sum(1 for t in team_tasks if t.due_date and t.due_date < today and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED))
    blocked = sum(1 for t in team_tasks if t.status == TaskStatus.BLOCKED)

    return ManagerDashboard(
        team_attendance_today=team_attendance,
        pending_approvals_count=pending_approvals,
        overdue_tasks_count=overdue,
        blocked_tasks_count=blocked,
        team_members_active=sum(1 for member in team_attendance if member.checked_in),
        pending_approvals=pending_approvals,
        overdue_tasks=overdue,
        blocked_tasks=blocked,
    )


@router.get("/admin", response_model=AdminDashboard, summary="Admin org-wide dashboard")
def admin_dashboard(db: Session = Depends(get_db), actor: User = Depends(require_admin)) -> AdminDashboard:
    total_users = db.query(User).count()
    active_users_list = db.query(User).filter(User.status == UserStatus.ACTIVE).all()
    active_users = len(active_users_list)

    session_map = current_shift_sessions_for_users(db, active_users_list)
    today_sessions = list(session_map.values())

    checked_in_today = len(today_sessions)
    wfh_today = sum(1 for s in today_sessions if s.work_mode == WorkMode.WFH)
    office_today = sum(1 for s in today_sessions if s.work_mode == WorkMode.OFFICE)

    pending_approvals = db.query(Approval).filter(Approval.decision == ApprovalStatus.PENDING).count()
    open_alerts = db.query(Alert).filter(Alert.status == AlertStatus.OPEN).count()

    today = pk_today()
    all_tasks = db.query(Task).all()
    overdue = sum(1 for t in all_tasks if t.due_date and t.due_date < today and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED))

    active_projects = db.query(Project).filter(Project.project_status.in_([ProjectStatus.ACTIVE, ProjectStatus.APPROVED])).count()

    return AdminDashboard(
        total_users=total_users,
        active_users=active_users,
        checked_in_today=checked_in_today,
        wfh_today=wfh_today,
        office_today=office_today,
        pending_approvals_count=pending_approvals,
        open_alerts_count=open_alerts,
        overdue_tasks_count=overdue,
        active_projects=active_projects,
        open_alerts=open_alerts,
    )


@router.get("/alerts-summary", response_model=DashboardAlertsResponse, summary="Role dashboard alert cards")
def dashboard_alerts_summary(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> DashboardAlertsResponse:
    from app.models.eod_report import EODReport
    from app.models.task_timer_session import TaskTimerSession
    from app.services.attendance_exception_service import AttendanceExceptionService

    today = pk_today()
    cards: list[DashboardAlertCard] = []

    def add(key: str, title: str, count: int, href: str, severity: str = "normal") -> None:
        cards.append(DashboardAlertCard(key=key, title=title, count=count, href=href, severity=severity))

    if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        exceptions = AttendanceExceptionService(db).list_exceptions(actor=actor, business_date=today, status_filter="open", scope="organization")
        pending_approvals = db.query(Approval).filter(Approval.decision == ApprovalStatus.PENDING).count()
        pending_eods = db.query(EODReport).filter(EODReport.status == "Pending Approval").count()
        active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).all()
        session_map = current_shift_sessions_for_users(db, active_users)
        absent_today = max(0, len(active_users) - len(session_map))
        long_timers = db.query(TaskTimerSession).filter(TaskTimerSession.status == TimerSessionStatus.RUNNING).count()
        overdue = db.query(Task).filter(Task.due_date < today, ~Task.status.in_([TaskStatus.COMPLETED, TaskStatus.REVIEWED])).count()
        add("attendance_exceptions", "Open attendance exceptions", exceptions.summary.open, "/admin/attendance-exceptions", "high")
        add("pending_approvals", "Pending approvals", pending_approvals, "/admin/approvals", "high")
        add("eod_pending_review", "EODs pending review", pending_eods, "/admin/eod-reviews")
        add("absent_today", "Users absent today", absent_today, "/admin/attendance-exceptions?type=absent")
        add("long_running_timers", "Active timers running", long_timers, "/admin/reports?tab=time-logs")
        add("overdue_tasks", "Overdue tasks", overdue, "/admin/tasks?status=overdue", "high")
    elif actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
        team = db.query(User).filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE).all()
        team_ids = [u.id for u in team]
        exceptions = AttendanceExceptionService(db).list_exceptions(actor=actor, business_date=today, status_filter="open", scope="my_team")
        pending_eods = db.query(EODReport).filter(EODReport.user_id.in_(team_ids), EODReport.status == "Pending Approval").count() if team_ids else 0
        team_tasks = db.query(Task).filter(Task.assigned_to.in_(team_ids)).all() if team_ids else []
        overdue = sum(1 for t in team_tasks if t.due_date and t.due_date < today and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED))
        blockers = sum(1 for t in team_tasks if t.status == TaskStatus.BLOCKED)
        session_map = current_shift_sessions_for_users(db, team)
        absent_today = max(0, len(team) - len(session_map))
        long_timers = db.query(TaskTimerSession).filter(
            TaskTimerSession.user_id.in_(team_ids),
            TaskTimerSession.status == TimerSessionStatus.RUNNING,
        ).count() if team_ids else 0
        add("team_attendance_exceptions", "Team attendance exceptions", exceptions.summary.open, "/manager/attendance-exceptions", "high")
        add("pending_eod_reviews", "Pending EOD reviews", pending_eods, "/manager/eod-reviews")
        add("direct_reports_absent", "Direct reports absent", absent_today, "/manager/attendance-exceptions?type=absent")
        add("team_overdue_tasks", "Team overdue tasks", overdue, "/manager/tasks?status=overdue", "high")
        add("team_blockers", "Team blockers", blockers, "/manager/tasks?status=blocked", "high")
        add("long_running_timers", "Active timers running", long_timers, "/manager/time-logs")
    else:
        my_tasks = db.query(Task).filter(Task.assigned_to == actor.id).all()
        overdue = sum(1 for t in my_tasks if t.due_date and t.due_date < today and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED))
        due_soon = sum(1 for t in my_tasks if t.due_date and 0 <= (t.due_date - today).days <= 2 and t.status not in (TaskStatus.COMPLETED, TaskStatus.REVIEWED))
        active_timer = db.query(TimeLog).filter(TimeLog.user_id == actor.id, TimeLog.status == TimeLogStatus.ACTIVE).count()
        my_eod = db.query(EODReport).filter(EODReport.user_id == actor.id, EODReport.report_date == today).first()
        exceptions = AttendanceExceptionService(db).list_exceptions(actor=actor, business_date=today, status_filter="open", type_filter="missing_checkout")
        announcements = db.query(Announcement).count()
        add("my_eod_pending", "My EOD pending", 0 if my_eod else 1, "/employee/eod")
        add("my_overdue_tasks", "My overdue tasks", overdue, "/employee/tasks?status=overdue", "high")
        add("missing_checkout", "Missing checkout", exceptions.summary.open, "/employee/attendance", "high")
        add("active_timer", "Active timer running", active_timer, "/employee/time-logs")
        add("task_deadline_near", "Task deadline near", due_soon, "/employee/tasks")
        add("important_announcement", "Important announcement", announcements, "/employee/dashboard")

    return DashboardAlertsResponse(cards=cards)


@router.get("/admin/analytics", response_model=AdminAnalyticsDashboard, summary="Admin analytics dashboard")
def admin_analytics_dashboard(db: Session = Depends(get_db), actor: User = Depends(require_admin)) -> AdminAnalyticsDashboard:
    try:
        return AdminDashboardService(db).overview_analytics()
    except Exception as exc:
        logger.exception("admin_analytics_dashboard failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load admin analytics",
        ) from exc


@router.get("/admin/users-analytics", response_model=UsersAnalyticsDashboard, summary="Admin users tab analytics")
def admin_users_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_hr),
) -> UsersAnalyticsDashboard:
    try:
        return AdminDashboardService(db).users_analytics()
    except Exception as exc:
        logger.exception("users_analytics failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load users analytics",
        ) from exc


@router.get(
    "/admin/user-management-overview",
    response_model=UsersAnalyticsDashboard,
    summary="Admin user management overview",
)
def admin_user_management_overview(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_hr),
) -> UsersAnalyticsDashboard:
    return admin_users_analytics(db=db, actor=actor)


@router.get("/admin/communication-analytics", response_model=CommunicationAnalyticsDashboard, summary="Admin communication tab analytics")
def admin_communication_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_hr),
) -> CommunicationAnalyticsDashboard:
    try:
        return AdminDashboardService(db).communication_analytics(actor)
    except Exception as exc:
        logger.exception("communication_analytics failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load communication analytics",
        ) from exc


@router.get("/admin/projects-tasks-analytics", response_model=ProjectsTasksAnalyticsDashboard, summary="Admin projects & tasks tab analytics")
def admin_projects_tasks_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_hr),
) -> ProjectsTasksAnalyticsDashboard:
    try:
        return AdminDashboardService(db).projects_tasks_analytics()
    except Exception as exc:
        logger.exception("projects_tasks_analytics failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load projects and tasks analytics",
        ) from exc


@router.get("/manager/overview", response_model=ManagerOverviewDashboard, summary="Manager overview tab")
def manager_overview(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> ManagerOverviewDashboard:
    try:
        return ManagerDashboardService(db).overview(actor)
    except Exception as exc:
        logger.exception("manager_overview failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load manager overview") from exc


@router.get("/manager/team-analytics", response_model=ManagerTeamAnalyticsDashboard, summary="Manager team tab")
def manager_team_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> ManagerTeamAnalyticsDashboard:
    try:
        return ManagerDashboardService(db).team_analytics(actor)
    except Exception as exc:
        logger.exception("manager_team_analytics failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load team analytics") from exc


@router.get("/manager/approvals-analytics", response_model=ManagerApprovalsAnalyticsDashboard, summary="Manager approvals tab")
def manager_approvals_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> ManagerApprovalsAnalyticsDashboard:
    try:
        return ManagerDashboardService(db).approvals_analytics(actor)
    except Exception as exc:
        logger.exception("manager_approvals_analytics failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load approvals analytics") from exc


@router.get("/manager/projects-tasks-analytics", response_model=ProjectsTasksAnalyticsDashboard, summary="Manager projects & tasks tab")
def manager_projects_tasks_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> ProjectsTasksAnalyticsDashboard:
    try:
        return ManagerDashboardService(db).projects_tasks_analytics(actor)
    except Exception as exc:
        logger.exception("manager_projects_tasks_analytics failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load projects and tasks analytics") from exc


@router.get("/manager/eod-reports-analytics", response_model=ManagerEodReportsAnalyticsDashboard, summary="Manager EOD & reports tab")
def manager_eod_reports_analytics(
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> ManagerEodReportsAnalyticsDashboard:
    try:
        return ManagerDashboardService(db).eod_reports_analytics(actor)
    except Exception as exc:
        logger.exception("manager_eod_reports_analytics failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load EOD analytics") from exc
