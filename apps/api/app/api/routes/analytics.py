from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.analytics import BestPerformer, WorkloadBalance, BurnoutRisk, ProductivityTrend
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/best-performers", response_model=list[BestPerformer], summary="Get top performers (Admin/Manager only)")
def best_performers(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[BestPerformer]:
    return AnalyticsService(db).get_best_performers()

@router.get("/workload-balance", response_model=list[WorkloadBalance], summary="Get workload distribution")
def workload_balance(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[WorkloadBalance]:
    return AnalyticsService(db).get_workload_balance()

@router.get("/burnout-risks", response_model=list[BurnoutRisk], summary="Get burnout risk signals")
def burnout_risks(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[BurnoutRisk]:
    return AnalyticsService(db).get_burnout_risks()

@router.get("/productivity-trend/{user_id}", response_model=list[ProductivityTrend], summary="Get productivity trend for a user")
def productivity_trend(user_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[ProductivityTrend]:
    return AnalyticsService(db).get_productivity_trends(user_id)
