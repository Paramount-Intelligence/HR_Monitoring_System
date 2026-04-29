"""Audit log routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit_log import AuditLogRead

router = APIRouter()

@router.get("", response_model=list[AuditLogRead], summary="Get audit logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AuditLogRead]:
    """Get audit logs (admin only for now, could be expanded to manager scopes later)."""
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view audit logs")

    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return logs
