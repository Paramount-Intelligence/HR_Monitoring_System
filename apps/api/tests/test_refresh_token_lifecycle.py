"""Refresh token lifecycle: issue, rotate, revoke, reuse detection."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import decode_refresh_token, hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.refresh_token_session import RefreshTokenSession
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
def auth_user(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        full_name=f"Refresh User {suffix}",
        email=f"refresh-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        full_name=f"Refresh Admin {suffix}",
        email=f"refresh-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(email: str) -> dict:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()


def test_login_creates_db_tracked_refresh_token(auth_user, db):
    data = _login(auth_user.email)
    assert data["refresh_token"]
    payload = decode_refresh_token(data["refresh_token"])
    assert payload.get("jti")
    assert payload.get("family_id")

    sessions = (
        db.query(RefreshTokenSession)
        .filter(RefreshTokenSession.user_id == auth_user.id)
        .all()
    )
    assert len(sessions) == 1
    assert sessions[0].token_jti == payload["jti"]
    assert sessions[0].revoked_at is None


def test_refresh_rotates_token_and_returns_new_refresh_token(auth_user):
    login_data = _login(auth_user.email)
    old_refresh = login_data["refresh_token"]

    response = client.post(f"{API}/auth/refresh", json={"refresh_token": old_refresh})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != old_refresh


def test_old_refresh_token_reuse_returns_401(auth_user, db):
    login_data = _login(auth_user.email)
    old_refresh = login_data["refresh_token"]
    payload = decode_refresh_token(old_refresh)

    first = client.post(f"{API}/auth/refresh", json={"refresh_token": old_refresh})
    assert first.status_code == 200

    second = client.post(f"{API}/auth/refresh", json={"refresh_token": old_refresh})
    assert second.status_code == 401

    session = (
        db.query(RefreshTokenSession)
        .filter(RefreshTokenSession.token_jti == payload["jti"])
        .first()
    )
    assert session is not None
    assert session.reuse_detected_at is not None


def test_logout_revokes_refresh_token(auth_user):
    login_data = _login(auth_user.email)
    access = login_data["access_token"]
    refresh = login_data["refresh_token"]

    logout = client.post(
        f"{API}/auth/logout",
        headers={"Authorization": f"Bearer {access}"},
        json={"refresh_token": refresh},
    )
    assert logout.status_code == 200

    refresh_resp = client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert refresh_resp.status_code == 401


def test_refresh_after_logout_returns_401(auth_user):
    login_data = _login(auth_user.email)
    access = login_data["access_token"]
    refresh = login_data["refresh_token"]

    client.post(
        f"{API}/auth/logout",
        headers={"Authorization": f"Bearer {access}"},
        json={"refresh_token": refresh},
    )
    response = client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert response.status_code == 401


def test_deactivated_user_cannot_refresh(auth_user, admin_user, db):
    login_data = _login(auth_user.email)
    refresh = login_data["refresh_token"]
    admin_token = _login(admin_user.email)["access_token"]

    deactivate = client.delete(
        f"{API}/users/{auth_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deactivate.status_code == 200, deactivate.text

    response = client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert response.status_code == 401


def test_invalid_token_type_rejected(auth_user):
    login_data = _login(auth_user.email)
    access = login_data["access_token"]

    response = client.post(f"{API}/auth/refresh", json={"refresh_token": access})
    assert response.status_code == 401


def test_expired_refresh_session_rejected(auth_user, db):
    login_data = _login(auth_user.email)
    refresh = login_data["refresh_token"]
    payload = decode_refresh_token(refresh)

    session = (
        db.query(RefreshTokenSession)
        .filter(RefreshTokenSession.token_jti == payload["jti"])
        .first()
    )
    assert session is not None
    session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    response = client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert response.status_code == 401
