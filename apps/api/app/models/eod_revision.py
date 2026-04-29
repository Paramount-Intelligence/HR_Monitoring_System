import uuid

from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

class EODRevision(Base, TimestampMixin):
    __tablename__ = "eod_revisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    eod_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("eod_reports.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    manager_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot_data: Mapped[str] = mapped_column(Text, nullable=False) # JSON string of the EOD state
