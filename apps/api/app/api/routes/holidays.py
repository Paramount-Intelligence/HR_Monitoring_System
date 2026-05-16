from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayRead, HolidayCreate, HolidayUpdate

router = APIRouter()

@router.post("", response_model=HolidayRead, summary="Create a holiday (Admin only)")
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> HolidayRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    holiday = Holiday(
        name=payload.name, 
        description=payload.description,
        holiday_date=payload.holiday_date,
        is_active=payload.is_active
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.get("", response_model=list[HolidayRead], summary="List holidays")
def list_holidays(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[HolidayRead]:
    return db.query(Holiday).all()

@router.get("/active", response_model=list[HolidayRead], summary="List active holidays")
def list_active_holidays(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[HolidayRead]:
    return db.query(Holiday).filter(Holiday.is_active == True).all()

@router.patch("/{holiday_id}", response_model=HolidayRead, summary="Update a holiday")
def update_holiday(
    holiday_id: uuid.UUID,
    payload: HolidayUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user)
) -> HolidayRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    holiday = db.get(Holiday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(holiday, key, value)
    
    db.commit()
    db.refresh(holiday)
    return holiday

@router.delete("/{holiday_id}", summary="Delete or deactivate a holiday")
def delete_holiday(
    holiday_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user)
) -> dict[str, bool]:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    holiday = db.get(Holiday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    
    holiday.is_active = False
    db.commit()
    return {"success": True}
