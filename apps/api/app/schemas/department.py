"""Pydantic schemas for Department endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    admin_id: uuid.UUID | None = None

class DepartmentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    admin_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
