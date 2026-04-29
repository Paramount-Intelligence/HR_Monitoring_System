"""Pydantic schemas for Report endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from pydantic import BaseModel

class WeeklyReportRead(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    user_name: str
    start_date: date
    end_date: date
    total_hours: float
    late_logins: int
    early_logouts: int
    absences: int
    wfh_days: int

class MonthlyReportRead(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    user_name: str
    report_month: date
    total_hours: float
    late_logins: int
    early_logouts: int
    absences: int
    wfh_days: int
    escalated_approvals: int = 0
