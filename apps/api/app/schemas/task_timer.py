"""Pydantic schemas for TaskTimerSession endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer

from app.models.enums import TimerPauseReason, TimerSessionStatus


class TaskTimerRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    task_title: str | None = None
    project_title: str | None = None
    user_id: uuid.UUID
    status: TimerSessionStatus
    started_at: datetime
    last_resumed_at: datetime
    paused_at: datetime | None
    accumulated_seconds: int
    pause_reason: TimerPauseReason | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("started_at", "last_resumed_at", "paused_at", "created_at", "updated_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None: return None
        if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
        else: v = v.astimezone(timezone.utc)
        return v.isoformat().replace("+00:00", "Z")
