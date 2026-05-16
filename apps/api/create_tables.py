from app.db.session import engine
from app.models.base import Base
# Import all models to ensure they are registered with Base
from app.models.user import User
from app.models.attendance_session import AttendanceSession
from app.models.shift import Shift
from app.models.project import Project
from app.models.task import Task
from app.models.approval import Approval
from app.models.audit_log import AuditLog
from app.models.leave_request import LeaveRequest
from app.models.approval_timeline import ApprovalTimeline
from app.models.attendance_correction import AttendanceCorrection
from app.models.goal import Goal

print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
