# Re-export Base so alembic/env.py can import it from app.models
from app.models.base import Base  # noqa: F401

# Import every model so Base.metadata is fully populated before Alembic runs.
# Order matters for readability; SQLAlchemy resolves FK ordering automatically.
from app.models.user import User  # noqa: F401
from app.models.team import Team  # noqa: F401
from app.models.attendance_session import AttendanceSession  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.time_log import TimeLog  # noqa: F401
from app.models.approval import Approval  # noqa: F401
from app.models.alert import Alert  # noqa: F401
from app.models.performance_metric import PerformanceMetricDaily  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.shift import Shift  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.holiday import Holiday  # noqa: F401
from app.models.announcement import Announcement  # noqa: F401
from app.models.leave_request import LeaveRequest  # noqa: F401
from app.models.attendance_correction import AttendanceCorrection  # noqa: F401
from app.models.task_comment import TaskComment  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.achievement import Achievement  # noqa: F401
from app.models.personal_note import PersonalNote  # noqa: F401
from app.models.manager_daily_summary import ManagerDailySummary  # noqa: F401
from app.models.eod_report import EODReport  # noqa: F401
from app.models.eod_revision import EODRevision  # noqa: F401
from app.models.weekly_report import WeeklyReport  # noqa: F401
from app.models.monthly_report import MonthlyReport  # noqa: F401
from app.models.approval_step import ApprovalStep  # noqa: F401
from app.models.account_invitation import AccountInvitation  # noqa: F401
from app.models.permission import Permission, RolePermission, UserPermissionOverride  # noqa: F401
from app.models.password_reset_token import PasswordResetToken  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Team",
    "AttendanceSession",
    "Project",
    "Task",
    "TimeLog",
    "Approval",
    "Alert",
    "PerformanceMetricDaily",
    "AuditLog",
    "Shift",
    "Department",
    "Holiday",
    "Announcement",
    "LeaveRequest",
    "AttendanceCorrection",
    "TaskComment",
    "Goal",
    "Achievement",
    "PersonalNote",
    "ManagerDailySummary",
    "EODReport",
    "EODRevision",
    "WeeklyReport",
    "MonthlyReport",
    "ApprovalStep",
    "Permission",
    "RolePermission",
    "UserPermissionOverride",
    "PasswordResetToken",
]
