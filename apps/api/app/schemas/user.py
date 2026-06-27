"""Pydantic schemas for User endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.enums import UserRole, UserStatus


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str | None = Field(None, min_length=8)
    role: UserRole
    phone: str | None = None
    department: str | None = None
    department_id: uuid.UUID | None = None
    shift_id: uuid.UUID | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None


class UserCreateResponse(BaseModel):
    user: UserRead
    debug_token: str | None = None
    invitation_email_sent: bool = True
    email_error: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = None
    department: str | None = None
    department_id: uuid.UUID | None = None
    shift_id: uuid.UUID | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None
    status: UserStatus | None = None
    role: UserRole | None = None


class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=50)


class UserProfilePictureUpdate(BaseModel):
    """Legacy JSON body for URL-based updates (deprecated). Prefer multipart upload."""
    avatar_url: str | None = Field(None, max_length=2048)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        v = v.strip()
        if v.startswith("/media/profile-pictures/"):
            return v
        if v.startswith("/api/v1/media/profile-pictures/"):
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Profile picture URL must be a valid HTTP or HTTPS URL.")
        return v


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class UserPresenceUpdate(BaseModel):
    presence_status: str = Field(..., pattern="^(active|away)$")


class UserPresenceRead(BaseModel):
    presence_status: str
    presence_updated_at: datetime | None = None
    last_seen_at: datetime | None = None


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    phone: str | None = None
    email: str
    role: UserRole
    status: UserStatus
    department: str | None
    department_id: uuid.UUID | None
    department_name: str | None = None
    designation: str | None
    manager_id: uuid.UUID | None
    manager_name: str | None = None
    shift_id: uuid.UUID | None
    shift_name: str | None = None
    shift_timing: str | None = None
    avatar_url: str | None = None
    avatar_updated_at: datetime | None = None
    profile_picture_url: str | None = None
    profile_picture_updated_at: datetime | None = None
    profile_picture_content_type: str | None = None
    profile_picture_size: int | None = None
    presence_status: str = "active"
    presence_updated_at: datetime | None = None
    last_seen_at: datetime | None = None
    online_state: str = "offline"
    is_online: bool = False
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_profile_picture_fields(cls, data):
        if isinstance(data, dict):
            url = data.get("avatar_url") or data.get("profile_picture_url")
            data.setdefault("profile_picture_url", url)
            data.setdefault("avatar_url", url)
            data.setdefault("profile_picture_updated_at", data.get("avatar_updated_at"))
            data.setdefault("profile_picture_content_type", data.get("avatar_content_type"))
            data.setdefault("profile_picture_size", data.get("avatar_size"))
            return data
        if hasattr(data, "avatar_url"):
            return {
                "id": data.id,
                "full_name": data.full_name,
                "phone": data.phone,
                "email": data.email,
                "role": data.role,
                "status": data.status,
                "department": data.department,
                "department_id": data.department_id,
                "department_name": getattr(data, "department_name", None),
                "designation": data.designation,
                "manager_id": data.manager_id,
                "manager_name": getattr(data, "manager_name", None),
                "shift_id": data.shift_id,
                "shift_name": getattr(data, "shift_name", None),
                "shift_timing": getattr(data, "shift_timing", None),
                "avatar_url": data.avatar_url,
                "avatar_updated_at": data.avatar_updated_at,
                "profile_picture_url": data.avatar_url,
                "profile_picture_updated_at": data.avatar_updated_at,
                "profile_picture_content_type": getattr(data, "avatar_content_type", None),
                "profile_picture_size": getattr(data, "avatar_size", None),
                "presence_status": getattr(data, "presence_status", "active") or "active",
                "presence_updated_at": getattr(data, "presence_updated_at", None),
                "last_seen_at": getattr(data, "last_seen_at", None),
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class UserDirectoryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    display_name: str | None = None
    email: str | None = None
    role: UserRole
    department: str | None = None
    department_name: str | None = None
    avatar_url: str | None = None
    profile_picture_url: str | None = None
    presence_status: str = "active"
    presence_updated_at: datetime | None = None
    last_seen_at: datetime | None = None
    online_state: str = "offline"
    is_online: bool = False

    @model_validator(mode="before")
    @classmethod
    def map_profile_picture(cls, data):
        if hasattr(data, "avatar_url"):
            dept = getattr(data, "department_name", None) or data.department
            return {
                "id": data.id,
                "full_name": data.full_name,
                "display_name": data.full_name,
                "email": getattr(data, "email", None),
                "role": data.role,
                "department": dept,
                "department_name": dept,
                "avatar_url": data.avatar_url,
                "profile_picture_url": data.avatar_url,
                "presence_status": getattr(data, "presence_status", "active") or "active",
                "presence_updated_at": getattr(data, "presence_updated_at", None),
                "last_seen_at": getattr(data, "last_seen_at", None),
            }
        if isinstance(data, dict):
            url = data.get("avatar_url") or data.get("profile_picture_url")
            data.setdefault("profile_picture_url", url)
            data.setdefault("avatar_url", url)
            data.setdefault("display_name", data.get("full_name"))
            data.setdefault("department_name", data.get("department_name") or data.get("department"))
        return data



from typing import Any
from app.schemas.attendance import AttendanceSessionRead, AttendanceBreakRead
from app.schemas.leave import LeaveRequestRead
from app.schemas.ops import EODReportRead
from app.schemas.task import TaskRead
from app.schemas.time_log import TimeLogRead
from app.schemas.project import ProjectRead
from app.schemas.growth import GoalRead, PersonalNoteRead

class AdminUserProfileAggregate(BaseModel):
    profile: UserRead
    attendance_summary: dict[str, Any]
    attendance_sessions: list[AttendanceSessionRead]
    breaks: list[AttendanceBreakRead]
    leave_requests: list[LeaveRequestRead]
    eod_submissions: list[EODReportRead]
    tasks: list[TaskRead]
    time_logs: list[TimeLogRead]
    projects: list[ProjectRead]
    goals: list[GoalRead]
    notes: list[PersonalNoteRead]
    activity_timeline: list[dict[str, Any]]
