"""Announcement governance tests."""
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
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
def announcement_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Ann Admin {suffix}",
        email=f"ann-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Ann Manager {suffix}",
        email=f"ann-manager-{suffix}@test.com",
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


def test_invalid_audience_returns_422(announcement_users):
    token = _login(announcement_users["admin"].email)
    response = client.post(
        f"{API}/announcements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Bad Audience",
            "content": "test",
            "audience": "audit-delete-me",
            "is_active": False,
        },
    )
    assert response.status_code == 422


@patch("app.api.routes.announcements.RealtimeService.emit_announcement")
def test_inactive_announcement_does_not_broadcast(mock_emit, announcement_users):
    token = _login(announcement_users["admin"].email)
    response = client.post(
        f"{API}/announcements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Draft",
            "content": "test",
            "audience": "employee",
            "is_active": False,
        },
    )
    assert response.status_code == 200, response.text
    mock_emit.assert_not_called()


def test_manager_cannot_create_announcement(announcement_users):
    token = _login(announcement_users["manager"].email)
    response = client.post(
        f"{API}/announcements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Blocked",
            "content": "test",
            "audience": "all",
        },
    )
    assert response.status_code == 403


def test_admin_can_archive_announcement(announcement_users):
    token = _login(announcement_users["admin"].email)
    created = client.post(
        f"{API}/announcements",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Archive Me",
            "content": "test",
            "audience": "employee",
            "is_active": False,
        },
    )
    assert created.status_code == 200
    announcement_id = created.json()["id"]
    archived = client.patch(
        f"{API}/announcements/{announcement_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False},
    )
    assert archived.status_code == 200
    assert archived.json()["is_active"] is False
