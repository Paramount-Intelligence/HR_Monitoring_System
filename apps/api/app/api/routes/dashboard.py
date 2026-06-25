"""Dashboard aggregation routes — employee, manager, admin."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin, require_admin_or_manager, require_admin_hr
from app.core.time_utils import ensure_pk_datetime, pk_day_start, pk_now, pk_today
from app.models.alert import Alert
from app.models.approval import Approval
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    AlertStatus,
    ApprovalStatus,
    AttendanceSessionStatus,
    ProjectStatus,
    TaskStatus,
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
from app.services.admin_dashboard_service import AdminDashboardService
from app.services.manager_dashboard_service import ManagerDashboardService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/employee", response_model=EmployeeDashboard, summary="Employee personal dashboard")
def employee_dashboard(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> EmployeeDashboard:
    today_start = pk_day_start()

    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id == actor.id,
            AttendanceSession.check_in_at >= today_start,
        )
        .order_by(AttendanceSession.check_in_at.desc())
        .first()
    )
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
    today_start = pk_day_start()

    if actor.role == UserRole.MANAGER:
        team = db.query(User).filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE).all()
    else:
        team = db.query(User).filter(User.status == UserStatus.ACTIVE).all()

    member_ids = [m.id for m in team]

    today_sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.user_id.in_(member_ids), AttendanceSession.check_in_at >= today_start)
        .all()
    )
    session_map = {s.user_id: s for s in today_sessions}

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
    today_start = pk_day_start()

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).count()

    today_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.check_in_at >= today_start,
        AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE,
    ).all()

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


@router.get("/admin/analytics", response_model=AdminAnalyticsDashboard, summary="Admin analytics dashboard")
def admin_analytics_dashboard(db: Session = Depends(get_db), actor: User = Depends(require_admin)) -> AdminAnalyticsDashboard:
    from app.models.department import Department
    from app.models.announcement import Announcement
    from datetime import timedelta
    from sqlalchemy.orm import joinedload

    today_start = pk_day_start()
    
    # 1. KPIs
    total_employees = db.query(User).filter(User.status != UserStatus.INACTIVE).count()
    total_projects = db.query(Project).count()
    pending_approvals = db.query(Approval).filter(Approval.decision == ApprovalStatus.PENDING).count()
    
    today_sessions = (
        db.query(AttendanceSession)
        .options(joinedload(AttendanceSession.user).joinedload(User.dept))
        .filter(AttendanceSession.check_in_at >= today_start)
        .all()
    )
    checked_in_today = len(today_sessions)
    late_today = sum(1 for s in today_sessions if s.is_late_login)
    wfh_today = sum(1 for s in today_sessions if s.work_mode == WorkMode.WFH)
    attendance_rate = (checked_in_today / total_employees * 100) if total_employees > 0 else 0.0

    kpis = AdminAnalyticsKPIs(
        total_employees=total_employees,
        total_projects=total_projects,
        pending_approvals=pending_approvals,
        attendance_rate=round(attendance_rate, 1),
        checked_in_today=checked_in_today,
        late_today=late_today,
        wfh_today=wfh_today
    )

    # 2. Attendance Trend (Last 7 days)
    attendance_trend = []
    for i in range(6, -1, -1):
        target_date = pk_today() - timedelta(days=i)
        target_start = pk_day_start(target_date)
        target_end = target_start + timedelta(days=1)
        
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.check_in_at >= target_start,
            AttendanceSession.check_in_at < target_end
        ).all()
        
        checked = len(sessions)
        late = sum(1 for s in sessions if s.is_late_login)
        absent = total_employees - checked if total_employees > checked else 0
        
        attendance_trend.append(AdminAnalyticsAttendanceTrend(
            date=target_date.strftime("%Y-%m-%d"),
            checked_in=checked,
            late=late,
            absent=absent
        ))

    # 3. Task Statistics
    all_tasks = db.query(Task).all()
    task_stats = AdminAnalyticsTaskStats(
        total=len(all_tasks),
        completed=sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED),
        in_progress=sum(1 for t in all_tasks if t.status == TaskStatus.IN_PROGRESS),
        on_hold=0,  # Map to blocked or add if schema has it
        pending=sum(1 for t in all_tasks if t.status == TaskStatus.CREATED),
        rejected=sum(1 for t in all_tasks if t.status == TaskStatus.BLOCKED)
    )

    # 4. Project Statistics
    all_projects = db.query(Project).all()
    project_stats = AdminAnalyticsProjectStats(
        total=len(all_projects),
        approved=sum(1 for p in all_projects if p.project_status == ProjectStatus.APPROVED),
        pending=sum(1 for p in all_projects if p.project_status == ProjectStatus.PENDING_APPROVAL),
        rejected=sum(1 for p in all_projects if p.project_status == ProjectStatus.REJECTED),
        active=sum(1 for p in all_projects if p.project_status == ProjectStatus.ACTIVE)
    )

    # 5. Department Comparison
    departments = db.query(Department).filter(Department.is_active == True).all()
    dept_comp = []
    for dept in departments:
        dept_users = db.query(User).filter(User.department_id == dept.id, User.status == UserStatus.ACTIVE).all()
        user_ids = [u.id for u in dept_users]
        if not user_ids:
            continue
            
        dept_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.user_id.in_(user_ids),
            AttendanceSession.check_in_at >= today_start
        ).count()
        
        dept_att_rate = (dept_sessions / len(dept_users) * 100) if len(dept_users) > 0 else 0.0
        dept_comp.append(AdminAnalyticsDeptComparison(
            department_name=dept.name,
            employee_count=len(dept_users),
            attendance_rate=round(dept_att_rate, 1),
            completed_tasks=sum(1 for t in all_tasks if t.assigned_to in user_ids and t.status == TaskStatus.COMPLETED),
            pending_approvals=0  # Approximation
        ))

    # 6. People Exceptions (Late or Absent)
    exceptions = []
    checked_in_user_ids = {s.user_id for s in today_sessions}
    late_sessions = [s for s in today_sessions if s.is_late_login]
    
    # Add late
    for s in late_sessions:
        if s.user:
            dept_name = s.user.department_name or "No Department"
            exceptions.append(AdminAnalyticsPeopleException(
                employee_name=s.user.full_name,
                department_name=dept_name,
                status="Late",
                details="Checked in late today"
            ))
            
    # Add absent (active users not in today_sessions)
    active_users_list = (
        db.query(User)
        .options(joinedload(User.dept))
        .filter(User.status == UserStatus.ACTIVE)
        .all()
    )
    for u in active_users_list:
        if u.id not in checked_in_user_ids:
            dept_name = u.department_name or "No Department"
            exceptions.append(AdminAnalyticsPeopleException(
                employee_name=u.full_name,
                department_name=dept_name,
                status="Absent",
                details="Has not checked in today"
            ))

    # 7. Recent Activity (Mix of Alerts and Announcements)
    recent = []
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(3).all()
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(2).all()
    
    for a in alerts:
        recent.append(AdminAnalyticsRecentActivity(
            title=f"Alert: {a.title}",
            description=a.message,
            created_at=a.created_at.isoformat().replace("+00:00", "Z") if a.created_at else ""
        ))
    for ann in announcements:
        recent.append(AdminAnalyticsRecentActivity(
            title=f"Announcement: {ann.title}",
            description=ann.content,
            created_at=ann.created_at.isoformat().replace("+00:00", "Z") if ann.created_at else ""
        ))
        
    recent.sort(key=lambda x: x.created_at, reverse=True)

    return AdminAnalyticsDashboard(
        kpis=kpis,
        attendance_trend=attendance_trend,
        task_statistics=task_stats,
        project_statistics=project_stats,
        department_comparison=dept_comp,
        people_exceptions=exceptions[:15],  # Limit to top 15
        recent_activity=recent[:5]
    )


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
