import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.notifications import Notification
from app.models.user_device_token import UserDeviceToken
from app.schemas.notifications import NotificationRead
from app.schemas.device_token import (
    DeviceTokenRead,
    DeviceTokenRegister,
    DeviceTokenUnregister,
)
from app.services.push_notification_service import is_valid_expo_push_token
from app.services.realtime_service import RealtimeService

logger = logging.getLogger(__name__)

router = APIRouter()


def _normalize_platform(platform: str | None) -> str:
    value = (platform or "unknown").lower().strip()
    if value in ("android", "ios"):
        return value
    return "unknown"


def _normalize_environment(value: str | None) -> str:
    env = (value or "development").lower().strip()
    if env in ("development", "preview", "production"):
        return env
    return "development"


@router.get("", response_model=list[NotificationRead])
def get_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationRead]:
    """Get notifications for the current user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return notifications


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Get the unread notification count for the current user."""
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"count": unread_count}


@router.post("/device-tokens", response_model=DeviceTokenRead)
def register_device_token(
    payload: DeviceTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserDeviceToken:
    """Register or refresh the current user's Expo push token."""
    token = payload.expo_push_token.strip()
    if not is_valid_expo_push_token(token):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid Expo push token format.",
        )

    now = datetime.now(timezone.utc)
    existing = (
        db.query(UserDeviceToken)
        .filter(UserDeviceToken.expo_push_token == token)
        .first()
    )

    if existing:
        if existing.user_id != current_user.id:
            logger.warning(
                "[PUSH] token_reassigned previous_user_id=%s new_user_id=%s",
                existing.user_id,
                current_user.id,
            )
            existing.is_active = False
            existing.revoked_at = now
            db.commit()
            row = UserDeviceToken(
                id=uuid.uuid4(),
                user_id=current_user.id,
                expo_push_token=token,
                platform=_normalize_platform(payload.platform),
                device_name=payload.device_name,
                device_id=payload.device_id,
                app_version=payload.app_version,
                build_version=payload.build_version,
                environment=_normalize_environment(payload.environment),
                is_active=True,
                last_seen_at=now,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return row

        existing.platform = _normalize_platform(payload.platform)
        existing.device_name = payload.device_name
        existing.device_id = payload.device_id
        existing.app_version = payload.app_version
        existing.build_version = payload.build_version
        existing.environment = _normalize_environment(payload.environment)
        existing.is_active = True
        existing.revoked_at = None
        existing.last_seen_at = now
        db.commit()
        db.refresh(existing)
        return existing

    row = UserDeviceToken(
        id=uuid.uuid4(),
        user_id=current_user.id,
        expo_push_token=token,
        platform=_normalize_platform(payload.platform),
        device_name=payload.device_name,
        device_id=payload.device_id,
        app_version=payload.app_version,
        build_version=payload.build_version,
        environment=_normalize_environment(payload.environment),
        is_active=True,
        last_seen_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/device-tokens/current")
def unregister_current_device_token(
    payload: DeviceTokenUnregister = Body(default_factory=DeviceTokenUnregister),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Deactivate the current device push token on logout."""
    now = datetime.now(timezone.utc)
    query = db.query(UserDeviceToken).filter(
        UserDeviceToken.user_id == current_user.id,
        UserDeviceToken.is_active.is_(True),
    )
    if payload.expo_push_token:
        query = query.filter(UserDeviceToken.expo_push_token == payload.expo_push_token.strip())

    rows = query.all()
    for row in rows:
        row.is_active = False
        row.revoked_at = now
    db.commit()
    return {"message": "Device token unregistered."}


@router.delete("/device-tokens/{token_id}")
def unregister_device_token(
    token_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Deactivate a specific device token owned by the current user."""
    row = db.get(UserDeviceToken, token_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device token not found.")
    row.is_active = False
    row.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Device token unregistered."}


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    """Mark a notification as read."""
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if notif.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this notification",
        )

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)
    RealtimeService.emit_notification_read(current_user.id, notification_id)
    return notif


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Mark all unread notifications for the current user as read."""
    now = datetime.now(timezone.utc)

    (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .update({Notification.is_read: True, Notification.read_at: now}, synchronize_session=False)
    )

    db.commit()
    RealtimeService.emit_to_user(
        current_user.id,
        RealtimeService.event(
            "notifications_count_updated",
            {"user_id": str(current_user.id)},
        ),
    )
    return {"message": "All notifications marked as read."}
