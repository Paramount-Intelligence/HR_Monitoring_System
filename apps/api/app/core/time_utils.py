from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

PK_TZ = ZoneInfo("Asia/Karachi")


def pk_now() -> datetime:
    return datetime.now(PK_TZ)


def pk_today() -> date:
    return pk_now().date()


def pk_day_start(target_date: date | None = None) -> datetime:
    current = target_date or pk_today()
    return datetime(current.year, current.month, current.day, 0, 0, 0, tzinfo=PK_TZ)


def ensure_pk_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=PK_TZ)
    return value.astimezone(PK_TZ)
