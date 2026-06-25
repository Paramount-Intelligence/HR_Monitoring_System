"""Announcement visibility and dashboard overview tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.announcement import Announcement
from app.models.enums import UserRole, UserStatus
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
def visibility_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Vis Admin {suffix}",
        email=f"vis-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Vis Manager {suffix}",
        email=f"vis-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Vis Employee {suffix}",
        email=f"vis-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, manager, employee])
    db.commit()
    return {"admin": admin, "manager": manager, "employee": employee}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _create_announcement(db, *, created_by, title, audience="all", is_active=True, end_date=None):
    announcement = Announcement(
        title=title,
        content=f"Body for {title}",
        audience=audience,
        created_by=created_by,
        is_active=is_active,
        end_date=end_date,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def test_admin_can_fetch_visible_announcements(db, visibility_users):
    title = f"All Staff {uuid.uuid4().hex[:6]}"
    _create_announcement(db, created_by=visibility_users["admin"].id, title=title, audience="all")
    token = _login(visibility_users["admin"].email)
    response = client.get(
        f"{API}/announcements/visible?limit=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    titles = [item["title"] for item in response.json()]
    assert title in titles


def test_employee_sees_all_user_announcement(db, visibility_users):
    title = f"Everyone {uuid.uuid4().hex[:6]}"
    _create_announcement(db, created_by=visibility_users["admin"].id, title=title, audience="all")
    token = _login(visibility_users["employee"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title in [item["title"] for item in response.json()]


def test_employee_sees_role_targeted_employee_announcement(db, visibility_users):
    title = f"Employee Only {uuid.uuid4().hex[:6]}"
    _create_announcement(db, created_by=visibility_users["admin"].id, title=title, audience="employee")
    token = _login(visibility_users["employee"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title in [item["title"] for item in response.json()]


def test_employee_does_not_see_manager_only_announcement(db, visibility_users):
    title = f"Manager Only {uuid.uuid4().hex[:6]}"
    _create_announcement(db, created_by=visibility_users["admin"].id, title=title, audience="manager")
    token = _login(visibility_users["employee"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title not in [item["title"] for item in response.json()]


def test_inactive_announcement_hidden_from_employee(db, visibility_users):
    title = f"Inactive {uuid.uuid4().hex[:6]}"
    _create_announcement(
        db,
        created_by=visibility_users["admin"].id,
        title=title,
        audience="all",
        is_active=False,
    )
    token = _login(visibility_users["employee"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title not in [item["title"] for item in response.json()]


def test_expired_announcement_hidden_by_default(db, visibility_users):
    title = f"Expired {uuid.uuid4().hex[:6]}"
    _create_announcement(
        db,
        created_by=visibility_users["admin"].id,
        title=title,
        audience="all",
        end_date=datetime.now() - timedelta(days=1),
    )
    token = _login(visibility_users["employee"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title not in [item["title"] for item in response.json()]


def test_invalid_audience_does_not_broadcast_to_all(db, visibility_users):
    """Announcements with invalid audience are rejected at create time."""
    token = _login(visibility_users["admin"].email)
    response = client.post(
        f"{API}/announcements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Bad Audience",
            "content": "test",
            "audience": "everyone",
            "is_active": True,
        },
    )
    assert response.status_code == 422


def test_manager_sees_manager_targeted_announcement(db, visibility_users):
    title = f"Manager Update {uuid.uuid4().hex[:6]}"
    _create_announcement(db, created_by=visibility_users["admin"].id, title=title, audience="manager")
    token = _login(visibility_users["manager"].email)
    response = client.get(
        f"{API}/announcements/visible",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert title in [item["title"] for item in response.json()]
