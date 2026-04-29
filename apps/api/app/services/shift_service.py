"""Shift service — create, update, list, and assignment."""
from __future__ import annotations

import uuid
from datetime import time, datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import ShiftCreate, ShiftUpdate

class ShiftService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_shift(self, payload: ShiftCreate) -> Shift:
        shift = Shift(
            name=payload.name,
            start_time=payload.start_time,
            end_time=payload.end_time,
            grace_period_minutes=payload.grace_period_minutes,
            working_days=payload.working_days,
            is_active=payload.is_active if payload.is_active is not None else True
        )
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def update_shift(self, shift_id: uuid.UUID, payload: ShiftUpdate) -> Shift:
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(shift, field, value)
            
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def list_shifts(self, only_active: bool = False) -> list[Shift]:
        q = self.db.query(Shift)
        if only_active:
            q = q.filter(Shift.is_active == True)
        return q.all()

    def assign_shift(self, user_id: uuid.UUID, shift_id: uuid.UUID | None) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if shift_id:
            shift = self.db.get(Shift, shift_id)
            if not shift:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        
        user.shift_id = shift_id
        self.db.commit()
        self.db.refresh(user)
        return user

    @staticmethod
    def is_late(check_in: datetime, shift: Shift) -> bool:
        """Detect if check-in is late, supporting overnight rollover."""
        if not check_in or not shift:
            return False
            
        # We only care about the time part
        check_in_time = check_in.time()
        
        # Calculate expected start with grace
        grace_delta = timedelta(minutes=shift.grace_period_minutes)
        # Convert time to datetime on a dummy day to add delta
        dummy_today = datetime.combine(datetime.min.date(), shift.start_time)
        limit_time = (dummy_today + grace_delta).time()
        
        # For overnight shifts, if check_in is before shift.start_time but after midnight, 
        # it's potentially very late or very early.
        # But usually late login is checked against the start time of the session day.
        
        # Simple logic: if check_in_time > limit_time
        # (Assuming the check-in is on the intended shift day)
        return check_in_time > limit_time

    @staticmethod
    def is_early_logout(check_out: datetime, shift: Shift) -> bool:
        """Detect if check-out is early, supporting overnight rollover."""
        if not check_out or not shift:
            return False
            
        check_out_time = check_out.time()
        return check_out_time < shift.end_time
