"""Shared Approval Engine — State machine for Leave, WFH, and Corrections."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.approval_timeline import ApprovalTimeline
from app.models.enums import ApprovalEntityType, ApprovalAction, ApprovalStatus, LeaveStatus, CorrectionStatus
from app.models.user import User
from app.models.leave_request import LeaveRequest
from app.models.attendance_correction import AttendanceCorrection


class ApprovalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_timeline_entry(
        self,
        entity_type: ApprovalEntityType,
        entity_id: uuid.UUID,
        actor_id: uuid.UUID,
        action: ApprovalAction,
        comment: str | None = None
    ) -> ApprovalTimeline:
        """
        Stage a timeline entry in the current transaction.

        Uses db.flush() — NOT db.commit() — so the caller controls when the
        transaction is committed. This allows the LeaveRequest and its first
        timeline entry to be written atomically in submit_request.

        All callers that need a commit (resolve_leave_request, escalate_request,
        submit_request) already call db.commit() after this method.
        """
        entry = ApprovalTimeline(
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            action=action,
            comment=comment,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        self.db.add(entry)
        self.db.flush()  # Stage in transaction; caller is responsible for commit()
        return entry

    def resolve_leave_request(
        self,
        request_id: uuid.UUID,
        actor: User,
        action: ApprovalAction,
        comment: str | None = None
    ) -> LeaveRequest:
        req = self.db.get(LeaveRequest, request_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

        # Validate lifecycle rules
        if req.status in (LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot perform action on a {req.status.value} request"
            )

        # Update Request Status
        if action == ApprovalAction.APPROVED:
            req.status = LeaveStatus.APPROVED
        elif action == ApprovalAction.REJECTED:
            req.status = LeaveStatus.REJECTED
            if not (comment and comment.strip()):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Rejection reason is required.",
                )
            req.manager_comment = comment.strip()
        elif action == ApprovalAction.CLARIFIED:
            req.status = LeaveStatus.NEEDS_CLARIFICATION
        elif action == ApprovalAction.ESCALATED:
            req.status = LeaveStatus.ESCALATED
            if not (comment and comment.strip()):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Rejection reason is required.",
                )
            req.manager_comment = comment.strip()
        elif action == ApprovalAction.CANCELLED:
            req.status = LeaveStatus.CANCELLED
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid approval action")

        if comment and action not in (ApprovalAction.REJECTED, ApprovalAction.ESCALATED):
            req.manager_comment = comment.strip()

        # Log to timeline
        self.create_timeline_entry(
            entity_type=ApprovalEntityType.LEAVE_REQUEST,
            entity_id=req.id,
            actor_id=actor.id,
            action=action,
            comment=comment
        )

        self.db.commit()
        self.db.refresh(req)

        from app.models.enums import NotificationType
        from app.services.notification_service import create_notification

        if action in (ApprovalAction.APPROVED, ApprovalAction.REJECTED):
            status_label = "approved" if action == ApprovalAction.APPROVED else "rejected"
            create_notification(
                self.db,
                recipient_id=req.user_id,
                notification_type=NotificationType.SYSTEM,
                title=f"Leave request {status_label}",
                body=f"Your leave request was {status_label} by {actor.full_name}.",
                related_entity_type="leave_request",
                related_entity_id=req.id,
                actor_id=actor.id,
            )
            self.db.commit()

        return req

    def escalate_request(self, req: LeaveRequest, target_approver: User) -> LeaveRequest:
        """Shared escalation logic for stale requests."""
        original_approver_id = req.current_approver_id
        
        req.escalated_from_id = original_approver_id
        req.current_approver_id = target_approver.id
        req.escalated_at = datetime.now(timezone.utc)
        req.escalation_count += 1
        req.status = LeaveStatus.ESCALATED

        # Log escalation to timeline (SYSTEM actor or target_approver?)
        # Here we use target_approver as the one receiving it, 
        # but technically the system is the actor. 
        # For simplicity, we can use the target_approver or a special System User ID.
        self.create_timeline_entry(
            entity_type=ApprovalEntityType.LEAVE_REQUEST,
            entity_id=req.id,
            actor_id=target_approver.id, # The one who is NOW responsible
            action=ApprovalAction.ESCALATED,
            comment=f"Auto-escalated from original approver after 48h delay."
        )

        self.db.commit()
        return req

    def get_timeline(self, entity_type: ApprovalEntityType, entity_id: uuid.UUID) -> list[ApprovalTimeline]:
        return (
            self.db.query(ApprovalTimeline)
            .filter(
                ApprovalTimeline.entity_type == entity_type,
                ApprovalTimeline.entity_id == entity_id
            )
            .order_by(ApprovalTimeline.created_at.asc())
            .all()
        )
