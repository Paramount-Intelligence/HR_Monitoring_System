from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.announcement import Announcement
from app.models.enums import UserRole
from app.models.user import User


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _naive_now() -> datetime:
    return datetime.now()


def build_visible_announcement_filters(
    actor: User,
    *,
    include_expired: bool = False,
) -> list:
    filters: list = [Announcement.is_active.is_(True)]

    if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
        target_roles = [actor.role.value]
        if actor.role in (UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.EMPLOYEE):
            target_roles.append("employee")

        filters.append(
            or_(
                Announcement.audience == "all",
                Announcement.audience.in_(target_roles),
            )
        )

    if not include_expired:
        now = _naive_now()
        filters.append(
            or_(Announcement.start_date.is_(None), Announcement.start_date <= now)
        )
        filters.append(or_(Announcement.end_date.is_(None), Announcement.end_date >= now))

    return filters


def list_visible_announcements(
    db: Session,
    actor: User,
    *,
    limit: int | None = None,
    include_expired: bool = False,
) -> list[Announcement]:
    query = (
        db.query(Announcement)
        .filter(*build_visible_announcement_filters(actor, include_expired=include_expired))
        .order_by(Announcement.created_at.desc())
    )
    if limit is not None:
        query = query.limit(max(1, min(limit, 50)))
    return query.all()
