import uuid
from datetime import date, datetime

from sqlalchemy import Enum, ForeignKey, String, Text, Uuid, Date, Boolean, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import LeaveType
from app.models.mixins import TimestampMixin

class DailyStats(Base, TimestampMixin):
    """Aggregation cache for daily performance and attendance metrics."""
    __tablename__ = "daily_stats"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Metrics
    total_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_late_login: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_early_logout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Leave / WFH Context
    leave_type: Mapped[LeaveType | None] = mapped_column(Enum(LeaveType, name="leave_type"), nullable=True)
    is_wfh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Session Reference (Primary session of the day)
    primary_session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_daily_stats"),
    )
