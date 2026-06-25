"""Leave service — request submission, validation, and team queue."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

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
        # 0. Normalize: if leave_type is half_day, ensure is_half_day flag is set
        is_half_day = payload.is_half_day or (payload.leave_type == LeaveType.HALF_DAY)
        half_day_period = payload.half_day_period

        # 1. Basic Validation
        if payload.start_date > payload.end_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start date must be before end date")

        if is_half_day:
            if not half_day_period:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Half-day period is required (first_half or second_half).")
            if payload.start_date != payload.end_date:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Half-day requests must be on a single date (start_date must equal end_date).")

        # 2. Overlap Validation
        self._validate_no_overlaps(actor.id, payload.start_date, payload.end_date, is_half_day, half_day_period)

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

        if not approver_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No reporting manager or system administrator assigned to handle your request. Please contact HR."
            )

        # 4. Create Request — use flush() to get the id without committing yet.
        # The timeline entry is created in the same transaction.
        # A single commit() at the end makes this atomic: either both succeed or neither does.
        req = LeaveRequest(
            user_id=actor.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            leave_type=payload.leave_type,
            is_half_day=is_half_day,
            half_day_period=half_day_period,
            reason=payload.reason,
            status=LeaveStatus.PENDING,
            current_approver_id=approver_id
        )
        self.db.add(req)
        self.db.flush()  # Assigns req.id without committing — timeline can reference it

        # 5. Log Timeline (also flushes internally — does NOT commit)
        self.approval_service.create_timeline_entry(
            entity_type=ApprovalEntityType.LEAVE_REQUEST,
            entity_id=req.id,
            actor_id=actor.id,
            action=ApprovalAction.CREATED,
            comment=f"Request submitted for {payload.leave_type.value}"
        )

        # 6. Single commit — atomically persists both the request and its timeline entry.
        #    If anything above failed, db.rollback() would have been called and neither row exists.
        self.db.commit()
        self.db.refresh(req)

        from app.models.enums import NotificationType
        from app.services.notification_service import create_notification

        requester_name = actor.full_name
        create_notification(
            self.db,
            recipient_id=approver_id,
            notification_type=NotificationType.SYSTEM,
            title="Leave request submitted",
            body=f"{requester_name} submitted a leave request for your approval.",
            related_entity_type="leave_request",
            related_entity_id=req.id,
            actor_id=actor.id,
        )
        self.db.commit()

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
        """
        Check for conflicting requests (pending/approved/escalated/needs_clarification).
        Rejected and cancelled requests are ignored.

        Conflict rules:
        - Full-day vs full-day on overlapping dates          → 409
        - Full-day vs half-day on overlapping dates          → 409
        - Half-day vs full-day on overlapping dates          → 409
        - Half-day vs half-day, same date, same period       → 409
        - Half-day vs half-day, same date, different period  → allowed
        """
        active_statuses = [
            LeaveStatus.REJECTED,
            LeaveStatus.CANCELLED,
        ]

        overlaps = (
            self.db.query(LeaveRequest)
            .filter(
                LeaveRequest.user_id == user_id,
                LeaveRequest.status.notin_(active_statuses),
                # Date-range overlap: (StartA <= EndB) AND (EndA >= StartB)
                LeaveRequest.start_date <= end,
                LeaveRequest.end_date >= start,
            )
            .all()
        )

        for o in overlaps:
            existing_type = o.leave_type.value.replace('_', ' ')

            if not o.is_half_day and not is_half:
                # Case 1: existing full-day (or WFH) vs new full-day (or WFH)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"You already have an approved or pending {existing_type} request "
                        f"covering these dates."
                    ),
                )
            elif not o.is_half_day and is_half:
                # Case 2: existing full-day (or WFH) vs new half-day
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"You already have an approved or pending {existing_type} request "
                        f"covering {start}. Cannot submit a half-day on this date."
                    ),
                )
            elif o.is_half_day and not is_half:
                # Case 3: existing half-day vs new full-day (or WFH)
                period_label = o.half_day_period.value.replace('_', ' ') if o.half_day_period else 'half-day'
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"You already have a {period_label} half-day request on {o.start_date}. "
                        f"Cannot overlap with a full-day request."
                    ),
                )
            elif o.is_half_day and is_half:
                # Case 4: existing half-day vs new half-day — only conflict if same date AND same period
                if o.start_date == start and o.half_day_period == period:
                    period_label = period.value.replace('_', ' ') if period else 'this period'
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"You already have a half-day request for {start} ({period_label})."
                        ),
                    )
                # Different period on the same date is allowed (first_half + second_half = full day)
