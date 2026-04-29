import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Uuid, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class WeeklyReport(Base, TimestampMixin):
    __tablename__ = "weekly_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_hours: Mapped[float] = mapped_column(Integer, default=0.0, nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_logins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    early_logouts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    eod_submission_rate: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # percentage
    productivity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
