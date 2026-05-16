"""Pydantic schemas for Shifts."""
from __future__ import annotations

import uuid
from datetime import time
from pydantic import BaseModel

class ShiftCreate(BaseModel):
    name: str
    description: str | None = None
    start_time: time
    end_time: time
    timezone: str = "Asia/Karachi"
    grace_period_minutes: int = 15
    working_days: str = "1,2,3,4,5"
    is_active: bool = True

class ShiftUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    timezone: str | None = None
    grace_period_minutes: int | None = None
    working_days: str | None = None
    is_active: bool | None = None

class ShiftRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    start_time: time
    end_time: time
    timezone: str
    grace_period_minutes: int
    working_days: str
    is_active: bool
