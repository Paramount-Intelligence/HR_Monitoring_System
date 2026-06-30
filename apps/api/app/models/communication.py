import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ConversationType, ConversationParticipantRole, MessageType, GroupSendPermission, GroupEditPermission, GroupAddMemberPermission
from app.models.mixins import TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    __table_args__ = (
        Index("ix_conversations_related_entity", "related_entity_type", "related_entity_id"),
        Index("ix_conversations_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[ConversationType] = mapped_column(
        Enum(ConversationType, name="conversation_type", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    related_entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Group/Channel permission settings
    who_can_send_messages: Mapped[str] = mapped_column(
        String(50), default=GroupSendPermission.ALL_MEMBERS.value, nullable=False
    )
    who_can_edit_group_info: Mapped[str] = mapped_column(
        String(50), default=GroupEditPermission.ADMINS_ONLY.value, nullable=False
    )
    who_can_add_members: Mapped[str] = mapped_column(
        String(50), default=GroupAddMemberPermission.ADMINS_ONLY.value, nullable=False
    )

    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    avatar_storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    avatar_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id])
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    __table_args__ = (
        Index("ix_conversation_participants_conv_user", "conversation_id", "user_id", unique=True),
        Index("ix_conversation_participants_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[ConversationParticipantRole] = mapped_column(
        Enum(ConversationParticipantRole, name="conversation_participant_role", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ConversationParticipantRole.MEMBER
    )
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    __table_args__ = (
        Index("ix_messages_conversation_id", "conversation_id"),
        Index("ix_messages_sender_id", "sender_id"),
        Index("ix_messages_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType, name="message_type", native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=MessageType.TEXT
    )
    parent_message_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    deleted_by = relationship("User", foreign_keys=[deleted_by_id])
    parent_message = relationship("Message", remote_side="Message.id", foreign_keys=[parent_message_id])
    mentions = relationship("MessageMention", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    __table_args__ = (
        Index("ix_message_receipts_message_id", "message_id"),
        Index("ix_message_receipts_user_id", "user_id"),
        Index("uq_message_receipts_message_user", "message_id", "user_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    message = relationship("Message", back_populates="receipts")
    user = relationship("User", foreign_keys=[user_id])


class MessageMention(Base):
    __tablename__ = "message_mentions"

    __table_args__ = (
        Index("ix_message_mentions_user_id", "mentioned_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    mentioned_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    message = relationship("Message", back_populates="mentions")
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    __table_args__ = (
        Index("ix_message_reactions_message_user", "message_id", "user_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User", foreign_keys=[user_id])


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    __table_args__ = (
        Index("ix_message_attachments_message_id", "message_id"),
        Index("ix_message_attachments_conversation_id", "conversation_id"),
        Index("ix_message_attachments_uploader_id", "uploader_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="file")
    file_size: Mapped[int] = mapped_column(nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(nullable=True)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    storage_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    message = relationship("Message", back_populates="attachments")
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
    uploader = relationship("User", foreign_keys=[uploader_id])


class CallSession(Base):
    __tablename__ = "call_sessions"

    __table_args__ = (
        Index("ix_call_sessions_conversation_id", "conversation_id"),
        Index("ix_call_sessions_started_by_id", "started_by_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    started_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    call_type: Mapped[str] = mapped_column(String(50), nullable=False)  # voice | video
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ringing")  # ringing | active | declined | missed | ended
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
    started_by = relationship("User", foreign_keys=[started_by_id])
    participants = relationship("CallParticipant", back_populates="call_session", cascade="all, delete-orphan")
    signals = relationship("CallSignal", back_populates="call_session", cascade="all, delete-orphan")
    recordings = relationship("CallRecording", back_populates="call_session", cascade="all, delete-orphan")


class CallParticipant(Base):
    __tablename__ = "call_participants"

    __table_args__ = (
        Index("ix_call_participants_call_session_id", "call_session_id"),
        Index("ix_call_participants_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="invited")  # invited | joined | declined | missed | left
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    call_session = relationship("CallSession", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])


class CallSignal(Base):
    __tablename__ = "call_signals"

    __table_args__ = (
        Index("ix_call_signals_call_session_id", "call_session_id"),
        Index("ix_call_signals_sender_id", "sender_id"),
        Index("ix_call_signals_recipient_id", "recipient_id"),
        Index("ix_call_signals_consumed_at", "consumed_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    signal_type: Mapped[str] = mapped_column(String(50), nullable=False)  # offer | answer | ice_candidate | end
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    call_session = relationship("CallSession", back_populates="signals")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])


class CallRecording(Base):
    __tablename__ = "call_recordings"

    __table_args__ = (
        Index("ix_call_recordings_call_session_id", "call_session_id"),
        Index("ix_call_recordings_conversation_id", "conversation_id"),
        Index("ix_call_recordings_recorded_by_user_id", "recorded_by_user_id"),
        Index("ix_call_recordings_status", "status"),
        Index("ix_call_recordings_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    caller_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    receiver_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_driver: Mapped[str] = mapped_column(String(32), nullable=False, default="local")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(nullable=False, default=0)
    duration_seconds: Mapped[int | None] = mapped_column(nullable=True)
    recording_type: Mapped[str] = mapped_column(String(20), nullable=False, default="audio")  # audio | video
    call_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # voice | video
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="available")
    participants_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    call_session = relationship("CallSession", back_populates="recordings")
    recorded_by = relationship("User", foreign_keys=[recorded_by_user_id])
    caller = relationship("User", foreign_keys=[caller_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

