"""User management routes with full RBAC."""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status, Request
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user, get_db, require_admin,
    require_admin_hr, require_admin_or_manager, require_permission,
    limit_resend_invite
)
from app.core.time_utils import pk_now
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserCreateResponse, UserProfileUpdate, UserPasswordChange, UserDirectoryRead, UserProfilePictureUpdate
from app.services.profile_image_storage import ProfileImageStorageService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=UserCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (admin or HR only)",
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_hr),
) -> UserCreateResponse:
    from app.core.config import settings
    user, token, email_sent, email_error = UserService(db).create_user(payload, actor=actor)
    debug_token = token if settings.app_env == "development" else None
    return UserCreateResponse(
        user=UserRead.from_orm(user),
        debug_token=debug_token,
        invitation_email_sent=email_sent,
        email_error=email_error
    )


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


@router.get("/active-directory", response_model=list[UserDirectoryRead], summary="List scoped active users for messaging")
def list_active_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserDirectoryRead]:
    """Return users the caller may message, with minimal fields."""
    from app.services.directory_service import DirectoryService

    entries = DirectoryService(db).list_active_directory(current_user)
    return [UserDirectoryRead.model_validate(entry) for entry in entries]


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


def _apply_profile_picture_url(user: User, avatar_url: str | None) -> None:
    user.avatar_url = avatar_url
    if not avatar_url:
        user.avatar_file_name = None
        user.avatar_content_type = None
        user.avatar_size = None
        user.avatar_updated_at = None


def _clear_profile_picture(user: User, storage: ProfileImageStorageService) -> None:
    storage.delete_by_url(user.avatar_url)
    storage.delete_by_filename(user.avatar_file_name)
    _apply_profile_picture_url(user, None)


async def _save_uploaded_profile_picture(
    user: User,
    file: UploadFile,
    storage: ProfileImageStorageService,
) -> None:
    logger.info("[PROFILE_PICTURE_UPLOAD] received user_id=%s", user.id)
    data, ext, content_type = await storage.read_and_validate(file)
    logger.info(
        "[PROFILE_PICTURE_UPLOAD] mime_type=%s file_size=%s storage_driver=%s",
        content_type,
        len(data),
        storage.storage_driver_label,
    )
    storage.delete_by_url(user.avatar_url)
    storage.delete_by_filename(user.avatar_file_name)
    storage_key, public_url = storage.save(user.id, data, ext, content_type)
    user.avatar_url = public_url
    user.avatar_file_name = storage_key
    user.avatar_content_type = content_type
    user.avatar_size = len(data)
    user.avatar_updated_at = pk_now()
    logger.info(
        "[PROFILE_PICTURE_UPLOAD] saved key=%s user_updated=True url=%s",
        storage_key,
        public_url,
    )


def _assert_profile_picture_access(actor: User, target_user_id: uuid.UUID) -> None:
    is_self = actor.id == target_user_id
    is_admin_hr = actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS)
    if not is_self and not is_admin_hr:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.patch("/me/profile-picture", response_model=UserRead, summary="Upload current user profile picture")
async def upload_my_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    storage = ProfileImageStorageService()
    await _save_uploaded_profile_picture(current_user, file, storage)
    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.delete("/me/profile-picture", response_model=UserRead, summary="Remove current user profile picture")
def delete_my_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    storage = ProfileImageStorageService()
    _clear_profile_picture(current_user, storage)
    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.patch("/{user_id}/profile-picture", response_model=UserRead, summary="Upload user profile picture (admin/HR or self)")
async def upload_user_profile_picture(
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    _assert_profile_picture_access(actor, user_id)
    svc = UserService(db)
    user = svc.get_by_id(user_id)
    storage = ProfileImageStorageService()
    await _save_uploaded_profile_picture(user, file, storage)
    AdminUserService(db).write_audit(
        actor=actor,
        target_id=user.id,
        action="user.profile_picture_updated",
        new_value={"updated": True},
    )
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/{user_id}/profile-picture", response_model=UserRead, summary="Remove user profile picture (admin/HR or self)")
def delete_user_profile_picture(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    _assert_profile_picture_access(actor, user_id)
    svc = UserService(db)
    user = svc.get_by_id(user_id)
    storage = ProfileImageStorageService()
    _clear_profile_picture(user, storage)
    AdminUserService(db).write_audit(
        actor=actor,
        target_id=user.id,
        action="user.profile_picture_updated",
        new_value={"removed": True},
    )
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)

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
    svc.assert_actor_can_view_user(actor, user_id)
    user = AdminUserService(db).get_user_with_relations(user_id)
    return UserRead.model_validate(user)


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
    token, email_sent, email_error = UserService(db).resend_invitation(user_id, actor=actor)
    return {
        "message": "Invitation email resent successfully" if email_sent else "Invitation could not be sent. Check SMTP configuration.",
        "email_sent": email_sent,
        "email_error": email_error
    }

from app.schemas.user import AdminUserProfileAggregate
from app.schemas.admin_user import (
    UserRoleUpdate,
    UserDepartmentUpdate,
    UserDepartmentDetailsUpdate,
    UserStatusUpdate,
    UserReportingUpdate,
    UserAdminProfileUpdate,
    UserPermissionsRead,
    UserPermissionsUpdate,
    SecurityActionResponse,
    UserAdminSummary,
    UserAuditLogRead,
)
from app.services.admin_user_service import AdminUserService
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
) -> AdminUserProfileAggregate:
    return UserService(db).get_admin_user_profile(
        user_id=user_id, 
        actor=actor, 
        start_date=start_date, 
        end_date=end_date, 
        limit=limit
    )


