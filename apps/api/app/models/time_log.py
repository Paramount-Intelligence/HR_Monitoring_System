import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import TimeLogSourceType, TimeLogStatus
from app.models.mixins import TimestampMixin


class TimeLog(Base, TimestampMixin):
    __tablename__ = "time_logs"

    __table_args__ = (
        Index("ix_time_logs_user_id_started_at", "user_id", "started_at"),
        Index("ix_time_logs_task_id", "task_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_type: Mapped[TimeLogSourceType] = mapped_column(
        Enum(TimeLogSourceType, name="time_log_source_type"), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TimeLogStatus] = mapped_column(
        Enum(TimeLogStatus, name="time_log_status"), nullable=False, default=TimeLogStatus.ACTIVE
    )
