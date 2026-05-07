import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ProjectPriority, TaskStatus
from app.models.mixins import TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    __table_args__ = (
        Index("ix_tasks_project_id_assigned_to_status", "project_id", "assigned_to", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tasks.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    complexity_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority, name="project_priority", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=ProjectPriority.MEDIUM
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=TaskStatus.CREATED
    )
    blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    project = relationship("Project", foreign_keys=[project_id], lazy="select")
    assignee = relationship("User", foreign_keys=[assigned_to], lazy="select")
    creator = relationship("User", foreign_keys=[created_by], lazy="select")

    @property
    def project_title(self) -> str | None:
        return self.project.title if self.project else None

    @property
    def assigned_to_name(self) -> str | None:
        return self.assignee.full_name if self.assignee else None
