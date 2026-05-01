import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import ApprovalEntityType, ApprovalAction


class ApprovalTimeline(Base):
    """Tracks every step of an approval lifecycle (shared engine)."""

    __tablename__ = "approval_timeline"

    __table_args__ = (
        Index("ix_approval_timeline_entity_type_entity_id", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    entity_type: Mapped[ApprovalEntityType] = mapped_column(
        Enum(ApprovalEntityType, name="approval_entity_type", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    
    actor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    action: Mapped[ApprovalAction] = mapped_column(
        Enum(ApprovalAction, name="approval_action", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False
    )
