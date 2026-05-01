"""Leave service — request submission, validation, and team queue."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.models.enums import LeaveType, LeaveStatus, UserRole, ApprovalEntityType, ApprovalAction, HalfDayPeriod, UserStatus
from app.schemas.leave import LeaveRequestCreate, LeaveRequestResolve
from app.services.approval_service import ApprovalService


class LeaveService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.approval_service = ApprovalService(db)

    def submit_request(self, payload: LeaveRequestCreate, actor: User) -> LeaveRequest:
        # 1. Basic Validation
        if payload.start_date > payload.end_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start date must be before end date")
            
        if payload.is_half_day:
            if not payload.half_day_period:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Half day period is required")
            if payload.start_date != payload.end_date:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Half day requests must be on the same date")

        # 2. Overlap Validation
        self._validate_no_overlaps(actor.id, payload.start_date, payload.end_date, payload.is_half_day, payload.half_day_period)

        # 3. Determine Approver
        approver_id = actor.manager_id
        if not approver_id:
            # Fallback to HR or Admin if no manager assigned
            hr_ops = self.db.query(User).filter(User.role == UserRole.HR_OPERATIONS, User.status == UserStatus.ACTIVE).first()
            if hr_ops:
                approver_id = hr_ops.id
            else:
                admin = self.db.query(User).filter(User.role == UserRole.ADMIN, User.status == UserStatus.ACTIVE).first()
                approver_id = admin.id if admin else None

        # 4. Create Request
        req = LeaveRequest(
            user_id=actor.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            leave_type=payload.leave_type,
            is_half_day=payload.is_half_day,
            half_day_period=payload.half_day_period,
            reason=payload.reason,
            status=LeaveStatus.PENDING,
            current_approver_id=approver_id
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)

        # 5. Log Timeline
        self.approval_service.create_timeline_entry(
            entity_type=ApprovalEntityType.LEAVE_REQUEST,
            entity_id=req.id,
            actor_id=actor.id,
            action=ApprovalAction.CREATED,
            comment=f"Request submitted for {payload.leave_type.value}"
        )

        return req

    def cancel_request(self, request_id: uuid.UUID, actor: User) -> LeaveRequest:
        req = self.db.get(LeaveRequest, request_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
        if req.user_id != actor.id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel other's requests")
             
        if req.status != LeaveStatus.PENDING:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be cancelled")
             
        return self.approval_service.resolve_leave_request(
            request_id=request_id,
            actor=actor,
            action=ApprovalAction.CANCELLED,
            comment="Cancelled by requester"
        )

    def get_pending_queue(self, actor: User) -> list[LeaveRequest]:
        """Get requests where the actor is the current approver or is admin/HR."""
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
             return self.db.query(LeaveRequest).options(joinedload(LeaveRequest.user)).filter(LeaveRequest.status == LeaveStatus.PENDING).all()
             
        return self.db.query(LeaveRequest).options(joinedload(LeaveRequest.user)).filter(
            LeaveRequest.current_approver_id == actor.id,
            LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.NEEDS_CLARIFICATION, LeaveStatus.ESCALATED])
        ).all()

    def _validate_no_overlaps(self, user_id: uuid.UUID, start: date, end: date, is_half: bool, period: HalfDayPeriod | None):
        # Check for overlapping requests (excluding cancelled/rejected)
        query = self.db.query(LeaveRequest).filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.status.notin_([LeaveStatus.REJECTED, LeaveStatus.CANCELLED])
        )
        
        # Date overlap logic: (StartA <= EndB) and (EndA >= StartB)
        query = query.filter(
            and_(
                LeaveRequest.start_date <= end,
                LeaveRequest.end_date >= start
            )
        )
        
        overlaps = query.all()
        for o in overlaps:
            # If both are full days, or if they are same half day, it's a conflict
            if not o.is_half_day and not is_half:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Request overlaps with an existing {o.leave_type.value} request")
            
            if o.is_half_day and is_half:
                if o.start_date == start and o.half_day_period == period:
                     raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A request already exists for this half-day period")
            
            if (not o.is_half_day and is_half) or (o.is_half_day and not is_half):
                # Full day vs Half day on same date is always a conflict
                 raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A full-day request exists for one of these dates")
