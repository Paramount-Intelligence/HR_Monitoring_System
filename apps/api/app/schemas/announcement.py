"""Pydantic schemas for Announcement endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str
    audience: str = "all"
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool = True

class AnnouncementRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    content: str
    audience: str
    start_date: datetime | None
    end_date: datetime | None
    created_by: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = None
    audience: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None
