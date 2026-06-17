"""Shared object- and field-level authorization for user read/write operations."""
from __future__ import annotations

import uuid
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import UserRole, UserStatus
from app.models.user import User

ADMIN_MANAGEMENT_ROLES = (UserRole.ADMIN, UserRole.HR_OPERATIONS)
MANAGEMENT_VIEW_ROLES = (UserRole.MANAGER, UserRole.TEAM_LEAD)
SELF_SERVICE_ROLES = (UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.EMPLOYEE)

SELF_PROFILE_FIELDS = frozenset({"full_name", "phone"})

ADMIN_PATCH_FIELDS = frozenset(
    {
        "full_name",
        "phone",
        "department",
        "department_id",
        "shift_id",
        "designation",
        "manager_id",
        "status",
        "role",
    }
)

HR_PATCH_FIELDS = frozenset(
    {
        "full_name",
        "phone",
        "department",
        "department_id",
        "shift_id",
        "designation",
        "manager_id",
        "status",
    }
)

SENSITIVE_PATCH_FIELDS = frozenset(
    {"role", "status", "manager_id", "department_id", "shift_id", "department", "designation"}
)

FORBIDDEN_USER_MESSAGE = "You are not authorized to update this user."
FORBIDDEN_FIELDS_MESSAGE = "Not authorized to update one or more requested fields."


class UserAuthorizationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Read scope (mirrors list/get RBAC)
    # ------------------------------------------------------------------

    def can_view_user(self, actor: User, target: User) -> bool:
        if actor.id == target.id:
            return True
        if actor.role in ADMIN_MANAGEMENT_ROLES:
            return True
        if actor.role in MANAGEMENT_VIEW_ROLES:
            return target.manager_id == actor.id
        return False

    def assert_can_view_user(self, actor: User, target_user_id: uuid.UUID) -> User:
        user = self._get_user(target_user_id)
        if not self.can_view_user(actor, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        return user

    # ------------------------------------------------------------------
    # Write scope
    # ------------------------------------------------------------------

    def can_update_user(self, actor: User, target: User) -> bool:
        if actor.role in ADMIN_MANAGEMENT_ROLES:
            return True
        if actor.id == target.id:
            return True
        return False

    def allowed_patch_fields(self, actor: User, target: User) -> frozenset[str]:
        if actor.role == UserRole.ADMIN:
            return ADMIN_PATCH_FIELDS
        if actor.role == UserRole.HR_OPERATIONS:
            return HR_PATCH_FIELDS
        if actor.id == target.id:
            if actor.role in SELF_SERVICE_ROLES or actor.role in MANAGEMENT_VIEW_ROLES:
                return SELF_PROFILE_FIELDS
        return frozenset()

    def assert_can_update_user(
        self,
        actor: User,
        target: User,
        requested_fields: Iterable[str],
    ) -> None:
        fields = set(requested_fields)

        if not self.can_update_user(actor, target):
            self._deny_update(
                actor=actor,
                target_id=target.id,
                action="user.update_denied",
                requested_fields=fields,
                message=FORBIDDEN_USER_MESSAGE,
            )

        if not fields:
            return

        allowed = self.allowed_patch_fields(actor, target)
        forbidden = fields - allowed
        if forbidden:
            self._deny_update(
                actor=actor,
                target_id=target.id,
                action="user.update_fields_denied",
                requested_fields=fields,
                message=FORBIDDEN_FIELDS_MESSAGE,
                extra={"forbidden_fields": sorted(forbidden)},
            )

    # ------------------------------------------------------------------
    # Audit helpers
    # ------------------------------------------------------------------

    def log_successful_update(
        self,
        *,
        actor: User,
        target_id: uuid.UUID,
        action: str,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type="user",
                entity_id=target_id,
                old_value=old_value,
                new_value=new_value,
            )
        )

    def log_denied_update(
        self,
        *,
        actor: User,
        target_id: uuid.UUID,
        action: str,
        requested_fields: Iterable[str],
        extra: dict | None = None,
    ) -> None:
        fields = set(requested_fields)
        should_log = action == "user.update_denied" or bool(fields & SENSITIVE_PATCH_FIELDS)
        if not should_log:
            return
        payload: dict = {"requested_fields": sorted(fields)}
        if extra:
            payload.update(extra)
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type="user",
                entity_id=target_id,
                new_value=payload,
            )
        )
        self.db.commit()

    def _deny_update(
        self,
        *,
        actor: User,
        target_id: uuid.UUID,
        action: str,
        requested_fields: set[str],
        message: str,
        extra: dict | None = None,
    ) -> None:
        should_log = (
            action == "user.update_denied"
            or bool(requested_fields & SENSITIVE_PATCH_FIELDS)
        )
        if should_log:
            payload: dict = {"requested_fields": sorted(requested_fields)}
            if extra:
                payload.update(extra)
            self.db.add(
                AuditLog(
                    actor_user_id=actor.id,
                    action_type=action,
                    entity_type="user",
                    entity_id=target_id,
                    new_value=payload,
                )
            )
            self.db.commit()

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)

    def _get_user(self, user_id: uuid.UUID) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user