@router.patch("/{user_id}/role", response_model=UserRead, summary="Change user role (admin/HR)")
def patch_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_role(user_id, payload.role, actor)
    return UserRead.model_validate(user)


@router.patch("/{user_id}/department", response_model=UserRead, summary="Change user department")
def patch_user_department(
    user_id: uuid.UUID,
    payload: UserDepartmentUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_department(
        user_id,
        department_id=payload.department_id,
        designation=payload.designation,
        clear_department=payload.clear_department,
        actor=actor,
    )
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}/department-details",
    response_model=UserRead,
    summary="Update department, shift, manager, and designation",
)
def patch_user_department_details(
    user_id: uuid.UUID,
    payload: UserDepartmentDetailsUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_department_details(
        user_id,
        department_id=payload.department_id,
        shift_id=payload.shift_id,
        manager_id=payload.manager_id,
        designation=payload.designation,
        actor=actor,
    )
    return UserRead.model_validate(user)


@router.patch("/{user_id}/status", response_model=UserRead, summary="Change user status")
def patch_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_status(user_id, payload.status, actor)
    return UserRead.model_validate(user)


@router.patch("/{user_id}/reporting", response_model=UserRead, summary="Update reporting line")
def patch_user_reporting(
    user_id: uuid.UUID,
    payload: UserReportingUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_reporting(
        user_id,
        manager_id=payload.manager_id,
        shift_id=payload.shift_id,
        designation=payload.designation,
        update_manager=payload.update_manager,
        update_shift=payload.update_shift,
        actor=actor,
    )
    return UserRead.model_validate(user)


@router.patch("/{user_id}/admin-profile", response_model=UserRead, summary="Admin update user profile fields")
def patch_user_admin_profile(
    user_id: uuid.UUID,
    payload: UserAdminProfileUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> UserRead:
    user = AdminUserService(db).update_profile(
        user_id,
        full_name=payload.full_name,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        designation=payload.designation,
        actor=actor,
    )
    return UserRead.model_validate(user)


@router.get("/{user_id}/permissions", response_model=UserPermissionsRead, summary="Get user permissions detail")
def get_user_permissions_detail(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict:
    return AdminUserService(db).get_permissions_detail(user_id, actor)


@router.patch("/{user_id}/permissions", response_model=UserPermissionsRead, summary="Update user permission overrides")
def patch_user_permissions(
    user_id: uuid.UUID,
    payload: UserPermissionsUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict:
    return AdminUserService(db).update_permissions(user_id, payload, actor)


@router.post(
    "/{user_id}/send-password-reset",
    response_model=SecurityActionResponse,
    summary="Send password reset link to user",
    dependencies=[Depends(limit_resend_invite)],
)
def send_password_reset_link(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict:
    return AdminUserService(db).send_password_reset(user_id, actor)


@router.post(
    "/{user_id}/resend-invitation",
    response_model=SecurityActionResponse,
    summary="Resend invitation/setup link",
    dependencies=[Depends(limit_resend_invite)],
)
def resend_invitation_alias(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin_or_manager),
) -> dict:
    return AdminUserService(db).resend_invitation(user_id, actor)


@router.post(
    "/{user_id}/force-password-reset",
    response_model=SecurityActionResponse,
    summary="Force password reset on next login",
    dependencies=[Depends(limit_resend_invite)],
)
def force_password_reset(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict:
    return AdminUserService(db).force_password_reset(user_id, actor)


@router.get("/{user_id}/admin-summary", response_model=UserAdminSummary, summary="Admin activity summary")
def get_user_admin_summary(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict:
    return AdminUserService(db).get_admin_summary(user_id, actor)


@router.get("/{user_id}/audit-logs", response_model=list[UserAuditLogRead], summary="User audit history")
def get_user_audit_logs(
    user_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list:
    logs = AdminUserService(db).get_audit_logs(user_id, actor, limit=limit)
    return [
        {
            "id": log.id,
            "action_type": log.action_type,
            "actor_user_id": log.actor_user_id,
            "actor_name": log.actor_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "created_at": log.created_at,
        }
        for log in logs
    ]
