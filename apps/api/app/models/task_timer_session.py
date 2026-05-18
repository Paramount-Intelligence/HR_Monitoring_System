import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import TimerPauseReason, TimerSessionStatus
from app.models.mixins import TimestampMixin


class TaskTimerSession(Base, TimestampMixin):
    __tablename__ = "task_timer_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[TimerSessionStatus] = mapped_column(
        Enum(TimerSessionStatus, name="timer_session_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TimerSessionStatus.RUNNING,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_resumed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accumulated_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pause_reason: Mapped[TimerPauseReason | None] = mapped_column(
        Enum(TimerPauseReason, name="timer_pause_reason", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=True,
    )

    # Relationships
    task = relationship("Task", lazy="select")
    user = relationship("User", lazy="select")

    @property
    def task_title(self) -> str | None:
        return self.task.title if self.task else None

    @property
    def project_title(self) -> str | None:
        return self.task.project_title if self.task else None
