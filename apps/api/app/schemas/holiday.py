"""Pydantic schemas for Holiday endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field

class HolidayCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    holiday_date: date

class HolidayRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    holiday_date: date
    created_at: datetime
    updated_at: datetime
