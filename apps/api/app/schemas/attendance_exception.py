from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class AttendanceExceptionSummary(BaseModel):
    open: int = 0
    resolved: int = 0
    late: int = 0
    early: int = 0
    missing_checkout: int = 0
    absent: int = 0
    overtime: int = 0


class AttendanceExceptionItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    department: str | None = None
    type: str
    severity: str
    status: str
    business_date: date
    shift_name: str | None = None
    shift_start: str | None = None
    shift_end: str | None = None
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    detected_at: datetime
    reason: str | None = None
    resolution_note: str | None = None


class AttendanceExceptionsResponse(BaseModel):
    summary: AttendanceExceptionSummary
    exceptions: list[AttendanceExceptionItem]


class AttendanceExceptionResolveRequest(BaseModel):
    resolution_note: str = Field(..., min_length=3, max_length=2000)


class AttendanceExceptionDismissRequest(BaseModel):
    resolution_note: str | None = Field(default=None, max_length=2000)
