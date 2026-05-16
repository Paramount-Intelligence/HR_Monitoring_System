"""Pydantic schemas for Holiday endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field

class HolidayCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    holiday_date: date
    is_active: bool = True

class HolidayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    holiday_date: date | None = None
    is_active: bool | None = None

class HolidayRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    holiday_date: date
    is_active: bool
    created_at: datetime
    updated_at: datetime
