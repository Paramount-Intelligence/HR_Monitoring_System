import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Uuid, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class MonthlyReport(Base, TimestampMixin):
    __tablename__ = "monthly_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_month: Mapped[date] = mapped_column(Date, nullable=False) # Usually 1st of the month
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'org', 'team', 'individual'
    entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True) # None if org level
    
    total_hours: Mapped[float] = mapped_column(Integer, default=0.0, nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_logins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    early_logouts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    productivity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
