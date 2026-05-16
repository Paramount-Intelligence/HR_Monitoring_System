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
            description=payload.description,
            start_time=payload.start_time,
            end_time=payload.end_time,
            timezone=payload.timezone,
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

    def deactivate_shift(self, shift_id: uuid.UUID) -> bool:
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        
        shift.is_active = False
        self.db.commit()
        return True

    @staticmethod
    def get_shift_boundaries(target_date: date, shift: Shift) -> tuple[datetime, datetime]:
        """Calculate start and end datetimes for a shift on a given date in PKT."""
        from app.core.time_utils import PK_TZ
        
        # Start is on the target date
        start = datetime.combine(target_date, shift.start_time).replace(tzinfo=PK_TZ)
        
        # End calculation
        if shift.end_time < shift.start_time:
            # Overnight shift
            end = datetime.combine(target_date + timedelta(days=1), shift.end_time).replace(tzinfo=PK_TZ)
        else:
            # Same day shift
            end = datetime.combine(target_date, shift.end_time).replace(tzinfo=PK_TZ)
            
        return start, end

    @staticmethod
    def is_late(check_in: datetime, shift: Shift) -> tuple[bool, int]:
        """Detect if check-in is late, returns (is_late, minutes_late)."""
        if not check_in or not shift:
            return False, 0
            
        from app.core.time_utils import ensure_pk_datetime
        check_in_pk = ensure_pk_datetime(check_in)
        
        # We need to determine which "shift day" this check-in belongs to.
        # For a 5 PM shift, if checking in at 4 PM or 6 PM, it's today's shift.
        # If checking in at 2 AM, it might be yesterday's shift if we are very late.
        # But usually check_in starts a new session.
        
        shift_start, _ = ShiftService.get_shift_boundaries(check_in_pk.date(), shift)
        
        # Apply grace period
        limit = shift_start + timedelta(minutes=shift.grace_period_minutes)
        
        if check_in_pk > limit:
            diff = check_in_pk - shift_start
            return True, int(diff.total_seconds() // 60)
            
        return False, 0

    @staticmethod
    def is_early_logout(check_out: datetime, shift: Shift, expected_end: datetime | None = None) -> tuple[bool, int]:
        """Detect if check-out is early, returns (is_early, minutes_early)."""
        if not check_out or not shift:
            return False, 0
            
        from app.core.time_utils import ensure_pk_datetime
        check_out_pk = ensure_pk_datetime(check_out)
        
        if not expected_end:
            # If not provided, assume the shift ended on the same day (or next day if overnight)
            # relative to the check_out date. This is tricky for overnight.
            # Better to pass expected_end from the session.
            return False, 0
            
        expected_end_pk = ensure_pk_datetime(expected_end)
        if check_out_pk < expected_end_pk:
            diff = expected_end_pk - check_out_pk
            return True, int(diff.total_seconds() // 60)
            
        return False, 0
