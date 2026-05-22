"""Pydantic schemas for User endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

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


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


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
    created_at: datetime
    updated_at: datetime


class UserDirectoryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    department: str | None = None



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
