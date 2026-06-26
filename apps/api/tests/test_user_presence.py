"""User presence status tests."""
from __future__ import annotations

import uuid

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
def presence_user(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        full_name=f"Presence User {suffix}",
        email=f"presence-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_default_presence_is_active(db, presence_user):
    assert presence_user.presence_status == "active"


def test_user_can_set_away_and_active(db, presence_user):
    token = _login(presence_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    away = client.patch(f"{API}/users/me/presence", json={"presence_status": "away"}, headers=headers)
    assert away.status_code == 200, away.text
    assert away.json()["presence_status"] == "away"

    active = client.patch(f"{API}/users/me/presence", json={"presence_status": "active"}, headers=headers)
    assert active.status_code == 200, active.text
    assert active.json()["presence_status"] == "active"


def test_invalid_presence_rejected(db, presence_user):
    token = _login(presence_user.email)
    response = client.patch(
        f"{API}/users/me/presence",
        json={"presence_status": "offline"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_me_includes_presence_fields(db, presence_user):
    token = _login(presence_user.email)
    response = client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["presence_status"] in {"active", "away"}


def test_active_directory_includes_presence_status(db, presence_user):
    presence_user.presence_status = "away"
    db.commit()
    token = _login(presence_user.email)
    response = client.get(
        f"{API}/users/active-directory",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    entry = next(item for item in response.json() if item["id"] == str(presence_user.id))
    assert entry["presence_status"] == "away"
