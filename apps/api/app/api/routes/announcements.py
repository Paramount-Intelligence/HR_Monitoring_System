from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementRead, AnnouncementCreate, AnnouncementUpdate

from app.services.realtime_service import RealtimeService

router = APIRouter()

from datetime import datetime, timezone
from sqlalchemy import or_, and_

VALID_ANNOUNCEMENT_AUDIENCES = frozenset(
    {
        "all",
        "employee",
        "admin",
        "hr_operations",
        "manager",
        "team_lead",
        "intern",
        "junior_employee",
    }
)


def _normalize_audience(audience: str) -> str:
    normalized = audience.lower().strip()
    if normalized not in VALID_ANNOUNCEMENT_AUDIENCES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid audience '{audience}'. Allowed: {', '.join(sorted(VALID_ANNOUNCEMENT_AUDIENCES))}",
        )
    return normalized


@router.post("", response_model=AnnouncementRead, summary="Create an announcement (Admin/HR only)")
def create_announcement(
    payload: AnnouncementCreate, 
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> AnnouncementRead:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
    audience = _normalize_audience(payload.audience)
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        audience=audience,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=actor.id,
        is_active=payload.is_active
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    if announcement.is_active:
        RealtimeService.emit_announcement(
            "announcement_created",
            announcement_id=announcement.id,
            title=announcement.title,
            audience=announcement.audience,
            actor_id=actor.id,
            db=db,
        )
    return announcement

@router.get("", response_model=list[AnnouncementRead], summary="List visible announcements")
def list_announcements(
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[AnnouncementRead]:
    now = datetime.now(timezone.utc)
    
    filters = [Announcement.is_active == True]
    
    target_roles = [actor.role.value]
    if actor.role in (UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.EMPLOYEE):
        target_roles.append("employee")
    
    filters.append(or_(
        Announcement.audience == "all",
        Announcement.audience.in_(target_roles)
    ))
    
    filters.append(or_(
        Announcement.start_date == None,
        Announcement.start_date <= datetime.now()
    ))
    filters.append(or_(
        Announcement.end_date == None,
        Announcement.end_date >= datetime.now()
    ))
    
    return db.query(Announcement).filter(*filters).order_by(Announcement.created_at.desc()).all()

@router.get("/all", response_model=list[AnnouncementRead], summary="List all announcements (Admin/HR only)")
def list_all_announcements(
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[AnnouncementRead]:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
    return db.query(Announcement).order_by(Announcement.created_at.desc()).all()


@router.patch("/{announcement_id}", response_model=AnnouncementRead, summary="Update or archive an announcement")
def update_announcement(
    announcement_id: uuid.UUID,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> AnnouncementRead:
    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    announcement = db.get(Announcement, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "audience" in update_data and update_data["audience"] is not None:
        update_data["audience"] = _normalize_audience(update_data["audience"])

    for key, value in update_data.items():
        setattr(announcement, key, value)

    db.commit()
    db.refresh(announcement)
    return announcement
