"""Pydantic schemas for Attendance endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import AttendanceSessionStatus, WorkMode


class CheckInRequest(BaseModel):
    work_mode: WorkMode


class CorrectionRequest(BaseModel):
    requested_check_in_at: datetime | None = None
    requested_check_out_at: datetime | None = None
    reason: str


class CorrectionResolveRequest(BaseModel):
    action: str  # 'approve', 'reject', or 'clarify'
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    manager_comment: str | None = None


class AttendanceSessionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    check_in_at: datetime
    check_out_at: datetime | None
    work_mode: WorkMode
    session_status: AttendanceSessionStatus
    correction_requested: bool
    correction_reason: str | None
    is_late_login: bool
    is_early_logout: bool
    created_at: datetime
    updated_at: datetime
    duration_minutes: int | None = None

    @model_validator(mode="after")
    def compute_duration(self) -> "AttendanceSessionRead":
        if self.check_in_at and self.check_out_at:
            delta = self.check_out_at - self.check_in_at
            self.duration_minutes = max(0, int(delta.total_seconds() // 60))
        return self
