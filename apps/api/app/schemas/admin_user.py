"""Schemas for admin user lifecycle management."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole, UserStatus
from app.schemas.user import UserRead


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserDepartmentUpdate(BaseModel):
    department_id: uuid.UUID | None = None
    designation: str | None = None
    clear_department: bool = False


class UserStatusUpdate(BaseModel):
    status: UserStatus


class UserReportingUpdate(BaseModel):
    manager_id: uuid.UUID | None = None
    shift_id: uuid.UUID | None = None
    designation: str | None = None
    update_manager: bool = False
    update_shift: bool = False


class UserAdminProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    designation: str | None = None


class PermissionItemRead(BaseModel):
    key: str
    label: str
    category: str
    description: str


class UserPermissionsRead(BaseModel):
    user_id: uuid.UUID
    role: UserRole
    role_permissions: list[PermissionItemRead]
    extra_permissions: list[PermissionItemRead]
    denied_permissions: list[PermissionItemRead]
    resolved_permissions: list[str]


class UserPermissionsUpdate(BaseModel):
    extra_grants: list[str] = Field(default_factory=list)
    extra_denies: list[str] = Field(default_factory=list)


class SecurityActionResponse(BaseModel):
    message: str
    email_sent: bool
    email_error: str | None = None


class UserAdminSummary(BaseModel):
    user_id: uuid.UUID
    attendance: dict[str, Any]
    tasks: dict[str, Any]
    time_logs: dict[str, Any]
    leave: dict[str, Any]
    projects: dict[str, Any]
    eod: dict[str, Any]
    last_activity: str | None = None
    account_created_at: datetime
    last_login: str | None = None


class UserAuditLogRead(BaseModel):
    id: uuid.UUID
    action_type: str
    actor_user_id: uuid.UUID
    actor_name: str | None = None
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None
    created_at: datetime
