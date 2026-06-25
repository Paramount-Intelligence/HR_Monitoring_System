import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

# Need to redefine basic Status here if we don't put in enums to avoid circular dep, 
# or just assume it goes to enums later
class EODReport(Base, TimestampMixin):
    __tablename__ = "eod_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    login_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    logout_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_hours: Mapped[float] = mapped_column(Integer, default=0.0, nullable=False) # Store float hours or int minutes
    tasks_worked_on: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duties_performed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    productivity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Draft", nullable=False)
    manager_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    highlights_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    work_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    blockers: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_day_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
