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

@router.post("", response_model=AnnouncementRead, summary="Create an announcement (Admin only)")
def create_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> AnnouncementRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        created_by=actor.id,
        is_active=payload.is_active
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement

@router.get("", response_model=list[AnnouncementRead], summary="List active announcements")
def list_announcements(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[AnnouncementRead]:
    return db.query(Announcement).filter(Announcement.is_active == True).order_by(Announcement.created_at.desc()).all()
