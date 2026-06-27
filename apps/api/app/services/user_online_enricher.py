"""Attach live online fields to user API payloads."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.communication import UserMinimal
from app.schemas.user import UserDirectoryRead, UserRead
from app.services.online_presence_service import OnlinePresenceService


class UserOnlineEnricher:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._service = OnlinePresenceService(db)

    def offline_defaults(self) -> dict:
        return {
            "online_state": "offline",
            "is_online": False,
        }

    def enrich_dict(self, data: dict, online_map: dict[uuid.UUID, dict] | None = None) -> dict:
        raw_id = data.get("id")
        if not raw_id:
            data.setdefault("online_state", "offline")
            data.setdefault("is_online", False)
            return data
        uid = raw_id if isinstance(raw_id, uuid.UUID) else uuid.UUID(str(raw_id))
        if online_map is None:
            online_map = self._service.get_users_online_state([uid])
        state = online_map.get(uid, {**self.offline_defaults(), "last_seen_at": data.get("last_seen_at"), "platforms": []})
        data["online_state"] = state["online_state"]
        data["is_online"] = state["is_online"]
        if state.get("last_seen_at") is not None:
            data["last_seen_at"] = state["last_seen_at"]
        return data

    def enrich_user_read(self, user: User) -> UserRead:
        data = UserRead.model_validate(user).model_dump()
        self.enrich_dict(data)
        return UserRead(**data)

    def enrich_user_reads(self, users: list[User]) -> list[UserRead]:
        if not users:
            return []
        online_map = self._service.get_users_online_state([u.id for u in users])
        return [UserRead(**self.enrich_dict(UserRead.model_validate(u).model_dump(), online_map)) for u in users]

    def enrich_directory_reads(self, entries: list[dict]) -> list[UserDirectoryRead]:
        if not entries:
            return []
        ids = [uuid.UUID(str(entry["id"])) for entry in entries]
        online_map = self._service.get_users_online_state(ids)
        enriched = [UserDirectoryRead(**self.enrich_dict(dict(entry), online_map)) for entry in entries]
        return enriched

    def enrich_user_minimal(self, user: User, online_map: dict[uuid.UUID, dict] | None = None) -> UserMinimal:
        data = UserMinimal.model_validate(user).model_dump()
        self.enrich_dict(data, online_map)
        return UserMinimal(**data)

    def enrich_user_minimals(self, users: list[User]) -> dict[uuid.UUID, UserMinimal]:
        if not users:
            return {}
        online_map = self._service.get_users_online_state([u.id for u in users])
        return {u.id: self.enrich_user_minimal(u, online_map) for u in users}
