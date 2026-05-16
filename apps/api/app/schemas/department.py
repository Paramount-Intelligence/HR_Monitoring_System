"""Pydantic schemas for Department endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    admin_id: uuid.UUID | None = None
    is_active: bool = True

class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    admin_id: uuid.UUID | None = None
    is_active: bool | None = None

class DepartmentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    admin_id: uuid.UUID | None
    admin_name: str | None = None
    created_at: datetime
    updated_at: datetime
