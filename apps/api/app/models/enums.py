import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HR_OPERATIONS = "hr_operations"
    MANAGER = "manager"
    TEAM_LEAD = "team_lead"
    EMPLOYEE = "employee"
    INTERN = "intern"
    JUNIOR_EMPLOYEE = "junior_employee"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    INVITED = "invited"


class WorkMode(str, enum.Enum):
    OFFICE = "office"
    WFH = "wfh"


class AttendanceSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    INCOMPLETE = "incomplete"
    CORRECTED = "corrected"


class TimerSessionStatus(str, enum.Enum):
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"


class TimerPauseReason(str, enum.Enum):
    MANUAL = "manual_pause"
    ATTENDANCE_CHECKOUT = "attendance_checkout"
    SYSTEM = "system"


class ProjectPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    CANCELLED = "cancelled"
    NEEDS_CLARIFICATION = "needs_clarification"


class ApprovalAction(str, enum.Enum):
    CREATED = "created"
    CLARIFIED = "clarified"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    CANCELLED = "cancelled"


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class TaskStatus(str, enum.Enum):
    CREATED = "created"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    REVIEWED = "reviewed"
    REOPENED = "reopened"


class ApprovalEntityType(str, enum.Enum):
    PROJECT = "project"
    TIMESHEET = "timesheet"
    TASK = "task"
    LEAVE_REQUEST = "leave_request"
    ATTENDANCE_CORRECTION = "attendance_correction"


class TimeLogSourceType(str, enum.Enum):
    TIMER = "timer"
    MANUAL = "manual"


class TimeLogStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    INVALID = "invalid"


class AlertType(str, enum.Enum):
    MISSING_CHECKOUT = "missing_checkout"
    OVERDUE_TASK = "overdue_task"
    IDLE_AFTER_CHECKIN = "idle_after_checkin"
    SUSPICIOUS_LOGGING = "suspicious_logging"
    APPROVAL_DELAY = "approval_delay"
    BLOCKED_TASK = "blocked_task"
    WORKLOAD_OVERLOAD = "workload_overload"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RelatedEntityType(str, enum.Enum):
    ATTENDANCE_SESSION = "attendance_session"
    PROJECT = "project"
    TASK = "task"
    USER = "user"
    APPROVAL = "approval"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST"
    PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE"
    USER_INVITED = "USER_INVITED"
    INVITE_EMAIL_SENT = "INVITE_EMAIL_SENT"
    INVITE_EMAIL_FAILED = "INVITE_EMAIL_FAILED"
    ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED"
    ROLE_CHANGED = "role_changed"
    PERMISSION_CHANGED = "permission_changed"
    USER_SUSPENDED = "user_suspended"
    USER_ACTIVATED = "user_activated"
    APPROVE = "approve"
    REJECT = "reject"
    CORRECT = "correct"
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED"
    PROJECT_APPROVED = "PROJECT_APPROVED"
    PROJECT_REJECTED = "PROJECT_REJECTED"
    TASK_CREATED = "TASK_CREATED"
    TASK_UPDATED = "TASK_UPDATED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_REVIEWED = "TASK_REVIEWED"
    TASK_COMPLEXITY_SET = "TASK_COMPLEXITY_SET"


class AlertEmailStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    DISMISSED = "dismissed"


class AlertStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class LeaveType(str, enum.Enum):
    SICK = "sick"
    CASUAL = "casual"
    ANNUAL = "annual"
    HALF_DAY = "half_day"
    WFH = "wfh"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    CANCELLED = "cancelled"
    NEEDS_CLARIFICATION = "needs_clarification"


class HalfDayPeriod(str, enum.Enum):
    FIRST_HALF = "first_half"
    SECOND_HALF = "second_half"


class CorrectionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_CLARIFICATION = "needs_clarification"


class GoalStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    FAILED = "failed"


class AttendanceClassification(str, enum.Enum):
    ACTIVE = "active"
    FULL_DAY = "full_day"
    HALF_DAY = "half_day"
    SHORT_LEAVE = "short_leave"
    INSUFFICIENT = "insufficient"
    LEAVE = "leave"


class AttendanceBreakType(str, enum.Enum):
    DINNER = "dinner"
    PRAYER = "prayer"
    OTHER = "other"
