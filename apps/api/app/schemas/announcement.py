"""Pydantic schemas for Announcement endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str
    is_active: bool = True

class AnnouncementRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    content: str
    created_by: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
