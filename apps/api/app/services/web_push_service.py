"""Web Push delivery (VAPID). Requires VAPID keys in environment."""
from __future__ import annotations

import json
import logging
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import is_unresolved_template, settings
from app.models.enums import ConversationType
from app.models.notifications import Notification
from app.models.user_notification_preferences import UserNotificationPreferences
from app.models.web_push_subscription import WebPushSubscription
from app.services.notification_preference_service import get_or_create_preferences
from app.services.notification_service import (
    display_message_for_user,
    notification_deep_link,
    should_deliver_desktop,
    should_include_preview,
)

logger = logging.getLogger(__name__)

WEB_PUSH_BODY_LIMIT = 180
GENERIC_WEB_PUSH_TITLE = "New notification"
GENERIC_WEB_PUSH_BODY = "Open PIMS to view details"


@dataclass
class WebPushSendStats:
    configured: bool = False
    subscriptions: int = 0
    attempted: int = 0
    sent: int = 0
    failed: int = 0
    message: str | None = None


class WebPushService:
    @staticmethod
    def is_configured() -> bool:
        return bool(
            settings.vapid_public_key
            and settings.vapid_private_key
            and settings.vapid_subject
            and not is_unresolved_template(settings.vapid_public_key)
            and not is_unresolved_template(settings.vapid_private_key)
            and not is_unresolved_template(settings.vapid_subject)
        )

    @staticmethod
    def get_public_key() -> str | None:
        if not WebPushService.is_configured():
            return None
        return settings.vapid_public_key

    @staticmethod
    def schedule_send_for_notification(
        notif: Notification,
        *,
        prefs: UserNotificationPreferences | None = None,
        conversation_type: ConversationType | str | None = None,
    ) -> None:
        if not WebPushService.is_configured():
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
                WebPushService.send_for_notification(
                    db,
                    fresh,
                    conversation_type=conversation_type,
                )
            except Exception as exc:
                logger.warning(
                    "[WEB_PUSH] send_failed user_id=%s notification_id=%s reason=%s",
                    user_id,
                    notif_id,
                    exc,
                )
            finally:
                db.close()

        threading.Thread(
            target=_run,
            daemon=True,
            name=f"web-push-{notif_id[:8]}",
        ).start()

    @staticmethod
    def send_for_notification(
        db: Session,
        notif: Notification,
        *,
        prefs: UserNotificationPreferences | None = None,
        conversation_type: ConversationType | str | None = None,
    ) -> WebPushSendStats:
        stats = WebPushSendStats(configured=WebPushService.is_configured())
        if not stats.configured:
            stats.message = "Web Push is not configured"
            return stats

        if prefs is None:
            prefs = get_or_create_preferences(db, notif.user_id)

        if not should_deliver_desktop(
            prefs,
            notif.notification_type,
            related_entity_type=notif.related_entity_type,
            conversation_type=conversation_type,
        ):
            return stats

        subscriptions = (
            db.query(WebPushSubscription)
            .filter(
                WebPushSubscription.user_id == notif.user_id,
                WebPushSubscription.revoked_at.is_(None),
            )
            .all()
        )
        stats.subscriptions = len(subscriptions)
        if not subscriptions:
            return stats

        payload = WebPushService.build_payload(
            notif,
            prefs,
            conversation_type=conversation_type,
        )
        return WebPushService._send_to_subscriptions(db, subscriptions, payload)

    @staticmethod
    def send_test_to_user(db: Session, user_id: uuid.UUID) -> WebPushSendStats:
        stats = WebPushSendStats(configured=WebPushService.is_configured())
        if not stats.configured:
            stats.message = "Web Push is not configured"
            return stats

        prefs = get_or_create_preferences(db, user_id)
        if not prefs.desktop_notifications_enabled:
            stats.message = "Desktop notifications are disabled"
            return stats

        subscriptions = (
            db.query(WebPushSubscription)
            .filter(
                WebPushSubscription.user_id == user_id,
                WebPushSubscription.revoked_at.is_(None),
            )
            .all()
        )
        stats.subscriptions = len(subscriptions)
        if not subscriptions:
            stats.message = "No active browser push subscriptions"
            return stats

        now = datetime.now(timezone.utc)
        payload = {
            "title": "PIMS test notification",
            "body": "Web Push is working. You can close this tab and still receive alerts.",
            "url": "/notifications",
            "tag": f"web-push-test-{int(now.timestamp())}",
            "notification_id": None,
            "type": "system",
            "created_at": now.isoformat(),
        }
        return WebPushService._send_to_subscriptions(db, subscriptions, payload)

    @staticmethod
    def build_payload(
        notif: Notification,
        prefs: UserNotificationPreferences,
        *,
        conversation_type: ConversationType | str | None = None,
    ) -> dict[str, Any]:
        ntype = (
            notif.notification_type.value
            if hasattr(notif.notification_type, "value")
            else str(notif.notification_type)
        )
        url = WebPushService._web_push_url(notif)

        if should_include_preview(prefs, notif.notification_type):
            title = (notif.title or GENERIC_WEB_PUSH_TITLE)[:120]
            body = display_message_for_user(
                prefs,
                notif.notification_type,
                notif.message or "",
                related_entity_type=notif.related_entity_type,
                conversation_type=conversation_type,
            )
            if len(body) > WEB_PUSH_BODY_LIMIT:
                body = body[: WEB_PUSH_BODY_LIMIT - 1] + "…"
        else:
            title = GENERIC_WEB_PUSH_TITLE
            body = GENERIC_WEB_PUSH_BODY

        created_at = notif.created_at.isoformat() if notif.created_at else None
        return {
            "title": title,
            "body": body,
            "url": url,
            "tag": f"notification-{notif.id}",
            "notification_id": str(notif.id),
            "type": ntype,
            "created_at": created_at,
        }

    @staticmethod
    def _web_push_url(notif: Notification) -> str:
        link = notification_deep_link(
            notif.notification_type,
            notif.related_entity_type,
            notif.related_entity_id,
        )
        if link:
            return link
        if notif.related_entity_type == "eod_report":
            return "/manager/eod-reviews"
        return "/notifications"

    @staticmethod
    def _send_to_subscriptions(
        db: Session,
        subscriptions: list[WebPushSubscription],
        payload: dict[str, Any],
    ) -> WebPushSendStats:
        stats = WebPushSendStats(
            configured=True,
            subscriptions=len(subscriptions),
        )
        data = json.dumps(payload)
        now = datetime.now(timezone.utc)

        for sub in subscriptions:
            stats.attempted += 1
            try:
                WebPushService._deliver_one(sub, data)
                sub.last_used_at = now
                stats.sent += 1
            except Exception as exc:
                stats.failed += 1
                if WebPushService._should_revoke_subscription(exc):
                    sub.revoked_at = now
                    logger.info(
                        "[WEB_PUSH] revoked subscription_id=%s endpoint=%s",
                        sub.id,
                        WebPushService._mask_endpoint(sub.endpoint),
                    )
                else:
                    logger.warning(
                        "[WEB_PUSH] delivery_failed subscription_id=%s endpoint=%s reason=%s",
                        sub.id,
                        WebPushService._mask_endpoint(sub.endpoint),
                        exc,
                    )

        db.commit()
        logger.info(
            "[WEB_PUSH] delivery_complete subscriptions=%s attempted=%s sent=%s failed=%s",
            stats.subscriptions,
            stats.attempted,
            stats.sent,
            stats.failed,
        )
        return stats

    @staticmethod
    def _deliver_one(subscription: WebPushSubscription, data: str) -> None:
        from pywebpush import webpush

        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=data,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )

    @staticmethod
    def _should_revoke_subscription(exc: Exception) -> bool:
        from pywebpush import WebPushException

        if not isinstance(exc, WebPushException):
            return False
        response = getattr(exc, "response", None)
        if response is None:
            return False
        status_code = getattr(response, "status_code", None)
        return status_code in (404, 410)

    @staticmethod
    def _mask_endpoint(endpoint: str) -> str:
        if len(endpoint) <= 48:
            return endpoint[:16] + "…"
        return endpoint[:24] + "…" + endpoint[-8:]
