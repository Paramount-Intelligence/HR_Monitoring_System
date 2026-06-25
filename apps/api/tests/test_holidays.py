"""Organization module — holiday CRUD tests."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.holiday import Holiday
from app.models.user import User

client = TestClient(app)
API = settings.api_v1_prefix
PASSWORD = "TestPass123!"


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def holiday_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Holiday Admin {suffix}",
        email=f"holiday-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Holiday Manager {suffix}",
        email=f"holiday-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, manager])
    db.commit()
    return {"admin": admin, "manager": manager}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _unique_holiday_date(suffix: str, offset: int = 0) -> date:
    day_offset = (int(suffix[:8], 16) + offset) % 360 + 1
    return date(2099, 1, 1) + timedelta(days=day_offset)


def test_admin_can_update_holiday(db, holiday_users):
    suffix = uuid.uuid4().hex[:8]
    holiday = Holiday(
        name=f"Independence Day {suffix}",
        holiday_date=_unique_holiday_date(suffix, 0),
        description="National holiday",
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)

    token = _login(holiday_users["admin"].email)
    response = client.patch(
        f"{API}/holidays/{holiday.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": f"Updated Holiday {suffix}", "description": "Updated desc"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == f"Updated Holiday {suffix}"


def test_admin_can_delete_holiday(db, holiday_users):
    suffix = uuid.uuid4().hex[:8]
    holiday = Holiday(
        name=f"Remove Me {suffix}",
        holiday_date=_unique_holiday_date(suffix, 1),
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)

    token = _login(holiday_users["admin"].email)
    response = client.delete(
        f"{API}/holidays/{holiday.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_manager_cannot_update_holiday(db, holiday_users):
    suffix = uuid.uuid4().hex[:8]
    holiday = Holiday(name=f"Protected {suffix}", holiday_date=_unique_holiday_date(suffix, 2))
    db.add(holiday)
    db.commit()
    db.refresh(holiday)

    token = _login(holiday_users["manager"].email)
    response = client.patch(
        f"{API}/holidays/{holiday.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Blocked"},
    )
    assert response.status_code == 403


def test_upcoming_holidays_returns_active_future_holidays(db, holiday_users):
    suffix = uuid.uuid4().hex[:8]
    upcoming = Holiday(name=f"Future {suffix}", holiday_date=_unique_holiday_date(suffix, 3), is_active=True)
    past = Holiday(name=f"Past {suffix}", holiday_date=date(2000, 1, 1), is_active=True)
    inactive = Holiday(name=f"Inactive {suffix}", holiday_date=_unique_holiday_date(suffix, 4), is_active=False)
    db.add_all([upcoming, past, inactive])
    db.commit()

    token = _login(holiday_users["manager"].email)
    response = client.get(
        f"{API}/holidays/upcoming?limit=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    names = [item["name"] for item in response.json()]
    assert upcoming.name in names
    assert past.name not in names
    assert inactive.name not in names


def test_upcoming_holidays_sorted_ascending(db, holiday_users):
    suffix = uuid.uuid4().hex[:8]
    later = Holiday(name=f"Later {suffix}", holiday_date=_unique_holiday_date(suffix, 6), is_active=True)
    sooner = Holiday(name=f"Sooner {suffix}", holiday_date=_unique_holiday_date(suffix, 5), is_active=True)
    db.add_all([later, sooner])
    db.commit()

    token = _login(holiday_users["manager"].email)
    response = client.get(
        f"{API}/holidays/upcoming?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    filtered = [item for item in response.json() if suffix in item["name"]]
    assert len(filtered) >= 2
    assert filtered[0]["name"] == sooner.name
    assert filtered[1]["name"] == later.name
