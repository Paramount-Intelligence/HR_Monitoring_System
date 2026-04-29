"""Dashboard aggregation routes — employee, manager, admin."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin, require_admin_or_manager
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
)

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
    from app.models.attendance import AttendanceSession
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
