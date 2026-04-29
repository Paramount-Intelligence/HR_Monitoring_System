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
    department: str | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None


class UserCreateResponse(BaseModel):
    user: UserRead
    debug_token: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    department: str | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None
    status: UserStatus | None = None
    role: UserRole | None = None


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    status: UserStatus
    department: str | None
    department_id: uuid.UUID | None
    designation: str | None
    manager_id: uuid.UUID | None
    shift_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
