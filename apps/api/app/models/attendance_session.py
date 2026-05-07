import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Text, Uuid, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import AttendanceClassification, AttendanceSessionStatus, WorkMode
from app.models.mixins import TimestampMixin


class AttendanceSession(Base, TimestampMixin):
    __tablename__ = "attendance_sessions"

    __table_args__ = (
        Index("ix_attendance_sessions_user_id_check_in_at", "user_id", "check_in_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    work_mode: Mapped[WorkMode] = mapped_column(Enum(WorkMode, name="work_mode", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    session_status: Mapped[AttendanceSessionStatus] = mapped_column(
        Enum(AttendanceSessionStatus, name="attendance_session_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=AttendanceSessionStatus.ACTIVE,
    )
    
    # Persistent flags for exceptions
    is_late_login: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_early_logout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Metrics
    total_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    worked_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    late_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    early_checkout_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    attendance_classification: Mapped[AttendanceClassification] = mapped_column(
        Enum(AttendanceClassification, name="attendance_classification", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=AttendanceClassification.ACTIVE,
    )
    
    # Flags
    is_corrected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_overtime: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Justification for checkout after shift end
    checkout_after_shift_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    checkout_after_shift_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Expected boundaries (captured at time of session)
    expected_shift_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_shift_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    correction_requested: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    correction_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    @property
    def user_full_name(self) -> str:
        return self.user.full_name if self.user else "Unknown"
