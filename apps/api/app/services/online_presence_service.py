"""Live online presence — heartbeat sessions, TTL resolution, realtime events."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.user_presence_session import UserPresenceSession
from app.services.realtime_service import RealtimeService

logger = logging.getLogger(__name__)

ALLOWED_PLATFORMS = frozenset({"web", "mobile"})
OFFLINE_PAYLOAD = {
    "online_state": "offline",
    "is_online": False,
    "last_seen_at": None,
    "platforms": [],
}


class OnlinePresenceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ttl_seconds = max(int(settings.online_presence_ttl_seconds), 30)

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _cutoff(self) -> datetime:
        return self._now() - timedelta(seconds=self.ttl_seconds)

    def _validate_platform(self, platform: str) -> str:
        value = (platform or "").strip().lower()
        if value not in ALLOWED_PLATFORMS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="platform must be 'web' or 'mobile'",
            )
        return value

    def _mark_stale_sessions_offline(self, user_id: uuid.UUID | None = None) -> None:
        cutoff = self._cutoff()
        now = self._now()
        query = self.db.query(UserPresenceSession).filter(
            UserPresenceSession.status == "online",
            UserPresenceSession.last_seen_at < cutoff,
        )
        if user_id:
            query = query.filter(UserPresenceSession.user_id == user_id)
        for session in query.all():
            session.status = "offline"
            session.disconnected_at = now

    def _live_sessions_query(self, user_id: uuid.UUID):
        self._mark_stale_sessions_offline(user_id)
        cutoff = self._cutoff()
        return self.db.query(UserPresenceSession).filter(
            UserPresenceSession.user_id == user_id,
            UserPresenceSession.status == "online",
            UserPresenceSession.last_seen_at >= cutoff,
        )

    def is_user_online(self, user_id: uuid.UUID) -> bool:
        return self._live_sessions_query(user_id).count() > 0

    def get_user_online_state(self, user_id: uuid.UUID) -> dict:
        sessions = self._live_sessions_query(user_id).all()
        if not sessions:
            user = self.db.get(User, user_id)
            last_seen = user.last_seen_at if user else None
            return {
                "online_state": "offline",
                "is_online": False,
                "last_seen_at": last_seen,
                "platforms": [],
            }
        platforms = sorted({s.platform for s in sessions if s.platform in ALLOWED_PLATFORMS})
        latest = max(s.last_seen_at for s in sessions)
        return {
            "online_state": "online",
            "is_online": True,
            "last_seen_at": latest,
            "platforms": platforms,
        }

    def get_users_online_state(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict]:
        if not user_ids:
            return {}
        unique_ids = list(dict.fromkeys(user_ids))
        self._mark_stale_sessions_offline()
        cutoff = self._cutoff()
        rows = (
            self.db.query(UserPresenceSession)
            .filter(
                UserPresenceSession.user_id.in_(unique_ids),
                UserPresenceSession.status == "online",
                UserPresenceSession.last_seen_at >= cutoff,
            )
            .all()
        )
        grouped: dict[uuid.UUID, list[UserPresenceSession]] = {}
        for row in rows:
            grouped.setdefault(row.user_id, []).append(row)

        result: dict[uuid.UUID, dict] = {}
        for uid in unique_ids:
            sessions = grouped.get(uid, [])
            if not sessions:
                user = self.db.get(User, uid)
                result[uid] = {
                    "online_state": "offline",
                    "is_online": False,
                    "last_seen_at": user.last_seen_at if user else None,
                    "platforms": [],
                }
            else:
                platforms = sorted({s.platform for s in sessions})
                latest = max(s.last_seen_at for s in sessions)
                result[uid] = {
                    "online_state": "online",
                    "is_online": True,
                    "last_seen_at": latest,
                    "platforms": platforms,
                }
        return result

    def _emit_online_state_if_changed(
        self,
        user: User,
        *,
        was_online: bool,
    ) -> None:
        now_online = self.is_user_online(user.id)
        if was_online == now_online:
            return
        state = self.get_user_online_state(user.id)
        try:
            RealtimeService.emit_user_online_state_updated(
                user_id=user.id,
                online_state=state["online_state"],
                last_seen_at=state["last_seen_at"],
                platforms=state["platforms"],
            )
        except Exception:
            logger.exception("Failed to emit user_online_state_updated for user %s", user.id)

    def _upsert_session(
        self,
        user: User,
        *,
        device_id: str,
        platform: str,
        connection_id: str | None = None,
        user_agent: str | None = None,
        app_version: str | None = None,
    ) -> UserPresenceSession:
        platform = self._validate_platform(platform)
        now = self._now()
        session = (
            self.db.query(UserPresenceSession)
            .filter_by(user_id=user.id, device_id=device_id, platform=platform)
            .first()
        )
        if session:
            session.status = "online"
            session.last_seen_at = now
            session.disconnected_at = None
            if connection_id:
                session.connection_id = connection_id
            if user_agent:
                session.user_agent = user_agent
            if app_version:
                session.app_version = app_version
        else:
            session = UserPresenceSession(
                user_id=user.id,
                device_id=device_id,
                platform=platform,
                connection_id=connection_id,
                status="online",
                last_seen_at=now,
                connected_at=now,
                user_agent=user_agent,
                app_version=app_version,
            )
            self.db.add(session)
        user.last_seen_at = now
        return session

    def heartbeat(
        self,
        user: User,
        *,
        device_id: str,
        platform: str,
        app_state: str | None = None,
        user_agent: str | None = None,
        app_version: str | None = None,
    ) -> dict:
        was_online = self.is_user_online(user.id)
        self._upsert_session(
            user,
            device_id=device_id.strip(),
            platform=platform,
            user_agent=user_agent,
            app_version=app_version,
        )
        self.db.commit()
        self.db.refresh(user)
        self._emit_online_state_if_changed(user, was_online=was_online)
        state = self.get_user_online_state(user.id)
        return {
            "user_id": user.id,
            **state,
        }

    def go_offline(
        self,
        user: User,
        *,
        device_id: str,
        platform: str,
    ) -> dict:
        platform = self._validate_platform(platform)
        was_online = self.is_user_online(user.id)
        now = self._now()
        session = (
            self.db.query(UserPresenceSession)
            .filter_by(user_id=user.id, device_id=device_id.strip(), platform=platform)
            .first()
        )
        if session:
            session.status = "offline"
            session.disconnected_at = now
            session.last_seen_at = now
        user.last_seen_at = now
        self.db.commit()
        self._emit_online_state_if_changed(user, was_online=was_online)
        return self.get_user_online_state(user.id)

    def ws_connected(
        self,
        user: User,
        *,
        connection_id: str,
        platform: str = "web",
        user_agent: str | None = None,
    ) -> None:
        was_online = self.is_user_online(user.id)
        device_id = f"ws:{connection_id}"
        self._upsert_session(
            user,
            device_id=device_id,
            platform=platform,
            connection_id=connection_id,
            user_agent=user_agent,
        )
        self.db.commit()
        self._emit_online_state_if_changed(user, was_online=was_online)

    def ws_disconnected(
        self,
        user: User,
        *,
        connection_id: str,
    ) -> None:
        was_online = self.is_user_online(user.id)
        now = self._now()
        device_id = f"ws:{connection_id}"
        sessions = (
            self.db.query(UserPresenceSession)
            .filter(
                UserPresenceSession.user_id == user.id,
                UserPresenceSession.connection_id == connection_id,
            )
            .all()
        )
        if not sessions:
            sessions = (
                self.db.query(UserPresenceSession)
                .filter_by(user_id=user.id, device_id=device_id)
                .all()
            )
        for session in sessions:
            session.status = "offline"
            session.disconnected_at = now
            session.last_seen_at = now
        user.last_seen_at = now
        self.db.commit()
        self._emit_online_state_if_changed(user, was_online=was_online)
