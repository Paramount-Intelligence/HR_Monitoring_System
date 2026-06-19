"""WebSocket ticket authentication tests."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.services.ws_ticket_service import issue_ws_ticket, consume_ws_ticket

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
def ws_user(db):
    user = User(
        full_name="WS Ticket User",
        email=f"ws-ticket-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_issue_ws_ticket_requires_auth():
    response = client.post(f"{API}/auth/ws-ticket")
    assert response.status_code in (401, 403)


def test_issue_and_consume_ws_ticket(ws_user):
    login = client.post(
        f"{API}/auth/login",
        json={"email": ws_user.email, "password": PASSWORD},
    )
    token = login.json()["access_token"]
    response = client.post(
        f"{API}/auth/ws-ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    ticket = response.json()["ticket"]
    assert consume_ws_ticket(ticket) == ws_user.id
    assert consume_ws_ticket(ticket) is None


def test_invalid_ws_ticket_rejected():
    assert consume_ws_ticket("invalid-ticket") is None
