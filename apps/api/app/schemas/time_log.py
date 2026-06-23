"""Pydantic schemas for TimeLog endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, model_validator, field_serializer

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
    task_title: str | None = None
    user_id: uuid.UUID
    user_name: str | None = None
    project_title: str | None = None
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: int | None
    source_type: TimeLogSourceType
    notes: str | None
    status: TimeLogStatus
    created_at: datetime
    updated_at: datetime

    @field_serializer("started_at", "ended_at", "created_at", "updated_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None: return None
        if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
        else: v = v.astimezone(timezone.utc)
        return v.isoformat().replace("+00:00", "Z")
