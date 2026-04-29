"""Alert routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.alert import Alert
from app.models.enums import AlertStatus
from app.models.user import User
from app.schemas.alert import AlertRead

router = APIRouter()

@router.get("", response_model=list[AlertRead], summary="Get my alerts")
def get_alerts(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[AlertRead]:
    """Get all alerts for the current user."""
    # Assuming alerts are meant for the recipient_user_id
    alerts = (
        db.query(Alert)
        .filter(Alert.recipient_user_id == actor.id)
        .order_by(Alert.created_at.desc())
        .limit(100)
        .all()
    )
    return alerts

@router.patch("/{alert_id}/resolve", response_model=AlertRead, summary="Mark an alert as resolved")
def resolve_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AlertRead:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    if alert.recipient_user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to resolve this alert")

    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(alert)
    return alert
