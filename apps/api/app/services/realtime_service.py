"""Realtime event builder and dispatcher."""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.communication import ConversationParticipant
from app.models.enums import UserRole, UserStatus
from app.models.notifications import Notification
from app.models.user import User
from app.schemas.realtime import RealtimeEvent
from app.services.realtime_bridge import schedule_emit_to_user, schedule_emit_to_users

logger = logging.getLogger(__name__)


class RealtimeService:
    @staticmethod
    def event(
        event_type: str,
        payload: dict[str, Any],
        *,
        actor_id: uuid.UUID | str | None = None,
        conversation_id: uuid.UUID | str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | str | None = None,
        route: str | None = None,
    ) -> dict[str, Any]:
        return RealtimeEvent(
            type=event_type,
            actor_id=str(actor_id) if actor_id else None,
            conversation_id=str(conversation_id) if conversation_id else None,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            route=route,
            payload=payload,
        ).to_wire()

    @staticmethod
    def emit_to_user(user_id: uuid.UUID | str, event: dict[str, Any]) -> None:
        schedule_emit_to_user(str(user_id), event)

    @staticmethod
    def emit_to_users(user_ids: list[uuid.UUID | str] | set[uuid.UUID | str], event: dict[str, Any]) -> None:
        schedule_emit_to_users({str(u) for u in user_ids}, event)

    @staticmethod
    def emit_to_conversation_participants(
        db: Session,
        conversation_id: uuid.UUID,
        event: dict[str, Any],
        *,
        exclude_user_id: uuid.UUID | str | None = None,
    ) -> None:
        rows = (
            db.query(ConversationParticipant.user_id)
            .filter(ConversationParticipant.conversation_id == conversation_id)
            .all()
        )
        user_ids = {str(r[0]) for r in rows}
        if exclude_user_id:
            user_ids.discard(str(exclude_user_id))
        RealtimeService.emit_to_users(user_ids, event)

    @staticmethod
    def emit_connected(user_id: uuid.UUID | str) -> None:
        RealtimeService.emit_to_user(
            user_id,
            RealtimeService.event("connected", {"user_id": str(user_id)}),
        )

    @staticmethod
    def notification_payload(notif: Notification) -> dict[str, Any]:
        return {
            "id": str(notif.id),
            "title": notif.title,
            "message": notif.message[:200] if notif.message else "",
            "notification_type": notif.notification_type.value
            if hasattr(notif.notification_type, "value")
            else str(notif.notification_type),
            "related_entity_type": notif.related_entity_type,
            "related_entity_id": str(notif.related_entity_id) if notif.related_entity_id else None,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        }

    @staticmethod
    def emit_notification_created(notif: Notification) -> None:
        route = None
        ntype = (
            notif.notification_type.value
            if hasattr(notif.notification_type, "value")
            else str(notif.notification_type)
        )
        if ntype.startswith("meeting"):
            route = "/calendar"
        elif ntype in ("message", "mention"):
            route = "/messages"
        elif ntype.startswith("call"):
            route = "/messages"

        event = RealtimeService.event(
            "notification_created",
            RealtimeService.notification_payload(notif),
            actor_id=None,
            entity_type=notif.related_entity_type,
            entity_id=notif.related_entity_id,
            route=route,
        )
        RealtimeService.emit_to_user(notif.user_id, event)
        RealtimeService.emit_to_user(
            notif.user_id,
            RealtimeService.event(
                "notifications_count_updated",
                {"user_id": str(notif.user_id)},
            ),
        )

        try:
            from app.services.push_notification_service import PushNotificationService

            PushNotificationService.schedule_send_for_notification(notif)
        except Exception:
            logger.exception("[PUSH] schedule_failed notification_id=%s", notif.id)

    @staticmethod
    def emit_notification_read(user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        RealtimeService.emit_to_user(
            user_id,
            RealtimeService.event(
                "notification_read",
                {"notification_id": str(notification_id)},
            ),
        )
        RealtimeService.emit_to_user(
            user_id,
            RealtimeService.event(
                "notifications_count_updated",
                {"user_id": str(user_id)},
            ),
        )

    @staticmethod
    def emit_new_message(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
        sender_name: str,
        preview: str,
        created_at: str,
        participant_ids: list[uuid.UUID] | None = None,
    ) -> None:
        payload = {
            "conversation_id": str(conversation_id),
            "message_id": str(message_id),
            "sender_id": str(sender_id),
            "sender_name": sender_name,
            "preview": preview[:200],
            "created_at": created_at,
        }
        event = RealtimeService.event(
            "new_message",
            payload,
            actor_id=sender_id,
            conversation_id=conversation_id,
            entity_type="message",
            entity_id=message_id,
            route=f"/messages?conversation_id={conversation_id}",
        )
        if participant_ids is not None:
            RealtimeService.emit_to_users(participant_ids, event)
        else:
            RealtimeService.emit_to_conversation_participants(db, conversation_id, event)

    @staticmethod
    def emit_message_updated(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        preview: str,
    ) -> None:
        event = RealtimeService.event(
            "message_updated",
            {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "preview": preview[:200],
            },
            conversation_id=conversation_id,
            entity_type="message",
            entity_id=message_id,
        )
        RealtimeService.emit_to_conversation_participants(db, conversation_id, event)

    @staticmethod
    def emit_message_deleted(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        is_deleted: bool = True,
    ) -> None:
        event = RealtimeService.event(
            "message_deleted",
            {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "is_deleted": is_deleted,
            },
            conversation_id=conversation_id,
            entity_type="message",
            entity_id=message_id,
        )
        RealtimeService.emit_to_conversation_participants(db, conversation_id, event)

    @staticmethod
    def emit_message_delivered(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
        delivered_at: str,
        sender_id: uuid.UUID,
    ) -> None:
        event = RealtimeService.event(
            "message_delivered",
            {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "user_id": str(user_id),
                "delivered_at": delivered_at,
            },
            conversation_id=conversation_id,
            entity_type="message",
            entity_id=message_id,
        )
        RealtimeService.emit_to_user(sender_id, event)

    @staticmethod
    def emit_message_seen(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
        seen_at: str,
        sender_id: uuid.UUID,
    ) -> None:
        event = RealtimeService.event(
            "message_seen",
            {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "user_id": str(user_id),
                "seen_at": seen_at,
            },
            conversation_id=conversation_id,
            entity_type="message",
            entity_id=message_id,
        )
        RealtimeService.emit_to_user(sender_id, event)

    @staticmethod
    def emit_conversation_read(
        db: Session,
        *,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        read_at: str,
    ) -> None:
        event = RealtimeService.event(
            "conversation_read",
            {
                "conversation_id": str(conversation_id),
                "user_id": str(user_id),
                "read_at": read_at,
            },
            conversation_id=conversation_id,
            entity_type="conversation",
            entity_id=conversation_id,
        )
        RealtimeService.emit_to_conversation_participants(
            db, conversation_id, event, exclude_user_id=user_id
        )

    @staticmethod
    def emit_conversation_updated(
        db: Session,
        conversation_id: uuid.UUID,
        *,
        exclude_user_id: uuid.UUID | None = None,
    ) -> None:
        event = RealtimeService.event(
            "conversation_updated",
            {"conversation_id": str(conversation_id)},
            conversation_id=conversation_id,
            entity_type="conversation",
            entity_id=conversation_id,
        )
        RealtimeService.emit_to_conversation_participants(
            db, conversation_id, event, exclude_user_id=exclude_user_id
        )

    @staticmethod
    def emit_announcement(
        event_type: str,
        *,
        announcement_id: uuid.UUID,
        title: str,
        audience: str,
        actor_id: uuid.UUID,
        db: Session,
    ) -> None:
        payload = {
            "announcement_id": str(announcement_id),
            "title": title,
            "audience": audience,
        }
        event = RealtimeService.event(
            event_type,
            payload,
            actor_id=actor_id,
            entity_type="announcement",
            entity_id=announcement_id,
            route="/admin/announcements",
        )
        q = db.query(User.id).filter(User.status == UserStatus.ACTIVE)
        audience_lower = (audience or "all").lower()
        if audience_lower != "all":
            if audience_lower == "employee":
                q = q.filter(
                    User.role.in_(
                        [
                            UserRole.EMPLOYEE,
                            UserRole.INTERN,
                            UserRole.JUNIOR_EMPLOYEE,
                        ]
                    )
                )
            else:
                try:
                    q = q.filter(User.role == UserRole(audience_lower))
                except ValueError:
                    pass
        user_ids = [row[0] for row in q.all()]
        RealtimeService.emit_to_users(user_ids, event)
        RealtimeService.emit_to_users(
            user_ids,
            RealtimeService.event("dashboard_refresh_hint", {"scope": "communication"}),
        )

    @staticmethod
    def emit_meeting_event(
        event_type: str,
        *,
        meeting_id: uuid.UUID,
        title: str,
        participant_ids: list[uuid.UUID],
        organizer_id: uuid.UUID,
        actor_id: uuid.UUID | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "meeting_id": str(meeting_id),
            "title": title,
            **(extra or {}),
        }
        targets = set(participant_ids) | {organizer_id}
        event = RealtimeService.event(
            event_type,
            payload,
            actor_id=actor_id or organizer_id,
            entity_type="meeting",
            entity_id=meeting_id,
            route="/calendar",
        )
        RealtimeService.emit_to_users(targets, event)
        RealtimeService.emit_to_users(
            targets,
            RealtimeService.event("dashboard_refresh_hint", {"scope": "communication"}),
        )

    @staticmethod
    def emit_task_event(
        event_type: str,
        *,
        task_id: uuid.UUID,
        title: str,
        assignee_id: uuid.UUID,
        actor_id: uuid.UUID,
        status: str | None = None,
    ) -> None:
        payload = {
            "task_id": str(task_id),
            "title": title,
            "assigned_to": str(assignee_id),
            "status": status,
        }
        event = RealtimeService.event(
            event_type,
            payload,
            actor_id=actor_id,
            entity_type="task",
            entity_id=task_id,
            route="/admin/tasks",
        )
        RealtimeService.emit_to_user(assignee_id, event)
        RealtimeService.emit_to_user(
            assignee_id,
            RealtimeService.event("dashboard_refresh_hint", {"scope": "tasks"}),
        )

    @staticmethod
    def emit_call_event(
        event_type: str,
        *,
        call_session_id: uuid.UUID,
        conversation_id: uuid.UUID,
        call_type: str,
        target_user_ids: list[uuid.UUID],
        actor_id: uuid.UUID,
        extra: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "call_session_id": str(call_session_id),
            "conversation_id": str(conversation_id),
            "call_type": call_type,
            **(extra or {}),
        }
        event = RealtimeService.event(
            event_type,
            payload,
            actor_id=actor_id,
            conversation_id=conversation_id,
            entity_type="call",
            entity_id=call_session_id,
            route=f"/messages?conversation_id={conversation_id}",
        )
        RealtimeService.emit_to_users(target_user_ids, event)
