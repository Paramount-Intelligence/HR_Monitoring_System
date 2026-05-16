import uuid
from datetime import date

from sqlalchemy import Date, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
