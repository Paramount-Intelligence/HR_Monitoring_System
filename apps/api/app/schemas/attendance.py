"""Pydantic schemas for Attendance endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, model_validator, field_serializer

from app.models.enums import AttendanceClassification, AttendanceSessionStatus, WorkMode


class CheckInRequest(BaseModel):
    work_mode: WorkMode


class CheckOutRequest(BaseModel):
    reason: str | None = None  # 'overtime', 'forgot', etc.
    note: str | None = None


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
    user_full_name: str | None = None
    check_in_at: datetime
    check_out_at: datetime | None
    work_mode: WorkMode
    session_status: AttendanceSessionStatus
    correction_requested: bool
    correction_reason: str | None
    is_late_login: bool
    is_early_logout: bool
    is_overtime: bool = False
    is_corrected: bool
    attendance_classification: AttendanceClassification
    
    worked_minutes: int | None = None
    late_minutes: int | None = None
    early_checkout_minutes: int | None = None
    
    checkout_after_shift_reason: str | None = None
    checkout_after_shift_note: str | None = None
    
    expected_shift_start_at: datetime | None = None
    expected_shift_end_at: datetime | None = None
    
    created_at: datetime
    updated_at: datetime
    duration_minutes: int | None = None

    @field_serializer("check_in_at", "check_out_at", "expected_shift_start_at", "expected_shift_end_at", "created_at", "updated_at", when_used="always")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None:
            return None
        # Ensure UTC awareness
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        else:
            v = v.astimezone(timezone.utc)
            
        return v.isoformat().replace("+00:00", "Z")

    @model_validator(mode="after")
    def compute_duration(self) -> "AttendanceSessionRead":
        # Note: We use the raw datetime objects here for calculation
        if self.check_in_at and self.check_out_at:
            delta = self.check_out_at - self.check_in_at
            self.duration_minutes = max(0, int(delta.total_seconds() // 60))
        return self
