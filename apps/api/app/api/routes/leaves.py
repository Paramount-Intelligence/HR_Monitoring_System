from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.enums import UserRole, ApprovalEntityType, ApprovalAction
from app.schemas.leave import LeaveRequestRead, LeaveRequestCreate, LeaveRequestResolve, ApprovalTimelineRead
from app.services.leave_service import LeaveService
from app.services.approval_service import ApprovalService
from app.services.privileged_audit_service import PrivilegedAuditService

router = APIRouter()

@router.post("", response_model=LeaveRequestRead, summary="Submit a new leave/WFH/half-day request")
def submit_request(payload: LeaveRequestCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> LeaveRequestRead:
    return LeaveService(db).submit_request(payload, actor)

@router.get("/me", response_model=list[LeaveRequestRead], summary="My leave requests")
def get_my_requests(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[LeaveRequestRead]:
    from app.models.leave_request import LeaveRequest
    return db.query(LeaveRequest).filter(LeaveRequest.user_id == actor.id).order_by(LeaveRequest.created_at.desc()).all()

@router.get("/pending", response_model=list[LeaveRequestRead], summary="Get pending requests for manager")
def get_pending_queue(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[LeaveRequestRead]:
    return LeaveService(db).get_pending_queue(actor)

@router.patch("/{request_id}/resolve", response_model=LeaveRequestRead, summary="Resolve a leave request")
def resolve_request(
    request_id: uuid.UUID, 
    payload: LeaveRequestResolve, 
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> LeaveRequestRead:
    from app.models.leave_request import LeaveRequest
    req = db.get(LeaveRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    audit = PrivilegedAuditService(db)

    if req.user_id == actor.id and actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        audit.log_denied(
            actor=actor,
            action="leave.self_approval_denied",
            resource_type="leave_request",
            resource_id=req.id,
            reason="Cannot approve or reject your own leave request",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot approve or reject your own leave request")

    if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
        requester = db.get(User, req.user_id)
        if not requester or requester.manager_id != actor.id:
            audit.log_denied(
                actor=actor,
                action="leave.cross_team_resolution_denied",
                resource_type="leave_request",
                resource_id=req.id,
                reason="Not authorized to resolve leave for this user",
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to resolve leave for this user")

    # Permission check: Only current approver OR admin/HR can resolve
    if actor.id != req.current_approver_id and actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        audit.log_denied(
            actor=actor,
            action="leave.unauthorized_resolution_denied",
            resource_type="leave_request",
            resource_id=req.id,
            reason="Only the current approver can resolve this request",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the current approver can resolve this request")
        
    return ApprovalService(db).resolve_leave_request(request_id, actor, payload.action, payload.manager_comment)

@router.post("/{request_id}/cancel", response_model=LeaveRequestRead, summary="Cancel a pending request")
def cancel_request(request_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> LeaveRequestRead:
    return LeaveService(db).cancel_request(request_id, actor)

@router.get("/{request_id}/timeline", response_model=list[ApprovalTimelineRead], summary="Get request history/timeline")
def get_timeline(request_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[ApprovalTimelineRead]:
    return ApprovalService(db).get_timeline(ApprovalEntityType.LEAVE_REQUEST, request_id)
