from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.achievement import Achievement
from app.models.enums import UserRole
from app.schemas.growth import GoalRead, GoalCreate, AchievementRead, PersonalNoteRead, PersonalNoteCreate, TeamGrowthRead
from app.services.growth_service import GrowthService

router = APIRouter()

@router.get("/goals", response_model=list[GoalRead], summary="Get my goals")
def get_goals(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[GoalRead]:
    return GrowthService(db).list_goals(actor.id)

@router.post("/goals", response_model=GoalRead, summary="Create a goal")
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> GoalRead:
    return GrowthService(db).create_goal(actor.id, payload)

@router.get("/achievements", response_model=list[AchievementRead], summary="Get my achievements")
def get_achievements(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[AchievementRead]:
    achievements = GrowthService(db).list_achievements(actor.id)
    return [
        AchievementRead(
            id=item.id,
            user_id=item.user_id,
            badge_name=item.badge_name,
            title=item.badge_name,
            description=item.description,
            icon_name=item.icon_name,
            date=item.created_at,
            created_at=item.created_at,
        )
        for item in achievements
    ]

@router.get("/notes", response_model=list[PersonalNoteRead], summary="Get my personal notes")
def get_notes(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[PersonalNoteRead]:
    return GrowthService(db).list_personal_notes(actor.id)

@router.post("/notes", response_model=PersonalNoteRead, summary="Create a personal note")
def create_note(payload: PersonalNoteCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> PersonalNoteRead:
    return GrowthService(db).create_personal_note(actor.id, payload)

@router.get("/team", response_model=list[TeamGrowthRead], summary="Get team growth records")
def get_team_growth(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TeamGrowthRead]:
    if actor.role == UserRole.MANAGER:
        team_member_ids = [u.id for u in db.query(User.id).filter(User.manager_id == actor.id).all()]
    elif actor.role == UserRole.ADMIN:
        team_member_ids = [u.id for u in db.query(User.id).all()]
    else:
        team_member_ids = [actor.id]

    achievements = db.query(Achievement).filter(Achievement.user_id.in_(team_member_ids)).order_by(Achievement.created_at.desc()).all()
    return [
        TeamGrowthRead(
            id=item.id,
            user_id=item.user_id,
            title=item.badge_name,
            description=item.description,
            category=item.icon_name or "achievement",
            achievement_date=item.created_at,
        )
        for item in achievements
    ]
