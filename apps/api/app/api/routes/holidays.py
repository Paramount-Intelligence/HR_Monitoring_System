from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayRead, HolidayCreate

router = APIRouter()

@router.post("", response_model=HolidayRead, summary="Create a holiday (Admin only)")
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> HolidayRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    holiday = Holiday(name=payload.name, holiday_date=payload.holiday_date)
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.get("", response_model=list[HolidayRead], summary="List holidays")
def list_holidays(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[HolidayRead]:
    return db.query(Holiday).all()
