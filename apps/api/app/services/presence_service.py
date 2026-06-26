"""User presence status updates."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import PresenceStatus
from app.models.user import User
from app.services.realtime_service import RealtimeService


def update_user_presence(db: Session, user: User, presence_status: str) -> User:
    try:
        status_value = PresenceStatus(presence_status).value
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="presence_status must be 'active' or 'away'",
        ) from exc

    now = datetime.now(timezone.utc)
    user.presence_status = status_value
    user.presence_updated_at = now
    user.last_seen_at = now
    db.commit()
    db.refresh(user)

    RealtimeService.emit_user_presence_updated(user)
    return user


def touch_user_last_seen(db: Session, user: User) -> None:
    user.last_seen_at = datetime.now(timezone.utc)
    db.commit()
