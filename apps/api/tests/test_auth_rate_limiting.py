"""Authentication rate limiting for login and password reset flows."""
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
ENUMERATION_MESSAGE = "If an account with this email exists, a reset link has been sent."


@pytest.fixture(autouse=True)
def low_rate_limits(monkeypatch):
    monkeypatch.setattr(settings, "auth_login_max_attempts", 3)
    monkeypatch.setattr(settings, "auth_login_window_seconds", 900)
    monkeypatch.setattr(settings, "auth_forgot_password_max_attempts", 3)
    monkeypatch.setattr(settings, "auth_forgot_password_window_seconds", 900)
    monkeypatch.setattr(settings, "auth_reset_password_max_attempts", 3)
    monkeypatch.setattr(settings, "auth_reset_password_window_seconds", 900)


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def rate_user(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        full_name=f"Rate Limit User {suffix}",
        email=f"rate-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_repeated_failed_login_returns_429(rate_user):
    for _ in range(2):
        response = client.post(
            f"{API}/auth/login",
            json={"email": rate_user.email, "password": "WrongPassword!"},
        )
        assert response.status_code == 401

    blocked = client.post(
        f"{API}/auth/login",
        json={"email": rate_user.email, "password": "WrongPassword!"},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_successful_login_resets_failure_counter(rate_user):
    for _ in range(2):
        response = client.post(
            f"{API}/auth/login",
            json={"email": rate_user.email, "password": "WrongPassword!"},
        )
        assert response.status_code == 401

    ok = client.post(
        f"{API}/auth/login",
        json={"email": rate_user.email, "password": PASSWORD},
    )
    assert ok.status_code == 200

    for _ in range(2):
        response = client.post(
            f"{API}/auth/login",
            json={"email": rate_user.email, "password": "WrongPassword!"},
        )
        assert response.status_code == 401

    blocked = client.post(
        f"{API}/auth/login",
        json={"email": rate_user.email, "password": "WrongPassword!"},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_forgot_password_repeated_calls_return_429(rate_user):
    for _ in range(2):
        response = client.post(
            f"{API}/auth/forgot-password",
            json={"email": rate_user.email},
        )
        assert response.status_code == 200

    blocked = client.post(
        f"{API}/auth/forgot-password",
        json={"email": rate_user.email},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_forgot_password_enumeration_safe(rate_user):
    known = client.post(
        f"{API}/auth/forgot-password",
        json={"email": rate_user.email},
    )
    unknown = client.post(
        f"{API}/auth/forgot-password",
        json={"email": f"unknown-{uuid.uuid4().hex}@test.com"},
    )
    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.json()["message"] == ENUMERATION_MESSAGE
    assert unknown.json()["message"] == ENUMERATION_MESSAGE


def test_reset_password_throttled():
    for _ in range(2):
        response = client.post(
            f"{API}/auth/reset-password",
            json={"token": "invalid-token", "new_password": "NewPass123!"},
        )
        assert response.status_code == 400

    blocked = client.post(
        f"{API}/auth/reset-password",
        json={"token": "invalid-token", "new_password": "NewPass123!"},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
