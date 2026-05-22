from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import ConversationType, ConversationParticipantRole, MessageType


class UserMinimal(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class MessageReactionRead(BaseModel):
    id: UUID
    message_id: UUID
    user_id: UUID
    emoji: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageMentionRead(BaseModel):
    id: UUID
    message_id: UUID
    mentioned_user_id: UUID
    mentioned_user: UserMinimal

    model_config = ConfigDict(from_attributes=True)


class MessageRead(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender: UserMinimal
    body: str
    message_type: MessageType
    parent_message_id: UUID | None = None
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    mentions: list[MessageMentionRead] = []
    reactions: list[MessageReactionRead] = []

    model_config = ConfigDict(from_attributes=True)


class ConversationParticipantRead(BaseModel):
    id: UUID
    conversation_id: UUID
    user_id: UUID
    role: ConversationParticipantRole
    last_read_at: datetime | None = None
    is_muted: bool
    joined_at: datetime
    left_at: datetime | None = None
    user: UserMinimal

    model_config = ConfigDict(from_attributes=True)


class LastMessageRead(BaseModel):
    id: UUID
    body: str
    sender_id: UUID
    sender_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    id: UUID
    type: ConversationType
    title: str | None = None
    created_by_id: UUID
    related_entity_type: str | None = None
    related_entity_id: UUID | None = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    # Group/channel permission settings
    who_can_send_messages: str = "all_members"
    who_can_edit_group_info: str = "admins_only"
    who_can_add_members: str = "admins_only"
    participants: list[ConversationParticipantRead] = []
    unread_count: int = 0  # Dynamic field added during queries
    last_message: LastMessageRead | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    type: ConversationType
    title: str | None = Field(None, max_length=255)
    participant_ids: list[UUID] = Field(default_factory=list)


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1)
    mentioned_user_ids: list[UUID] = Field(default_factory=list)


class MessageEdit(BaseModel):
    body: str = Field(..., min_length=1)


class UnreadCountResponse(BaseModel):
    unread_conversations: int
    unread_messages: int
    mentions: int


class ContextThreadCreate(BaseModel):
    related_entity_type: str = Field(..., max_length=100)
    related_entity_id: UUID
    title: str | None = Field(None, max_length=255)


# ─── Participant Management Schemas ──────────────────────────────────────────

class AddParticipantsRequest(BaseModel):
    user_ids: list[UUID] = Field(..., min_length=1)


class UpdateParticipantRoleRequest(BaseModel):
    role: ConversationParticipantRole = Field(
        ...,
        description="Allowed: admin, member, viewer (cannot assign owner via this endpoint)"
    )


# ─── Conversation Settings Schemas ───────────────────────────────────────────

class ConversationSettingsUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    who_can_send_messages: str | None = Field(None, pattern="^(all_members|admins_only)$")
    who_can_edit_group_info: str | None = Field(None, pattern="^(all_members|admins_only)$")
    who_can_add_members: str | None = Field(None, pattern="^(all_members|admins_only)$")
