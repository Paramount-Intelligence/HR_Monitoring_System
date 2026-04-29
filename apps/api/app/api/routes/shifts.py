from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.shift import ShiftRead, ShiftCreate, ShiftUpdate
from app.services.shift_service import ShiftService

router = APIRouter()

@router.post("", response_model=ShiftRead, summary="Create a new shift")
def create_shift(payload: ShiftCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ShiftRead:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or HR only")
    return ShiftService(db).create_shift(payload)

@router.get("", response_model=list[ShiftRead], summary="List all shifts")
def list_shifts(only_active: bool = False, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[ShiftRead]:
    return ShiftService(db).list_shifts(only_active=only_active)

@router.get("/{shift_id}", response_model=ShiftRead, summary="Get shift details")
def get_shift(shift_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ShiftRead:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    return shift

@router.patch("/{shift_id}", response_model=ShiftRead, summary="Update shift")
def update_shift(shift_id: uuid.UUID, payload: ShiftUpdate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ShiftRead:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or HR only")
    return ShiftService(db).update_shift(shift_id, payload)

@router.post("/assign/{user_id}", summary="Assign shift to user")
def assign_shift(user_id: uuid.UUID, shift_id: uuid.UUID | None = None, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> dict:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or HR only")
    ShiftService(db).assign_shift(user_id, shift_id)
    return {"message": "Shift assigned successfully"}
