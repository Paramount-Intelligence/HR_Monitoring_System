"""WebSocket accepts only single-use tickets — JWT query auth rejected."""
from __future__ import annotations

import time
import uuid

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.services import ws_ticket_service

client = TestClient(app)
API = settings.api_v1_prefix
WS_PATH = f"{API}/ws"
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
        full_name="WS Ticket Only User",
        email=f"ws-only-{uuid.uuid4().hex[:8]}@test.com",
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


def _issue_ticket(access_token: str) -> str:
    response = client.post(
        f"{API}/auth/ws-ticket",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200, response.text
    return response.json()["ticket"]


def test_valid_ws_ticket_connects(ws_user):
    access = _login(ws_user.email)
    ticket = _issue_ticket(access)
    with client.websocket_connect(f"{WS_PATH}?ticket={ticket}") as websocket:
        message = websocket.receive_json()
        assert message["type"] == "connected"


def test_consumed_ticket_rejected(ws_user):
    access = _login(ws_user.email)
    ticket = _issue_ticket(access)
    with client.websocket_connect(f"{WS_PATH}?ticket={ticket}"):
        pass
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{WS_PATH}?ticket={ticket}"):
            pass


def test_expired_ticket_rejected(ws_user):
    ticket, _ = ws_ticket_service.issue_ws_ticket(ws_user.id)
    with ws_ticket_service._lock:
        ws_ticket_service._tickets[ticket].expires_at = time.time() - 1
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{WS_PATH}?ticket={ticket}"):
            pass


def test_missing_ticket_rejected():
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(WS_PATH):
            pass


def test_jwt_query_token_rejected(ws_user):
    access = _login(ws_user.email)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{WS_PATH}?token={access}"):
            pass
