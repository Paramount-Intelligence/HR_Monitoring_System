"""Send mobile push notifications via Expo Push API."""
from __future__ import annotations

import json
import logging
import re
import threading
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib import error, request

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notifications import Notification
from app.models.user_device_token import UserDeviceToken

logger = logging.getLogger(__name__)

EXPO_TOKEN_PATTERN = re.compile(r"^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$")

_push_executor_lock = threading.Lock()


def is_valid_expo_push_token(token: str) -> bool:
    return bool(token and EXPO_TOKEN_PATTERN.match(token.strip()))


def _truncate_preview(text: str | None, limit: int = 120) -> str:
    if not text:
        return ""
    cleaned = " ".join(str(text).split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1] + "…"


def build_push_data_from_notification(notif: Notification) -> dict[str, Any]:
    ntype = (
        notif.notification_type.value
        if hasattr(notif.notification_type, "value")
        else str(notif.notification_type)
    )
    data: dict[str, Any] = {
        "type": "notification",
        "notification_id": str(notif.id),
        "screen": "alerts",
    }

    if ntype in ("message", "mention") and notif.related_entity_type == "conversation":
        data["type"] = "message"
        data["screen"] = "chat"
        if notif.related_entity_id:
            data["conversation_id"] = str(notif.related_entity_id)
    elif ntype == "call_incoming":
        data["type"] = "incoming_call"
        data["screen"] = "call"
        if notif.related_entity_type == "call_session" and notif.related_entity_id:
            data["call_id"] = str(notif.related_entity_id)
    elif ntype == "call_missed":
        data["type"] = "notification"
        data["screen"] = "alerts"
    elif ntype.startswith("meeting"):
        data["screen"] = "dashboard"
    elif notif.related_entity_type == "attendance_session":
        data["screen"] = "attendance"

    if notif.related_entity_type:
        data["entity_type"] = notif.related_entity_type
    if notif.related_entity_id:
        data["entity_id"] = str(notif.related_entity_id)

    return data


