"""Growth service — manage goals, achievements, and personal notes."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.personal_note import PersonalNote
from app.models.enums import GoalStatus
from app.schemas.growth import GoalCreate, PersonalNoteCreate

class GrowthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_goals(self, user_id: uuid.UUID) -> list[Goal]:
        return self.db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).all()

    def create_goal(self, user_id: uuid.UUID, payload: GoalCreate) -> Goal:
        goal = Goal(
            user_id=user_id,
            title=payload.title,
            description=payload.description,
            target_metric=payload.target_metric,
            target_value=payload.target_value,
            deadline=payload.deadline,
            status=GoalStatus.IN_PROGRESS
        )
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def list_achievements(self, user_id: uuid.UUID) -> list[Achievement]:
        return self.db.query(Achievement).filter(Achievement.user_id == user_id).order_by(Achievement.created_at.desc()).all()

    def list_personal_notes(self, user_id: uuid.UUID) -> list[PersonalNote]:
        return self.db.query(PersonalNote).filter(PersonalNote.user_id == user_id).order_by(PersonalNote.note_date.desc()).all()

    def create_personal_note(self, user_id: uuid.UUID, payload: PersonalNoteCreate) -> PersonalNote:
        note = PersonalNote(
            user_id=user_id,
            note_date=payload.note_date,
            content=payload.content
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note
