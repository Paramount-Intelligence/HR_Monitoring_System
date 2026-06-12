from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_any_permission, require_permission
from app.models.user import User
from app.schemas.analytics import BestPerformer, WorkloadBalance, BurnoutRisk, ProductivityTrend
from app.services.analytics_service import AnalyticsService
from app.services.user_service import UserService

router = APIRouter()


@router.get(
    "/best-performers",
    response_model=list[BestPerformer],
    summary="Get top performers (org analytics)",
)
def best_performers(
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("analytics.view_org")),
) -> list[BestPerformer]:
    return AnalyticsService(db).get_best_performers()


@router.get(
    "/workload-balance",
    response_model=list[WorkloadBalance],
    summary="Get workload distribution",
)
def workload_balance(
    db: Session = Depends(get_db),
    actor: User = Depends(
        require_any_permission("analytics.view_org", "analytics.view_team")
    ),
) -> list[WorkloadBalance]:
    return AnalyticsService(db).get_workload_balance()


@router.get(
    "/burnout-risks",
    response_model=list[BurnoutRisk],
    summary="Get burnout risk signals",
)
def burnout_risks(
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("analytics.view_org")),
) -> list[BurnoutRisk]:
    return AnalyticsService(db).get_burnout_risks()


@router.get(
    "/productivity-trend/{user_id}",
    response_model=list[ProductivityTrend],
    summary="Get productivity trend for a user",
)
def productivity_trend(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[ProductivityTrend]:
    UserService(db).assert_actor_can_view_user(actor, user_id)
    return AnalyticsService(db).get_productivity_trends(user_id)
