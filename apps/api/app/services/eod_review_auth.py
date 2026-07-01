from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.enums import UserRole, UserStatus
from app.models.user import User


def can_review_eod_submitter(db: Session, actor: User, submitter_id: uuid.UUID) -> bool:
    """True when actor may approve/reject/request revision on submitter's EOD."""
    if actor.id == submitter_id:
        return False
    if actor.role == UserRole.HR_OPERATIONS:
        return False
    submitter = db.get(User, submitter_id)
    if not submitter or submitter.status != UserStatus.ACTIVE:
        return False
    if actor.role == UserRole.ADMIN:
        return True
    return submitter.manager_id == actor.id


def eod_review_team_members(db: Session, actor: User, scope: str) -> list[User]:
    """Users whose EOD reports the actor may list in EOD Reviews."""
    if scope == "organization" and actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        return (
            db.query(User)
            .filter(User.status == UserStatus.ACTIVE, User.id != actor.id)
            .order_by(User.full_name.asc())
            .all()
        )
    return (
        db.query(User)
        .filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE)
        .order_by(User.full_name.asc())
        .all()
    )
