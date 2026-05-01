import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import (
    AlertEmailStatus,
    AlertSeverity,
    AlertStatus,
    AlertType,
    RelatedEntityType,
)


class Alert(Base):
    """Alert record — created_at only; resolved_at tracked explicitly."""

    __tablename__ = "alerts"

    __table_args__ = (
        Index(
            "ix_alerts_recipient_user_id_status_created_at",
            "recipient_user_id",
            "status",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, name="alert_type", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    related_entity_type: Mapped[RelatedEntityType] = mapped_column(
        Enum(RelatedEntityType, name="related_entity_type", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    related_entity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    email_status: Mapped[AlertEmailStatus] = mapped_column(
        Enum(AlertEmailStatus, name="alert_email_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=AlertEmailStatus.QUEUED,
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=AlertStatus.OPEN
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
