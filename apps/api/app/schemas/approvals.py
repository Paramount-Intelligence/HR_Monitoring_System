from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ApprovalCenterSummary(BaseModel):
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    needs_revision: int = 0


class ApprovalCenterItem(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    user_name: str
    user_email: str
    department: str | None = None
    status: str
    submitted_at: datetime | None = None
    business_date: date | None = None
    description: str
    action_url: str
    available_actions: list[str] = []


class ApprovalCenterResponse(BaseModel):
    summary: ApprovalCenterSummary
    items: list[ApprovalCenterItem]
