from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.user import User


def can_review_eod_submitter(db: Session, actor: User, submitter_id: uuid.UUID) -> bool:
    """True when actor may approve/reject/request revision on submitter's EOD."""
    if actor.id == submitter_id:
        return False
    if actor.role == UserRole.HR_OPERATIONS:
        return False
    submitter = db.get(User, submitter_id)
    if not submitter:
        return False
    return submitter.manager_id == actor.id
