"""User notification preference persistence and defaults."""
from __future__ import annotations

import uuid
from datetime import datetime, time, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_notification_preferences import UserNotificationPreferences
from app.schemas.notification_preferences import NotificationPreferencesUpdate


def get_or_create_preferences(db: Session, user_id: uuid.UUID) -> UserNotificationPreferences:
    prefs = (
        db.query(UserNotificationPreferences)
        .filter(UserNotificationPreferences.user_id == user_id)
        .first()
    )
    if prefs:
        return prefs

    prefs = UserNotificationPreferences(user_id=user_id)
    db.add(prefs)
    db.flush()
    return prefs


def update_preferences(
    db: Session,
    user: User,
    payload: NotificationPreferencesUpdate,
) -> UserNotificationPreferences:
    prefs = get_or_create_preferences(db, user.id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(prefs, key, value)
    prefs.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(prefs)
    return prefs
