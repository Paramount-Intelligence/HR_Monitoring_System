"""Pydantic schemas for Analytics endpoints."""
from __future__ import annotations

import uuid
from pydantic import BaseModel

class BestPerformer(BaseModel):
    user_id: uuid.UUID
    full_name: str
    score: float
    completed_tasks: int
    attendance_consistency: float

class WorkloadBalance(BaseModel):
    user_id: uuid.UUID
    full_name: str
    active_tasks: int
    overloaded: bool

class BurnoutRisk(BaseModel):
    user_id: uuid.UUID
    full_name: str
    consecutive_high_hour_days: int
    risk_level: str # Low, Medium, High

class ProductivityTrend(BaseModel):
    date: str
    score: float