class PushNotificationService:
    @staticmethod
    def schedule_send_for_notification(notif: Notification) -> None:
        if not settings.push_notifications_enabled:
            return
        notif_id = str(notif.id)
        user_id = str(notif.user_id)

        def _run() -> None:
            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                fresh = db.get(Notification, uuid.UUID(notif_id))
                if not fresh:
                    return
                PushNotificationService.send_for_notification(db, fresh)
            except Exception as exc:
                logger.warning(
                    "[PUSH] send_failed user_id=%s notification_id=%s reason=%s",
                    user_id,
                    notif_id,
                    exc,
                )
            finally:
                db.close()

        threading.Thread(target=_run, daemon=True, name=f"push-{notif_id[:8]}").start()

    @staticmethod
    def send_for_notification(db: Session, notif: Notification) -> None:
        ntype = (
            notif.notification_type.value
            if hasattr(notif.notification_type, "value")
            else str(notif.notification_type)
        )
        if ntype == "call_incoming":
            return
        title = _truncate_preview(notif.title, 80)
        body = (
            _truncate_preview(notif.message, 120)
            if settings.push_notification_message_preview_enabled
            else "You have a new notification."
        )
        data = build_push_data_from_notification(notif)
        PushNotificationService.send_push_to_user(db, notif.user_id, title, body, data)

    @staticmethod
    def send_push_to_user(
        db: Session,
        user_id: uuid.UUID,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        tokens = (
            db.query(UserDeviceToken)
            .filter(
                UserDeviceToken.user_id == user_id,
                UserDeviceToken.is_active.is_(True),
                UserDeviceToken.revoked_at.is_(None),
            )
            .all()
        )
        if not tokens:
            return
        for row in tokens:
            PushNotificationService.send_push_to_token(db, row, title, body, data)

    @staticmethod
    def send_push_to_users(
        db: Session,
        user_ids: list[uuid.UUID] | set[uuid.UUID],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        for uid in {uuid.UUID(str(u)) if not isinstance(u, uuid.UUID) else u for u in user_ids}:
            PushNotificationService.send_push_to_user(db, uid, title, body, data)

    @staticmethod
    def send_push_to_token(
        db: Session,
        token_row: UserDeviceToken,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        if not settings.push_notifications_enabled:
            return
        token = token_row.expo_push_token
        if not is_valid_expo_push_token(token):
            PushNotificationService.deactivate_invalid_token(db, token_row, "invalid_format")
            return

        payload = {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        push_type = (data or {}).get("type")
        if push_type == "incoming_call":
            payload["priority"] = "high"
            payload["channelId"] = "incoming-calls"
        elif push_type == "message":
            payload["channelId"] = "messages"
        elif push_type == "notification":
            payload["channelId"] = "alerts"
        logger.info(
            "[PUSH] send_start user_id=%s token_id=%s type=%s",
            token_row.user_id,
            token_row.id,
            (data or {}).get("type", "notification"),
        )

        try:
            response_data = PushNotificationService._post_expo_push([payload])
        except Exception as exc:
            logger.warning("[PUSH] send_error token_id=%s reason=%s", token_row.id, exc)
            return

        PushNotificationService._handle_expo_response(db, token_row, response_data)

    @staticmethod
    def _post_expo_push(messages: list[dict[str, Any]]) -> dict[str, Any]:
        body = json.dumps(messages).encode("utf-8")
        req = request.Request(
            settings.expo_push_api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)

    @staticmethod
    def _handle_expo_response(
        db: Session,
        token_row: UserDeviceToken,
        response_data: dict[str, Any] | list[Any],
    ) -> None:
        tickets: list[dict[str, Any]]
        if isinstance(response_data, dict) and "data" in response_data:
            tickets = response_data.get("data") or []
        elif isinstance(response_data, list):
            tickets = response_data
        else:
            tickets = [response_data] if isinstance(response_data, dict) else []

        for ticket in tickets:
            if not isinstance(ticket, dict):
                continue
            status = ticket.get("status")
            if status == "ok":
                logger.info("[PUSH] send_success token_id=%s", token_row.id)
                continue
            details = ticket.get("details") or {}
            error_code = details.get("error") or ticket.get("message") or "unknown"
            logger.warning(
                "[PUSH] ticket_error token_id=%s code=%s",
                token_row.id,
                error_code,
            )
            if error_code in ("DeviceNotRegistered", "InvalidCredentials", "MessageTooBig"):
                PushNotificationService.deactivate_invalid_token(db, token_row, str(error_code))

    @staticmethod
    def send_incoming_call_push(
        db: Session,
        *,
        recipient_user_id: uuid.UUID,
        call_session_id: uuid.UUID,
        conversation_id: uuid.UUID,
        caller_id: uuid.UUID,
        caller_name: str,
        call_type: str,
    ) -> None:
        """High-priority push backup for incoming calls (foreground + background)."""
        if not settings.push_notifications_enabled:
            return
        from datetime import timedelta

        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=45)).isoformat()
        label = "video" if call_type == "video" else "voice"
        data = {
            "type": "incoming_call",
            "screen": "call",
            "call_id": str(call_session_id),
            "conversation_id": str(conversation_id),
            "caller_id": str(caller_id),
            "caller_name": caller_name,
            "call_type": call_type,
            "expires_at": expires_at,
        }
        PushNotificationService.send_push_to_user(
            db,
            recipient_user_id,
            f"Incoming {label} call",
            f"{caller_name} is calling you",
            data,
        )

    @staticmethod
    def deactivate_invalid_token(
        db: Session,
        token_row: UserDeviceToken,
        reason: str,
    ) -> None:
        token_row.is_active = False
        token_row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("[PUSH] token_deactivated token_id=%s reason=%s", token_row.id, reason)
