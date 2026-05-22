import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.deps import get_current_user, get_db
from app.models.meetings import Meeting, MeetingParticipant
from app.models.user import User
from app.models.enums import UserRole, NotificationType
from app.models.notifications import Notification
from app.schemas.meetings import MeetingCreate, MeetingUpdate, MeetingRead, MeetingRespond

router = APIRouter()


@router.get("", response_model=list[MeetingRead])
def get_meetings(
    scope: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MeetingRead]:
    """Get meetings visible to current user."""
    query = db.query(Meeting)
    
    if scope == "all" and current_user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]:
        # Admin and HR can view all meetings
        pass
    else:
        # Regular users only see meetings they organize or are invited to
        query = query.join(
            MeetingParticipant, 
            MeetingParticipant.meeting_id == Meeting.id, 
            isouter=True
        ).filter(
            or_(
                Meeting.organizer_id == current_user.id,
                MeetingParticipant.user_id == current_user.id
            )
        )
    
    meetings = query.order_by(Meeting.start_at.asc()).all()
    # Remove duplicates if any (due to join)
    unique_meetings = []
    seen = set()
    for m in meetings:
        if m.id not in seen:
            seen.add(m.id)
            unique_meetings.append(m)
            
    return unique_meetings


@router.get("/upcoming", response_model=list[MeetingRead])
def get_upcoming_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MeetingRead]:
    """Get upcoming meetings for the current user."""
    now = datetime.now(timezone.utc)
    
    meetings = (
        db.query(Meeting)
        .join(MeetingParticipant, MeetingParticipant.meeting_id == Meeting.id, isouter=True)
        .filter(
            and_(
                Meeting.start_at >= now,
                Meeting.status == "scheduled",
                or_(
                    Meeting.organizer_id == current_user.id,
                    MeetingParticipant.user_id == current_user.id
                )
            )
        )
        .order_by(Meeting.start_at.asc())
        .all()
    )
    
    unique_meetings = []
    seen = set()
    for m in meetings:
        if m.id not in seen:
            seen.add(m.id)
            unique_meetings.append(m)
            
    return unique_meetings


