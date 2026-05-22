import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, Uuid, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import TicketCategory, TicketPriority, TicketStatus


class SupportTicket(Base):
    """Support tickets submitted by users and managed by Admin/HR."""

    __tablename__ = "support_tickets"

    __table_args__ = (
        Index("ix_support_tickets_created_by_id", "created_by_id"),
        Index("ix_support_tickets_status", "status"),
        Index("ix_support_tickets_assigned_to_id", "assigned_to_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Sequential ticket number starting at 1000
    ticket_number: Mapped[int] = mapped_column(
        Identity(start=1000, always=False), unique=True, nullable=False
    )
    
    created_by_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    
    category: Mapped[TicketCategory] = mapped_column(
        Enum(TicketCategory, name="ticket_category", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    
    priority: Mapped[TicketPriority] = mapped_column(
        Enum(TicketPriority, name="ticket_priority", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TicketStatus.OPEN
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    comments = relationship("SupportTicketComment", back_populates="ticket", cascade="all, delete-orphan")


class SupportTicketComment(Base):
    """Discussion and status update threads inside support tickets."""

    __tablename__ = "support_ticket_comments"

    __table_args__ = (
        Index("ix_support_ticket_comments_ticket_id", "ticket_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    ticket = relationship("SupportTicket", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])
