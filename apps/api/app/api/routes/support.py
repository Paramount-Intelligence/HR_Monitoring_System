import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.enums import UserRole, NotificationType, TicketStatus
from app.models.support import SupportTicket, SupportTicketComment
from app.models.notifications import Notification
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketUpdate,
    SupportTicketRead,
    SupportTicketCommentCreate,
)
from app.services.realtime_service import RealtimeService

router = APIRouter()


def _emit_created_notifications(db: Session, notifications: list[Notification]) -> None:
    for notif in notifications:
        db.refresh(notif)
        RealtimeService.emit_notification_created(notif)


@router.get("/tickets", response_model=list[SupportTicketRead])
def get_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SupportTicketRead]:
    """Get support tickets. Regular users see own; Admin/HR sees all."""
    if current_user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]:
        tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    else:
        tickets = (
            db.query(SupportTicket)
            .filter(SupportTicket.created_by_id == current_user.id)
            .order_by(SupportTicket.created_at.desc())
            .all()
        )
    return tickets


@router.post("/tickets", response_model=SupportTicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportTicketRead:
    """Create a new support ticket."""
    ticket = SupportTicket(
        created_by_id=current_user.id,
        subject=payload.subject,
        category=payload.category,
        priority=payload.priority,
        description=payload.description,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.flush() # Populate ticket.id and ticket_number
    
    # Notify Admin and HR users of new support ticket
    support_staff = db.query(User).filter(
        User.role.in_([UserRole.ADMIN, UserRole.HR_OPERATIONS]),
        User.status == "active"
    ).all()
    
    created_notifications: list[Notification] = []
    for staff in support_staff:
        # Avoid self-notification if admin is creating a ticket
        if staff.id == current_user.id:
            continue
            
        notif = Notification(
            user_id=staff.id,
            title="New Support Ticket Created",
            message=f"Ticket #{ticket.ticket_number} - '{ticket.subject}' has been submitted by {current_user.full_name}.",
            notification_type=NotificationType.SUPPORT_TICKET,
            related_entity_type="support_ticket",
            related_entity_id=ticket.id,
            is_read=False
        )
        db.add(notif)
        created_notifications.append(notif)
        
    db.commit()
    db.refresh(ticket)
    _emit_created_notifications(db, created_notifications)
    return ticket


@router.get("/tickets/{ticket_id}", response_model=SupportTicketRead)
def get_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportTicketRead:
    """Get support ticket details and comments."""
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # Enforce boundary: creator, admin, or hr
    if (
        ticket.created_by_id != current_user.id 
        and current_user.role not in [UserRole.ADMIN, UserRole.HR_OPERATIONS]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this ticket"
        )
        
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=SupportTicketRead)
def update_ticket(
    ticket_id: uuid.UUID,
    payload: SupportTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportTicketRead:
    """Update support ticket status, priority, or assignee (Admin/HR only, except creator can close)."""
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    is_creator = ticket.created_by_id == current_user.id
    is_staff = current_user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]
    
    if not is_staff and not (is_creator and payload.status == TicketStatus.CLOSED):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this ticket"
        )
        
    old_status = ticket.status
    
    # Apply updates
    if payload.status is not None:
        ticket.status = payload.status
        if payload.status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.now(timezone.utc)
        elif old_status == TicketStatus.CLOSED and payload.status != TicketStatus.CLOSED:
            ticket.closed_at = None
            
    if payload.priority is not None and is_staff:
        ticket.priority = payload.priority
        
    created_notifications: list[Notification] = []
    if payload.assigned_to_id is not None and is_staff:
        # Verify assigned user exists and is active admin/hr
        assignee = db.get(User, payload.assigned_to_id)
        if not assignee or assignee.status != "active" or assignee.role not in [UserRole.ADMIN, UserRole.HR_OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned support agent is invalid or inactive"
            )
        ticket.assigned_to_id = payload.assigned_to_id
        
        # Notify the assigned support agent
        if assignee.id != current_user.id:
            notif = Notification(
                user_id=assignee.id,
                title="Support Ticket Assigned",
                message=f"Ticket #{ticket.ticket_number} - '{ticket.subject}' has been assigned to you.",
                notification_type=NotificationType.SUPPORT_TICKET,
                related_entity_type="support_ticket",
                related_entity_id=ticket.id,
                is_read=False
            )
            db.add(notif)
            created_notifications.append(notif)
            
    # Notify creator if ticket status changed by support staff
    if payload.status is not None and is_staff and ticket.created_by_id != current_user.id:
        notif = Notification(
            user_id=ticket.created_by_id,
            title=f"Support Ticket Status: {payload.status.value.replace('_', ' ').title()}",
            message=f"Your ticket #{ticket.ticket_number} status has been updated to {payload.status.value.replace('_', ' ').title()}.",
            notification_type=NotificationType.SUPPORT_TICKET,
            related_entity_type="support_ticket",
            related_entity_id=ticket.id,
            is_read=False
        )
        db.add(notif)
        created_notifications.append(notif)
        
    db.commit()
    db.refresh(ticket)
    _emit_created_notifications(db, created_notifications)
    return ticket


@router.post("/tickets/{ticket_id}/comments", response_model=SupportTicketRead)
def add_ticket_comment(
    ticket_id: uuid.UUID,
    payload: SupportTicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportTicketRead:
    """Add a response comment/reply to a support ticket thread."""
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    is_creator = ticket.created_by_id == current_user.id
    is_staff = current_user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]
    
    if not (is_creator or is_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to comment on this ticket"
        )
        
    comment = SupportTicketComment(
        ticket_id=ticket_id,
        author_id=current_user.id,
        message=payload.message,
        is_internal=payload.is_internal if is_staff else False
    )
    db.add(comment)
    
    created_notifications: list[Notification] = []
    # Notify ticket participants
    if is_staff:
        # Support agent commented -> notify creator
        if ticket.created_by_id != current_user.id:
            notif = Notification(
                user_id=ticket.created_by_id,
                title="New Support Reply",
                message=f"Support agent has replied to your ticket #{ticket.ticket_number} - '{ticket.subject}'.",
                notification_type=NotificationType.SUPPORT_TICKET,
                related_entity_type="support_ticket",
                related_entity_id=ticket.id,
                is_read=False
            )
            db.add(notif)
            created_notifications.append(notif)
    else:
        # Ticket creator commented -> notify assigned agent or global support team
        targets = []
        if ticket.assigned_to_id:
            targets.append(ticket.assigned_to_id)
        else:
            # Notify active support staff if unassigned
            support_staff = db.query(User).filter(
                User.role.in_([UserRole.ADMIN, UserRole.HR_OPERATIONS]),
                User.status == "active"
            ).all()
            targets.extend([staff.id for staff in support_staff])
            
        for tid in targets:
            if tid == current_user.id:
                continue
            notif = Notification(
                user_id=tid,
                title="New Support Ticket Comment",
                message=f"User {current_user.full_name} commented on ticket #{ticket.ticket_number}.",
                notification_type=NotificationType.SUPPORT_TICKET,
                related_entity_type="support_ticket",
                related_entity_id=ticket.id,
                is_read=False
            )
            db.add(notif)
            created_notifications.append(notif)
            
    db.commit()
    db.refresh(ticket)
    _emit_created_notifications(db, created_notifications)
    return ticket
