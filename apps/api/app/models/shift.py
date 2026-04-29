import uuid
from datetime import time

from sqlalchemy import Boolean, Integer, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    working_days: Mapped[str] = mapped_column(String(50), default="1,2,3,4,5", nullable=False) # e.g. "1,2,3,4,5" for Mon-Fri
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
