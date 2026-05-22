from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import TicketCategory, TicketPriority, TicketStatus
from app.schemas.meetings import UserMinimal


class SupportTicketCommentRead(BaseModel):
    id: UUID
    ticket_id: UUID
    author_id: UUID
    author: UserMinimal
    message: str
    is_internal: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupportTicketCommentCreate(BaseModel):
    message: str = Field(..., min_length=1)
    is_internal: bool = False


class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    category: TicketCategory
    priority: TicketPriority
    description: str = Field(..., min_length=1)


class SupportTicketUpdate(BaseModel):
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assigned_to_id: UUID | None = None


class SupportTicketRead(BaseModel):
    id: UUID
    ticket_number: int
    created_by_id: UUID
    created_by: UserMinimal
    assigned_to_id: UUID | None = None
    assigned_to: UserMinimal | None = None
    subject: str
    category: TicketCategory
    priority: TicketPriority
    description: str
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    comments: list[SupportTicketCommentRead] = []

    model_config = ConfigDict(from_attributes=True)
