"""Central notification creation, preference checks, and delivery helpers."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, time, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import ConversationType, NotificationType
from app.models.notifications import Notification
from app.models.user_notification_preferences import UserNotificationPreferences
from app.services.notification_preference_service import get_or_create_preferences
from app.services.realtime_service import RealtimeService

logger = logging.getLogger(__name__)

GENERIC_BODIES: dict[str, str] = {
    "message": "New message",
    "mention": "You were mentioned",
    "group_message": "New group message",
    "channel_message": "New channel message",
    "call_incoming": "Incoming call",
    "call_missed": "Missed call",
    "task": "Task update",
    "approval": "Approval update",
    "leave": "Leave update",
    "attendance": "Attendance update",
    "announcement": "New announcement",
    "system": "System notification",
}

CATEGORY_BY_TYPE: dict[str, str] = {
    NotificationType.MESSAGE.value: "messages",
    NotificationType.MENTION.value: "messages",
    NotificationType.CALL_INCOMING.value: "calls",
    NotificationType.CALL_MISSED.value: "calls",
    NotificationType.MEETING_INVITE.value: "meetings",
    NotificationType.MEETING_UPDATED.value: "meetings",
    NotificationType.MEETING_CANCELLED.value: "meetings",
    NotificationType.MEETING_REMINDER.value: "meetings",
    NotificationType.SUPPORT_TICKET.value: "support",
    NotificationType.SUPPORT_REPLY.value: "support",
    NotificationType.TASK_COMMENT.value: "tasks",
    NotificationType.SYSTEM.value: "system",
}


def _normalize_type(notification_type: NotificationType | str) -> str:
    if hasattr(notification_type, "value"):
        return notification_type.value
    return str(notification_type)


def notification_category(
    notification_type: NotificationType | str,
    related_entity_type: str | None = None,
) -> str:
    nt = _normalize_type(notification_type)
    if nt in CATEGORY_BY_TYPE:
        return CATEGORY_BY_TYPE[nt]
    if related_entity_type == "task" or related_entity_type == "task_completion":
        return "tasks"
    if related_entity_type == "leave_request":
        return "approvals"
    if related_entity_type == "attendance_session" or related_entity_type == "attendance_correction":
        return "attendance"
    if related_entity_type == "announcement":
        return "announcements"
    if related_entity_type == "conversation":
        return "messages"
    return "system"


def _in_quiet_hours(prefs: UserNotificationPreferences, now: datetime | None = None) -> bool:
    if not prefs.quiet_hours_enabled or not prefs.quiet_hours_start or not prefs.quiet_hours_end:
        return False
    current = (now or datetime.now(timezone.utc)).time()
    start = prefs.quiet_hours_start
    end = prefs.quiet_hours_end
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def is_type_enabled(
    prefs: UserNotificationPreferences,
    notification_type: NotificationType | str,
    *,
    related_entity_type: str | None = None,
    conversation_type: ConversationType | str | None = None,
) -> bool:
    nt = _normalize_type(notification_type)
    if nt == NotificationType.MENTION.value:
        return prefs.mention_notifications_enabled
    if nt in (NotificationType.CALL_INCOMING.value, NotificationType.CALL_MISSED.value):
        return prefs.call_notifications_enabled
    if nt == NotificationType.MESSAGE.value:
        conv = (
            conversation_type.value
            if hasattr(conversation_type, "value")
            else str(conversation_type)
            if conversation_type
            else None
        )
        if conv in (ConversationType.GROUP.value, ConversationType.CHANNEL.value):
            return prefs.group_notifications_enabled
        return prefs.message_notifications_enabled
    if related_entity_type in ("task", "task_completion"):
        if related_entity_type == "task_completion":
            return prefs.approval_notifications_enabled
        return prefs.task_notifications_enabled
    if related_entity_type == "leave_request":
        return prefs.leave_notifications_enabled or prefs.approval_notifications_enabled
    if related_entity_type in ("attendance_session", "attendance_correction"):
        return prefs.attendance_notifications_enabled
    if related_entity_type == "announcement":
        return prefs.announcement_notifications_enabled
    return True


def should_deliver_banner(
    prefs: UserNotificationPreferences,
    notification_type: NotificationType | str,
    *,
    related_entity_type: str | None = None,
    conversation_type: ConversationType | str | None = None,
) -> bool:
    if prefs.banner_mode == "never":
        return False
    if _in_quiet_hours(prefs):
        return False
    return is_type_enabled(
        prefs,
        notification_type,
        related_entity_type=related_entity_type,
        conversation_type=conversation_type,
    )


def should_deliver_desktop(
    prefs: UserNotificationPreferences,
    notification_type: NotificationType | str,
    *,
    related_entity_type: str | None = None,
    conversation_type: ConversationType | str | None = None,
) -> bool:
    if not prefs.desktop_notifications_enabled:
        return False
    if _in_quiet_hours(prefs):
        return False
    return is_type_enabled(
        prefs,
        notification_type,
        related_entity_type=related_entity_type,
        conversation_type=conversation_type,
    )


def should_include_preview(
    prefs: UserNotificationPreferences,
    notification_type: NotificationType | str,
) -> bool:
    return prefs.show_previews


def generic_body_for(
    notification_type: NotificationType | str,
    *,
    related_entity_type: str | None = None,
    conversation_type: ConversationType | str | None = None,
) -> str:
    nt = _normalize_type(notification_type)
    if nt == NotificationType.MENTION.value:
        return GENERIC_BODIES["mention"]
    if nt in (NotificationType.CALL_INCOMING.value, NotificationType.CALL_MISSED.value):
        return GENERIC_BODIES.get(nt, GENERIC_BODIES["call_incoming"])
    if nt == NotificationType.MESSAGE.value:
        conv = (
            conversation_type.value
            if hasattr(conversation_type, "value")
            else str(conversation_type)
            if conversation_type
            else None
        )
        if conv == ConversationType.CHANNEL.value:
            return GENERIC_BODIES["channel_message"]
        if conv in (ConversationType.GROUP.value,):
            return GENERIC_BODIES["group_message"]
        return GENERIC_BODIES["message"]
    if related_entity_type == "announcement":
        return GENERIC_BODIES["announcement"]
    if related_entity_type in ("task", "task_completion"):
        return GENERIC_BODIES["task"]
    if related_entity_type == "leave_request":
        return GENERIC_BODIES["leave"]
    if related_entity_type in ("attendance_session", "attendance_correction"):
        return GENERIC_BODIES["attendance"]
    return GENERIC_BODIES.get(nt, GENERIC_BODIES["system"])


def notification_deep_link(
    notification_type: NotificationType | str,
    related_entity_type: str | None,
    related_entity_id: uuid.UUID | None,
) -> str | None:
    nt = _normalize_type(notification_type)
    if related_entity_type == "conversation" and related_entity_id:
        return f"/messages?conversation_id={related_entity_id}"
    if nt.startswith("meeting") or related_entity_type == "meeting":
        return "/calendar"
    if nt in ("message", "mention") or related_entity_type == "conversation":
        return "/messages"
    if nt.startswith("call") or related_entity_type == "call":
        if related_entity_id:
            return f"/messages?conversation_id={related_entity_id}"
        return "/messages"
    if related_entity_type in ("support_ticket",) or nt.startswith("support"):
        return "/help-support"
    if related_entity_type in ("task", "task_completion"):
        return "/admin/tasks"
    if related_entity_type == "announcement":
        return "/admin/announcements"
    if related_entity_type == "leave_request":
        return "/leaves"
    if related_entity_type in ("attendance_session", "attendance_correction"):
        return "/attendance"
    return None


def display_message_for_user(
    prefs: UserNotificationPreferences,
    notification_type: NotificationType | str,
    body: str,
    *,
    related_entity_type: str | None = None,
    conversation_type: ConversationType | str | None = None,
) -> str:
    if should_include_preview(prefs, notification_type):
        return body[:200] if body else ""
    return generic_body_for(
        notification_type,
        related_entity_type=related_entity_type,
        conversation_type=conversation_type,
    )


def create_notification(
    db: Session,
    *,
    recipient_id: uuid.UUID,
    notification_type: NotificationType,
    title: str,
    body: str,
    related_entity_type: str | None = None,
    related_entity_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
    conversation_type: ConversationType | str | None = None,
    store: bool = True,
    emit_realtime: bool = True,
    skip_if_disabled: bool = False,
) -> Notification | None:
    """Create a notification, optionally persist and emit to the recipient."""
    prefs = get_or_create_preferences(db, recipient_id)

    if skip_if_disabled and not is_type_enabled(
        prefs,
        notification_type,
        related_entity_type=related_entity_type,
        conversation_type=conversation_type,
    ):
        return None

    notif: Notification | None = None
    if store:
        notif = Notification(
            user_id=recipient_id,
            title=title,
            message=(body or "")[:500],
            notification_type=notification_type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        db.add(notif)
        db.flush()

    if emit_realtime and notif is not None:
        RealtimeService.emit_notification_created(
            notif,
            prefs=prefs,
            conversation_type=conversation_type,
            actor_id=actor_id,
        )
    return notif


def create_message_notifications(
    db: Session,
    *,
    participants: list[uuid.UUID],
    sender_id: uuid.UUID,
    sender_name: str,
    conversation_id: uuid.UUID,
    conversation_title: str | None,
    conversation_type: ConversationType,
    body_preview: str,
    mentioned_user_ids: list[uuid.UUID] | None = None,
) -> list[Notification]:
    """Notify conversation participants except the sender."""
    mentioned = set(mentioned_user_ids or [])
    is_group = conversation_type in (ConversationType.GROUP, ConversationType.CHANNEL)
    conv_title = conversation_title or "Direct Message"

    if conversation_type == ConversationType.DIRECT:
        default_title = f"New message from {sender_name}"
    else:
        default_title = f"[{conv_title}] {sender_name}"

    created: list[Notification] = []
    for recipient_id in participants:
        if recipient_id == sender_id:
            continue
        is_mentioned = recipient_id in mentioned
        n_type = NotificationType.MENTION if is_mentioned else NotificationType.MESSAGE
        n_title = f"You were mentioned by {sender_name}" if is_mentioned else default_title
        preview = body_preview or "Sent an attachment"
        if is_group and not is_mentioned:
            n_body = f"{sender_name}: {preview[:180]}"
        else:
            n_body = preview[:200]

        notif = create_notification(
            db,
            recipient_id=recipient_id,
            notification_type=n_type,
            title=n_title,
            body=n_body,
            related_entity_type="conversation",
            related_entity_id=conversation_id,
            actor_id=sender_id,
            conversation_type=conversation_type,
            store=True,
            emit_realtime=True,
        )
        if notif:
            created.append(notif)
    return created


def notify_announcement_audience(
    db: Session,
    *,
    announcement_id: uuid.UUID,
    title: str,
    audience_user_ids: list[uuid.UUID],
    actor_id: uuid.UUID,
) -> None:
    for user_id in audience_user_ids:
        if user_id == actor_id:
            continue
        create_notification(
            db,
            recipient_id=user_id,
            notification_type=NotificationType.SYSTEM,
            title="New announcement",
            body=title[:200],
            related_entity_type="announcement",
            related_entity_id=announcement_id,
            actor_id=actor_id,
        )
