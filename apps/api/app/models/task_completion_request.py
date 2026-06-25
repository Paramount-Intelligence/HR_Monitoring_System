import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import TaskCompletionRequestStatus
from app.models.mixins import TimestampMixin


class TaskCompletionRequest(Base, TimestampMixin):
    """Intern completion approval request — task stays open until manager approves."""

    __tablename__ = "task_completion_requests"

    __table_args__ = (
        Index("ix_task_completion_requests_task_id", "task_id"),
        Index("ix_task_completion_requests_requested_by", "requested_by_user_id"),
        Index("ix_task_completion_requests_manager_id", "manager_id"),
        Index("ix_task_completion_requests_status", "status"),
        Index("ix_task_completion_requests_requested_at", "requested_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    manager_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[TaskCompletionRequestStatus] = mapped_column(
        Enum(
            TaskCompletionRequestStatus,
            name="task_completion_request_status",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=TaskCompletionRequestStatus.PENDING,
    )
    request_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    task = relationship("Task", foreign_keys=[task_id], lazy="select")
    requester = relationship("User", foreign_keys=[requested_by_user_id], lazy="select")
    manager = relationship("User", foreign_keys=[manager_id], lazy="select")
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id], lazy="select")
