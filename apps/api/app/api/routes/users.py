"""User management routes with full RBAC."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user, get_db, require_admin, 
    require_admin_or_manager, require_permission,
    limit_resend_invite
)
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserCreateResponse, UserProfileUpdate, UserPasswordChange, UserDirectoryRead
from app.services.user_service import UserService

router = APIRouter()


@router.post(
    "",
    response_model=UserCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (admin or manager)",
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> UserCreateResponse:
    from app.core.config import settings
    user, token = UserService(db).create_user(payload, actor=actor)
    debug_token = token if settings.app_env == "development" else None
    return UserCreateResponse(user=UserRead.from_orm(user), debug_token=debug_token)


@router.get("", response_model=list[UserRead], summary="List users (scoped by role)")
def list_users(
    role: UserRole | None = Query(None),
    manager_id: uuid.UUID | None = Query(None),
    status_filter: UserStatus | None = Query(None, alias="status"),
    department: str | None = Query(None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[UserRead]:
    return UserService(db).list_users(
        role=role,
        manager_id=manager_id,
        status_filter=status_filter,
        department=department,
        actor=actor,
    )


@router.get("/active-directory", response_model=list[UserDirectoryRead], summary="List active users for meeting directory")
def list_active_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserDirectoryRead]:
    """Get active users in organization for meeting invites.
    Accessible by any active logged-in user. Exposes only safe basic identity fields.
    """
    active_users = (
        db.query(User)
        .filter(User.status == UserStatus.ACTIVE)
        .order_by(User.full_name)
        .all()
    )
    return active_users


@router.get("/me", response_model=UserRead, summary="Get current user profile")
def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    return current_user



@router.patch("/me/profile", response_model=UserRead, summary="Update current user profile details")
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/change-password", summary="Change current user password")
def change_my_password(
    payload: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.security import verify_password, hash_password
    from fastapi import HTTPException
    
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password."
        )
    
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/{user_id}", response_model=UserRead, summary="Get user by ID")
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    svc = UserService(db)
    user = svc.get_by_id(user_id)
    # Employees can only view their own profile
    if actor.role == UserRole.EMPLOYEE and actor.id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    # Managers can only view users in their team
    if actor.role == UserRole.MANAGER and user.manager_id != actor.id and actor.id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return user


@router.patch("/{user_id}", response_model=UserRead, summary="Update user profile or status")
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    return UserService(db).update_user(user_id, payload, actor=actor)


@router.delete(
    "/{user_id}",
    response_model=UserRead,
    summary="Deactivate a user (admin only)",
)
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserRead:
    return UserService(db).deactivate_user(user_id, actor=actor)


@router.post(
    "/{user_id}/suspend",
    response_model=UserRead,
    summary="Suspend a user (admin only)",
)
def suspend_user(
    user_id: uuid.UUID,
    reason: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserRead:
    return UserService(db).suspend_user(user_id, actor=actor, reason=reason)


@router.post(
    "/{user_id}/activate",
    response_model=UserRead,
    summary="Reactivate a user (admin or HR)",
)
def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    return UserService(db).activate_user(user_id, actor=actor)
@router.post(
    "/{user_id}/resend-invite",
    status_code=status.HTTP_200_OK,
    summary="Resend invitation email (admin or manager)",
    dependencies=[Depends(limit_resend_invite)]
)
def resend_invitation(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
):
    UserService(db).resend_invitation(user_id, actor=actor)
    return {"message": "Invitation email resent successfully"}

from app.schemas.user import AdminUserProfileAggregate
from typing import Optional

@router.get(
    "/{user_id}/admin-profile",
    response_model=AdminUserProfileAggregate,
    summary="Get aggregated 360 profile for an employee (admin only)"
)
def get_admin_user_profile(
    user_id: uuid.UUID,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> dict:
    return UserService(db).get_admin_user_profile(
        user_id=user_id, 
        actor=actor, 
        start_date=start_date, 
        end_date=end_date, 
        limit=limit
    )
