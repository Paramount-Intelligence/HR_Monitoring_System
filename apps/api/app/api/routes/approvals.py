from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.approvals import ApprovalCenterResponse
from app.services.approval_center_service import ApprovalCenterService

router = APIRouter()


@router.get("", response_model=ApprovalCenterResponse, summary="Unified approval center")
def list_approvals(
    type: str = Query("all"),
    status: str = Query("pending"),
    date: date | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
    scope: str = Query("my_team"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> ApprovalCenterResponse:
    return ApprovalCenterService(db).list_approvals(
        actor=actor,
        type_filter=type,
        status_filter=status,
        business_date=date,
        start_date=start_date,
        end_date=end_date,
        search=search,
        scope=scope,
    )
