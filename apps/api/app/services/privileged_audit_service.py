"""Audit logging for denied privileged actions."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User


class PrivilegedAuditService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log_denied(
        self,
        *,
        actor: User,
        action: str,
        resource_type: str,
        resource_id: uuid.UUID | None = None,
        reason: str,
        commit: bool = True,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type=resource_type,
                entity_id=resource_id or actor.id,
                new_value={
                    "outcome": "denied",
                    "reason": reason,
                    "actor_role": actor.role.value if isinstance(actor.role, UserRole) else str(actor.role),
                },
            )
        )
        if commit:
            self.db.commit()
