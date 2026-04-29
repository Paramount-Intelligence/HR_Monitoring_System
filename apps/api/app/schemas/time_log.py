"""Pydantic schemas for TimeLog endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import TimeLogSourceType, TimeLogStatus


class StartTimerRequest(BaseModel):
    task_id: uuid.UUID


class StopTimerRequest(BaseModel):
    task_id: uuid.UUID
    notes: str | None = None


class ManualTimeLogRequest(BaseModel):
    task_id: uuid.UUID
    started_at: datetime
    ended_at: datetime
    notes: str | None = None

    @model_validator(mode="after")
    def validate_order(self) -> "ManualTimeLogRequest":
        if self.ended_at <= self.started_at:
            raise ValueError("ended_at must be after started_at")
        return self


class TimeLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: int | None
    source_type: TimeLogSourceType
    notes: str | None
    status: TimeLogStatus
    created_at: datetime
    updated_at: datetime
