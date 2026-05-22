from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator
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


class MessageAttachmentRead(BaseModel):
    id: UUID
    file_name: str
    original_file_name: str
    mime_type: str
    file_size: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def download_url(self) -> str:
        return f"/api/v1/messages/attachments/{self.id}/download"


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
    attachments: list[MessageAttachmentRead] = []

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
    body: Optional[str] = None
    mentioned_user_ids: list[UUID] = Field(default_factory=list)
    attachment_ids: list[UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_body_or_attachments(self) -> "MessageCreate":
        if not self.body and not self.attachment_ids:
            raise ValueError("Message body cannot be empty if there are no attachments.")
        return self


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


# ─── Call and Signaling Schemas ──────────────────────────────────────────────

class CallSessionRead(BaseModel):
    id: UUID
    conversation_id: UUID
    started_by_id: UUID
    call_type: str
    status: str
    started_at: datetime | None = None
    accepted_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CallStartRequest(BaseModel):
    call_type: str = Field(..., pattern="^(voice|video)$")


class CallSignalCreate(BaseModel):
    recipient_id: UUID
    signal_type: str = Field(..., pattern="^(offer|answer|ice_candidate|end)$")
    payload: dict = Field(default_factory=dict)


class CallSignalRead(BaseModel):
    id: UUID
    call_session_id: UUID
    sender_id: UUID
    recipient_id: UUID
    signal_type: str
    payload: dict = Field(default_factory=dict)
    created_at: datetime
    consumed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def convert_payload(cls, data: any) -> any:
        import json
        if isinstance(data, dict):
            if "payload_json" in data and "payload" not in data:
                try:
                    data["payload"] = json.loads(data["payload_json"]) if data["payload_json"] else {}
                except Exception:
                    data["payload"] = {}
        else:
            payload_json = getattr(data, "payload_json", None)
            try:
                payload = json.loads(payload_json) if payload_json else {}
            except Exception:
                payload = {}
            
            return {
                "id": getattr(data, "id"),
                "call_session_id": getattr(data, "call_session_id"),
                "sender_id": getattr(data, "sender_id"),
                "recipient_id": getattr(data, "recipient_id"),
                "signal_type": getattr(data, "signal_type"),
                "payload": payload,
                "created_at": getattr(data, "created_at"),
                "consumed_at": getattr(data, "consumed_at"),
            }
        return data
