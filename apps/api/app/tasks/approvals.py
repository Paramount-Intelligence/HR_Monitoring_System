"""Approval-related background tasks."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.models.enums import LeaveStatus, UserRole
from app.services.approval_service import ApprovalService
from app.services.email_service import EmailService


@celery_app.task(name="app.tasks.approvals.check_stale_leaves")
def check_stale_leaves(db: Session | None = None):
    """Scan for leave requests pending > 48h and escalate."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
        
    try:
        threshold = datetime.now(timezone.utc) - timedelta(hours=48)
        stale_requests = db.query(LeaveRequest).filter(
            LeaveRequest.status == LeaveStatus.PENDING,
            LeaveRequest.created_at <= threshold,
            LeaveRequest.escalation_count == 0 # Only escalate once for now
        ).all()

        if not stale_requests:
            return f"No stale requests found."

        # Find target approver (HR or Admin)
        hr_ops = db.query(User).filter(User.role == UserRole.HR_OPERATIONS, User.status == "active").first()
        admin = db.query(User).filter(User.role == UserRole.ADMIN, User.status == "active").first()
        target = hr_ops or admin

        if not target:
            return "No target approver found for escalation."

        service = ApprovalService(db)
        escalated_count = 0
        for req in stale_requests:
            service.escalate_request(req, target)
            EmailService.send_escalation_alert(target, "Leave Request", str(req.id))
            escalated_count += 1

        return f"Escalated {escalated_count} requests to {target.email}"
    finally:
        if should_close:
            db.close()


@celery_app.task(name="app.tasks.approvals.send_pending_reminders")
def send_pending_reminders(db: Session | None = None):
    """Send daily reminders to managers with pending approvals."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
        
    try:
        pending_counts = {}
        requests = db.query(LeaveRequest).filter(
            LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.ESCALATED])
        ).all()
        
        for r in requests:
            if r.current_approver_id:
                pending_counts[r.current_approver_id] = pending_counts.get(r.current_approver_id, 0) + 1
        
        for user_id, count in pending_counts.items():
            user = db.get(User, user_id)
            if user:
                EmailService.send_pending_approval_reminder(user, count)
                
        return f"Sent reminders to {len(pending_counts)} approvers."
    finally:
        if should_close:
            db.close()
