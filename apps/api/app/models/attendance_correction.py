import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import CorrectionStatus
from app.models.mixins import TimestampMixin

class AttendanceCorrection(Base, TimestampMixin):
    __tablename__ = "attendance_corrections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("attendance_sessions.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Preserve original values for audit
    original_check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    original_check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    requested_check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[CorrectionStatus] = mapped_column(
        Enum(CorrectionStatus, name="correction_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), default=CorrectionStatus.PENDING, nullable=False
    )
    manager_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
