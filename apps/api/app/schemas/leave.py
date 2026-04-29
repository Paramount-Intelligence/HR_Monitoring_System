"""Pydantic schemas for Leaves."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from pydantic import BaseModel

from app.models.enums import LeaveType, LeaveStatus, HalfDayPeriod, ApprovalAction

class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: LeaveType
    reason: str
    is_half_day: bool = False
    half_day_period: HalfDayPeriod | None = None

class LeaveRequestResolve(BaseModel):
    action: ApprovalAction
    manager_comment: str | None = None

class LeaveRequestRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    start_date: date
    end_date: date
    leave_type: LeaveType
    status: LeaveStatus
    is_half_day: bool
    half_day_period: HalfDayPeriod | None
    reason: str
    manager_comment: str | None
    current_approver_id: uuid.UUID | None
    escalated_from_id: uuid.UUID | None
    escalated_at: datetime | None
    escalation_count: int
    created_at: datetime
    updated_at: datetime

class ApprovalTimelineRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: uuid.UUID
    actor_id: uuid.UUID
    action: ApprovalAction
    comment: str | None
    created_at: datetime
