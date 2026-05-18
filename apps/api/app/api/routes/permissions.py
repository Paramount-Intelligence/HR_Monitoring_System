"""Permission management routes — admin only."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_current_user, get_db, require_permission
from app.models.enums import UserRole
from app.models.permission import Permission, RolePermission, UserPermissionOverride
from app.models.user import User

router = APIRouter()


class UserPermissionOverrideCreate(BaseModel):
    user_id: uuid.UUID
    permission_key: str
    granted: bool = True


@router.get("", include_in_schema=False)
@router.get("/", summary="List all permission keys (admin only)")
def list_permissions(
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("permissions.manage"))
) -> list[dict]:
    perms = db.query(Permission).order_by(Permission.key).all()
    return [{"key": p.key, "description": p.description} for p in perms]


@router.get("/role/{role}", summary="Get permissions for a specific role")
def get_role_permissions(
    role: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("permissions.manage"))
) -> list[str]:
    role_perms = db.query(RolePermission).filter(RolePermission.role == role).all()
    return [rp.permission_key for rp in role_perms]


@router.post("/user-override", summary="Grant or revoke a permission for a specific user")
def set_user_permission_override(
    payload: UserPermissionOverrideCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("permissions.manage"))
) -> dict:
    # Check if user exists
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Upsert override
    existing = db.query(UserPermissionOverride).filter(
        UserPermissionOverride.user_id == payload.user_id,
        UserPermissionOverride.permission_key == payload.permission_key
    ).first()

    if existing:
        existing.granted = payload.granted
    else:
        db.add(UserPermissionOverride(
            user_id=payload.user_id,
            permission_key=payload.permission_key,
            granted=payload.granted
        ))

    db.commit()
    action = "granted" if payload.granted else "revoked"
    return {"message": f"Permission '{payload.permission_key}' {action} for user {payload.user_id}"}


@router.get("/user/{user_id}", summary="Get resolved permissions for a specific user")
def get_user_resolved_permissions(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("permissions.manage"))
) -> dict:
    from app.core.deps import get_user_permissions
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    perms = get_user_permissions(user, db)
    return {
        "user_id": str(user_id),
        "role": user.role.value,
        "permissions": sorted(list(perms))
    }
