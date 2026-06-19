"""Scoped user directory for messaging and collaboration."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import UserRole, UserStatus
from app.models.user import User

DIRECTORY_PRIVILEGED_ROLES = (UserRole.ADMIN, UserRole.HR_OPERATIONS)


class DirectoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_messageable_user_ids(self, actor: User) -> set[uuid.UUID]:
        """Users the actor may discover or start a direct conversation with."""
        if actor.role in DIRECTORY_PRIVILEGED_ROLES:
            rows = (
                self.db.query(User.id)
                .filter(User.status == UserStatus.ACTIVE)
                .all()
            )
            return {row[0] for row in rows}

        allowed: set[uuid.UUID] = {actor.id}

        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            team_rows = (
                self.db.query(User.id)
                .filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE)
                .all()
            )
            allowed.update(row[0] for row in team_rows)
            if actor.manager_id:
                allowed.add(actor.manager_id)
            return allowed

        if actor.manager_id:
            allowed.add(actor.manager_id)
            teammate_rows = (
                self.db.query(User.id)
                .filter(
                    User.manager_id == actor.manager_id,
                    User.status == UserStatus.ACTIVE,
                )
                .all()
            )
            allowed.update(row[0] for row in teammate_rows)

        return allowed

    def assert_can_message_user(self, actor: User, target_user_id: uuid.UUID) -> User:
        target = self.db.get(User, target_user_id)
        if not target or target.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified participant is not active.",
            )
        if target_user_id not in self.get_messageable_user_ids(actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to message this user.",
            )
        return target

    def list_active_directory(self, actor: User) -> list[dict]:
        allowed_ids = self.get_messageable_user_ids(actor)
        if not allowed_ids:
            return []

        users = (
            self.db.query(User)
            .filter(User.id.in_(allowed_ids), User.status == UserStatus.ACTIVE)
            .order_by(User.full_name)
            .all()
        )
        include_email = actor.role in DIRECTORY_PRIVILEGED_ROLES
        return [self._serialize_entry(user, include_email=include_email) for user in users]

    @staticmethod
    def _serialize_entry(user: User, *, include_email: bool) -> dict:
        dept = user.department_name if hasattr(user, "department_name") else user.department
        entry = {
            "id": user.id,
            "full_name": user.full_name,
            "display_name": user.full_name,
            "role": user.role,
            "department": dept,
            "department_name": dept,
            "avatar_url": user.avatar_url,
            "profile_picture_url": user.avatar_url,
            "email": user.email if include_email else None,
        }
        return entry