@router.get("/{meeting_id}", response_model=MeetingRead)
def get_meeting(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingRead:
    """Get meeting details."""
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    
    # Enforce access boundaries
    is_participant = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id == current_user.id
    ).first() is not None
    
    is_organizer = meeting.organizer_id == current_user.id
    is_admin_hr = current_user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]
    
    if not (is_organizer or is_participant or is_admin_hr):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this meeting"
        )
        
    return meeting


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingRead:
    """Create a new meeting invite."""
    # Ensure organizer is active
    meeting = Meeting(
        title=payload.title,
        description=payload.description,
        organizer_id=current_user.id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        meeting_link=payload.meeting_link,
        location=payload.location,
        status="scheduled"
    )
    db.add(meeting)
    db.flush() # Populate meeting.id
    
    # Add organizer as an accepted participant
    organizer_part = MeetingParticipant(
        meeting_id=meeting.id,
        user_id=current_user.id,
        response_status="accepted",
        notification_sent_at=datetime.now(timezone.utc)
    )
    db.add(organizer_part)
    
    # Track participants and prevent duplicate invitations
    invited_user_ids = set(payload.participants)
    invited_user_ids.discard(current_user.id) # Organizer already added
    
    for uid in invited_user_ids:
        user = db.get(User, uid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected participant does not exist."
            )
        if user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected participant is not active."
            )
        
        part = MeetingParticipant(
            meeting_id=meeting.id,
            user_id=uid,
            response_status="pending"
        )
        db.add(part)
        
        # Create In-App Notification
        notif = Notification(
            user_id=uid,
            title="New Meeting Invitation",
            message=f"{current_user.full_name} has invited you to '{meeting.title}' on {meeting.start_at.strftime('%Y-%m-%d %H:%M')}.",
            notification_type=NotificationType.MEETING_INVITE,
            related_entity_type="meeting",
            related_entity_id=meeting.id,
            is_read=False
        )
        db.add(notif)
        
    db.commit()
    db.refresh(meeting)
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingRead)
def update_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingRead:
    """Update meeting details."""
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        
    # Enforce access: only organizer or admin can edit
    if meeting.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this meeting"
        )
        
    # Apply updates
    if payload.title is not None:
        meeting.title = payload.title
    if payload.description is not None:
        meeting.description = payload.description
    if payload.start_at is not None:
        meeting.start_at = payload.start_at
    if payload.end_at is not None:
        meeting.end_at = payload.end_at
    if payload.meeting_link is not None:
        meeting.meeting_link = payload.meeting_link
    if payload.location is not None:
        meeting.location = payload.location
        
    # Handle participant changes if provided
    if payload.participants is not None:
        new_invited_ids = set(payload.participants)
        new_invited_ids.discard(meeting.organizer_id)
        
        # Get existing participants (excluding organizer)
        existing_parts = db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.user_id != meeting.organizer_id
        ).all()
        
        existing_user_ids = {p.user_id for p in existing_parts}
        
        # Remove deleted participants
        for p in existing_parts:
            if p.user_id not in new_invited_ids:
                db.delete(p)
                # Notify removal
                notif = Notification(
                    user_id=p.user_id,
                    title="Meeting Cancelled / Removed",
                    message=f"You have been removed from meeting '{meeting.title}'.",
                    notification_type=NotificationType.MEETING_CANCELLED,
                    related_entity_type="meeting",
                    related_entity_id=meeting_id,
                    is_read=False
                )
                db.add(notif)
                
        # Add new participants
        for uid in new_invited_ids:
            if uid not in existing_user_ids:
                user = db.get(User, uid)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Selected participant does not exist."
                    )
                if user.status != "active":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Selected participant is not active."
                    )
                part = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=uid,
                    response_status="pending"
                )
                db.add(part)
                
                # Notify new invite
                notif = Notification(
                    user_id=uid,
                    title="New Meeting Invitation",
                    message=f"{current_user.full_name} has invited you to '{meeting.title}' on {meeting.start_at.strftime('%Y-%m-%d %H:%M')}.",
                    notification_type=NotificationType.MEETING_INVITE,
                    related_entity_type="meeting",
                    related_entity_id=meeting.id,
                    is_read=False
                )
                db.add(notif)
                
    # Create notification for remaining unchanged participants
    remaining_parts = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id != meeting.organizer_id
    ).all()
    
    for rp in remaining_parts:
        notif = Notification(
            user_id=rp.user_id,
            title="Meeting Details Updated",
            message=f"The meeting '{meeting.title}' has been updated by {current_user.full_name}.",
            notification_type=NotificationType.MEETING_UPDATED,
            related_entity_type="meeting",
            related_entity_id=meeting_id,
            is_read=False
        )
        db.add(notif)
        
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/cancel", response_model=MeetingRead)
def cancel_meeting(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingRead:
    """Cancel a meeting."""
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        
    if meeting.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to cancel this meeting"
        )
        
    meeting.status = "cancelled"
    
    # Notify all participants
    participants = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id != meeting.organizer_id
    ).all()
    
    for p in participants:
        notif = Notification(
            user_id=p.user_id,
            title="Meeting Cancelled",
            message=f"The meeting '{meeting.title}' scheduled for {meeting.start_at.strftime('%Y-%m-%d %H:%M')} has been cancelled.",
            notification_type=NotificationType.MEETING_CANCELLED,
            related_entity_type="meeting",
            related_entity_id=meeting_id,
            is_read=False
        )
        db.add(notif)
        
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/respond", response_model=MeetingRead)
def respond_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingRead:
    """Respond to a meeting invitation (RSVP)."""
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        
    if meeting.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot respond to a cancelled meeting."
        )
        
    part = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id == current_user.id
    ).first()
    
    if not part:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not invited to this meeting."
        )
        
    part.response_status = payload.response_status
    db.commit()
    db.refresh(meeting)
    return meeting
