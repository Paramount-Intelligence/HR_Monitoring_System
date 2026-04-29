import uuid
from datetime import date, datetime

from sqlalchemy import Enum, ForeignKey, String, Text, Uuid, Date, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import LeaveType, LeaveStatus, HalfDayPeriod
from app.models.mixins import TimestampMixin

class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    leave_type: Mapped[LeaveType] = mapped_column(Enum(LeaveType, name="leave_type"), nullable=False)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, name="leave_status"), default=LeaveStatus.PENDING, nullable=False
    )
    
    # Half-day support
    is_half_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    half_day_period: Mapped[HalfDayPeriod | None] = mapped_column(
        Enum(HalfDayPeriod, name="half_day_period"), nullable=True
    )
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Approval Tracking
    current_approver_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    escalated_from_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    manager_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
