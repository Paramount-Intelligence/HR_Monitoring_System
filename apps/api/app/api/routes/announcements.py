from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementRead, AnnouncementCreate

router = APIRouter()

from datetime import datetime, timezone
from sqlalchemy import or_, and_

@router.post("", response_model=AnnouncementRead, summary="Create an announcement (Admin/HR only)")
def create_announcement(
    payload: AnnouncementCreate, 
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> AnnouncementRead:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        audience=payload.audience,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=actor.id,
        is_active=payload.is_active
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement

@router.get("", response_model=list[AnnouncementRead], summary="List visible announcements")
def list_announcements(
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[AnnouncementRead]:
    now = datetime.now(timezone.utc)
    
    # Base filters: active and published
    filters = [Announcement.is_active == True]
    
    # Audience filter
    # If audience is ALL, show to everyone
    # If audience matches user's role, show
    # Special: EMPLOYEE audience covers INTERN and JUNIOR_EMPLOYEE
    target_roles = [actor.role.value]
    if actor.role in (UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.EMPLOYEE):
        target_roles.append("EMPLOYEE")
    
    filters.append(or_(
        Announcement.audience == "ALL",
        Announcement.audience.in_(target_roles)
    ))
    
    # Date filters
    filters.append(or_(
        Announcement.start_date == None,
        Announcement.start_date <= now
    ))
    filters.append(or_(
        Announcement.end_date == None,
        Announcement.end_date >= now
    ))
    
    return db.query(Announcement).filter(*filters).order_by(Announcement.created_at.desc()).all()
