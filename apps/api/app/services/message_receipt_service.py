"""Message receipt, reply preview, and delivery status helpers."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.communication import (
    Conversation,
    ConversationParticipant,
    Message,
    MessageReceipt,
)
from app.models.enums import ConversationParticipantRole, UserRole
from app.models.user import User
from app.services.message_html_service import html_to_plain_text, sanitize_message_html
from app.schemas.communication import (
    MessageAttachmentRead,
    MessageMentionRead,
    MessageReactionRead,
    MessageRead,
    ReplyPreview,
    UserMinimal,
)


def _preview_text(body: str, max_len: int = 120) -> str:
    text = html_to_plain_text(body) if "<" in (body or "") else (body or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def build_reply_preview(db: Session, parent_message_id: uuid.UUID | None) -> ReplyPreview | None:
    if not parent_message_id:
        return None

    parent = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.attachments),
        )
        .filter(Message.id == parent_message_id)
        .first()
    )
    if not parent:
        return ReplyPreview(
            id=parent_message_id,
            sender_name="Unknown",
            content_preview="Original message unavailable.",
            attachment_preview=None,
            created_at=datetime.now(timezone.utc),
            is_unavailable=True,
        )

    if parent.is_deleted:
        sender_name = parent.sender.full_name if parent.sender else "Unknown"
        return ReplyPreview(
            id=parent.id,
            sender_name=sender_name,
            content_preview="Original message unavailable.",
            attachment_preview=None,
            created_at=parent.created_at,
            is_unavailable=True,
        )

    attachment_preview = None
    if parent.attachments:
        first = parent.attachments[0]
        attachment_preview = first.original_file_name

    content = _preview_text(parent.body) if parent.body else ""
    if not content and attachment_preview:
        content = attachment_preview

    return ReplyPreview(
        id=parent.id,
        sender_name=parent.sender.full_name if parent.sender else "Unknown",
        content_preview=content or "Attachment",
        attachment_preview=attachment_preview,
        created_at=parent.created_at,
        is_unavailable=False,
    )


def create_receipts_for_message(db: Session, message: Message) -> None:
    participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == message.conversation_id,
            ConversationParticipant.user_id != message.sender_id,
            ConversationParticipant.left_at.is_(None),
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for participant in participants:
        db.add(
            MessageReceipt(
                message_id=message.id,
                user_id=participant.user_id,
                created_at=now,
            )
        )


def mark_delivered_for_conversation_fetch(
    db: Session,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[tuple[uuid.UUID, uuid.UUID, datetime]]:
    """Mark undelivered receipts as delivered when user fetches messages."""
    now = datetime.now(timezone.utc)
    receipts = (
        db.query(MessageReceipt)
        .join(Message, MessageReceipt.message_id == Message.id)
        .filter(
            Message.conversation_id == conversation_id,
            MessageReceipt.user_id == user_id,
            MessageReceipt.delivered_at.is_(None),
            Message.sender_id != user_id,
        )
        .all()
    )
    updated: list[tuple[uuid.UUID, uuid.UUID, datetime]] = []
    for receipt in receipts:
        receipt.delivered_at = now
        updated.append((receipt.message_id, user_id, now))
    return updated


def mark_seen_for_conversation_read(
    db: Session,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    read_at: datetime,
) -> list[tuple[uuid.UUID, uuid.UUID, datetime]]:
    """Mark unseen receipts as seen when user marks conversation read."""
    receipts = (
        db.query(MessageReceipt)
        .join(Message, MessageReceipt.message_id == Message.id)
        .filter(
            Message.conversation_id == conversation_id,
            MessageReceipt.user_id == user_id,
            MessageReceipt.seen_at.is_(None),
            Message.sender_id != user_id,
            Message.is_deleted.is_(False),
        )
        .all()
    )
    updated: list[tuple[uuid.UUID, uuid.UUID, datetime]] = []
    for receipt in receipts:
        receipt.seen_at = read_at
        if receipt.delivered_at is None:
            receipt.delivered_at = read_at
        updated.append((receipt.message_id, user_id, read_at))
    return updated


def compute_delivery_status(
    db: Session,
    message: Message,
    viewer_id: uuid.UUID,
) -> tuple[str | None, int | None, int | None, int | None]:
    """Return delivery_status, seen_count, delivered_count, total_recipients for sender view."""
    if message.sender_id != viewer_id:
        return None, None, None, None

    receipts = db.query(MessageReceipt).filter(MessageReceipt.message_id == message.id).all()
    if not receipts:
        return "sent", 0, 0, 0

    total = len(receipts)
    delivered = sum(1 for r in receipts if r.delivered_at is not None)
    seen = sum(1 for r in receipts if r.seen_at is not None)

    if seen == total and total > 0:
        status = "seen"
    elif delivered == total and total > 0:
        status = "delivered"
    elif delivered > 0 or seen > 0:
        status = "delivered"
    else:
        status = "sent"

    return status, seen, delivered, total


def can_user_delete_message(
    msg: Message,
    current_user: User,
    participant: ConversationParticipant | None,
) -> bool:
    if msg.sender_id == current_user.id:
        return True
    if current_user.role == UserRole.ADMIN:
        return True
    if participant and participant.role in {
        ConversationParticipantRole.OWNER,
        ConversationParticipantRole.ADMIN,
    }:
        return True
    return False


def serialize_message(db: Session, msg: Message, viewer_id: uuid.UUID) -> MessageRead:
    reply_preview = build_reply_preview(db, msg.parent_message_id)
    delivery_status, seen_count, delivered_count, total_recipients = compute_delivery_status(
        db, msg, viewer_id
    )

    attachments: list[MessageAttachmentRead] = []
    body = msg.body if not msg.is_deleted else ""
    body_html = sanitize_message_html(msg.body_html) if (msg.body_html and not msg.is_deleted) else None
    if not msg.is_deleted and msg.attachments:
        attachments = [MessageAttachmentRead.model_validate(a) for a in msg.attachments]

    sender = UserMinimal.model_validate(msg.sender) if msg.sender else None
    if not sender:
        sender_user = db.get(User, msg.sender_id)
        sender = UserMinimal.model_validate(sender_user) if sender_user else UserMinimal(
            id=msg.sender_id,
            full_name="Unknown",
            email="",
            role="employee",
        )

    mentions = [MessageMentionRead.model_validate(m) for m in (msg.mentions or [])]
    reactions = [MessageReactionRead.model_validate(r) for r in (msg.reactions or [])]

    return MessageRead(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=sender,
        body=body,
        body_html=body_html,
        message_type=msg.message_type,
        parent_message_id=msg.parent_message_id,
        reply_to_message_id=msg.parent_message_id,
        is_edited=msg.is_edited,
        is_deleted=msg.is_deleted,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        deleted_at=msg.deleted_at,
        mentions=mentions,
        reactions=reactions,
        attachments=attachments,
        reply_to_message=reply_preview,
        delivery_status=delivery_status,
        seen_count=seen_count,
        delivered_count=delivered_count,
        total_recipients=total_recipients,
    )


def get_message_info(db: Session, message_id: uuid.UUID, current_user: User) -> dict:
    msg = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.attachments),
            joinedload(Message.conversation),
        )
        .filter(Message.id == message_id)
        .first()
    )
    if not msg:
        raise ValueError("Message not found")

    participant = (
        db.query(ConversationParticipant)
        .filter_by(conversation_id=msg.conversation_id, user_id=current_user.id)
        .first()
    )
    if not participant:
        raise PermissionError("You do not have permission to view this message info.")

    conv = msg.conversation or db.get(Conversation, msg.conversation_id)
    receipts = (
        db.query(MessageReceipt)
        .options(joinedload(MessageReceipt.user))
        .filter(MessageReceipt.message_id == message_id)
        .all()
    )

    receipt_rows = []
    for receipt in receipts:
        u = receipt.user or db.get(User, receipt.user_id)
        receipt_rows.append(
            {
                "user_id": receipt.user_id,
                "full_name": u.full_name if u else "Unknown",
                "role": u.role.value if u and hasattr(u.role, "value") else str(u.role if u else ""),
                "profile_picture_url": u.avatar_url if u else None,
                "delivered_at": receipt.delivered_at,
                "seen_at": receipt.seen_at,
            }
        )

    attachments = []
    if not msg.is_deleted and msg.attachments:
        attachments = [MessageAttachmentRead.model_validate(a) for a in msg.attachments]

    conv_name = conv.title if conv else None
    if conv and conv.type.value == "direct" and not conv_name:
        other = (
            db.query(ConversationParticipant)
            .options(joinedload(ConversationParticipant.user))
            .filter(
                ConversationParticipant.conversation_id == conv.id,
                ConversationParticipant.user_id != current_user.id,
            )
            .first()
        )
        if other and other.user:
            conv_name = other.user.full_name

    sender = UserMinimal.model_validate(msg.sender) if msg.sender else UserMinimal(
        id=msg.sender_id,
        full_name="Unknown",
        email="",
        role="employee",
    )

    return {
        "message_id": msg.id,
        "sender": sender,
        "sent_at": msg.created_at,
        "conversation_name": conv_name,
        "conversation_type": conv.type if conv else None,
        "attachments": attachments,
        "receipts": receipt_rows,
        "is_deleted": msg.is_deleted,
    }
