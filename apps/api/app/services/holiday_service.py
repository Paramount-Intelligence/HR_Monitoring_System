from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.holiday import Holiday


def list_upcoming_holidays(
    db: Session,
    *,
    limit: int = 5,
    from_date: date | None = None,
) -> list[Holiday]:
    start = from_date or date.today()
    return (
        db.query(Holiday)
        .filter(Holiday.is_active.is_(True), Holiday.holiday_date >= start)
        .order_by(Holiday.holiday_date.asc())
        .limit(max(1, min(limit, 50)))
        .all()
    )
