import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, Numeric, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class PerformanceMetricDaily(Base, TimestampMixin):
    __tablename__ = "performance_metrics_daily"

    __table_args__ = (
        UniqueConstraint("user_id", "metric_date", name="uq_performance_metrics_user_date"),
        Index("ix_performance_metrics_daily_user_id_metric_date", "user_id", "metric_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_session_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    productive_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    efficiency_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    utilization_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    consistency_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    composite_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
