import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class ManagerDailySummary(Base, TimestampMixin):
    __tablename__ = "manager_daily_summaries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    summary_date: Mapped[date] = mapped_column(Date, nullable=False)
    team_members_active: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_checkouts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_approvals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overdue_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    eod_pending_approvals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
