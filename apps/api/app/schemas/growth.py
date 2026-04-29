"""Pydantic schemas for Employee Growth endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field
from app.models.enums import GoalStatus

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    target_metric: str
    target_value: int
    deadline: date | None = None

class GoalRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    target_metric: str
    target_value: int
    current_value: int
    deadline: date | None
    status: GoalStatus
    created_at: datetime
    updated_at: datetime

class AchievementRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    badge_name: str
    title: str
    description: str | None
    icon_name: str | None
    date: datetime
    created_at: datetime

class TeamGrowthRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    category: str
    achievement_date: datetime

class PersonalNoteCreate(BaseModel):
    note_date: date
    content: str

class PersonalNoteRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    note_date: date
    content: str
    created_at: datetime
