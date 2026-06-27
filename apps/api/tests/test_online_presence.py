"""Live online presence session tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.models.user_presence_session import UserPresenceSession
from app.services.online_presence_service import OnlinePresenceService

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
        full_name=f"Online User {suffix}",
        email=f"online-{suffix}@test.com",
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


def test_web_heartbeat_marks_user_online(db, presence_user):
    token = _login(presence_user.email)
    response = client.post(
        f"{API}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        json={"device_id": "web-device-1", "platform": "web", "app_state": "foreground"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["online_state"] == "online"
    assert body["is_online"] is True
    assert "web" in body["platforms"]


def test_mobile_heartbeat_marks_user_online(db, presence_user):
    token = _login(presence_user.email)
    response = client.post(
        f"{API}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        json={"device_id": "mobile-device-1", "platform": "mobile", "app_state": "foreground"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["online_state"] == "online"


def test_multiple_sessions_keep_user_online(db, presence_user):
    token = _login(presence_user.email)
    headers = {"Authorization": f"Bearer {token}"}
    client.post(
        f"{API}/presence/heartbeat",
        headers=headers,
        json={"device_id": "web-device-1", "platform": "web"},
    )
    client.post(
        f"{API}/presence/heartbeat",
        headers=headers,
        json={"device_id": "mobile-device-1", "platform": "mobile"},
    )
    client.post(
        f"{API}/presence/offline",
        headers=headers,
        json={"device_id": "web-device-1", "platform": "web"},
    )
    state = OnlinePresenceService(db).get_user_online_state(presence_user.id)
    assert state["is_online"] is True
    assert "mobile" in state["platforms"]


def test_offline_one_device_keeps_user_online_if_other_active(db, presence_user):
    service = OnlinePresenceService(db)
    service.heartbeat(presence_user, device_id="web-1", platform="web")
    service.heartbeat(presence_user, device_id="mobile-1", platform="mobile")
    service.go_offline(presence_user, device_id="web-1", platform="web")
    state = service.get_user_online_state(presence_user.id)
    assert state["is_online"] is True


def test_user_becomes_offline_after_ttl(db, presence_user):
    now = datetime.now(timezone.utc)
    session = UserPresenceSession(
        user_id=presence_user.id,
        device_id="stale-web",
        platform="web",
        status="online",
        last_seen_at=now - timedelta(seconds=settings.online_presence_ttl_seconds + 30),
        connected_at=now - timedelta(hours=1),
    )
    db.add(session)
    db.commit()
    assert OnlinePresenceService(db).is_user_online(presence_user.id) is False


@patch("app.services.online_presence_service.RealtimeService.emit_user_online_state_updated")
def test_realtime_event_emitted_on_online_transition(mock_emit, db, presence_user):
    service = OnlinePresenceService(db)
    service.heartbeat(presence_user, device_id="web-emit", platform="web")
    assert mock_emit.called
    kwargs = mock_emit.call_args.kwargs
    assert "presence_status" not in kwargs


def test_online_state_event_payload_excludes_presence_status():
    from app.services.realtime_service import RealtimeService

    with patch("app.services.realtime_bridge.schedule_broadcast_to_all_authenticated") as mock_broadcast:
        RealtimeService.emit_user_online_state_updated(
            user_id=uuid.uuid4(),
            online_state="online",
            last_seen_at=datetime.now(timezone.utc),
            platforms=["web"],
        )
    payload = mock_broadcast.call_args[0][0]["payload"]
    assert payload["online_state"] == "online"
    assert payload["is_online"] is True
    assert "presence_status" not in payload


def test_heartbeat_requires_authentication():
    response = client.post(
        f"{API}/presence/heartbeat",
        json={"device_id": "web-device-1", "platform": "web"},
    )
    assert response.status_code in {401, 403}


def test_invalid_platform_rejected(db, presence_user):
    token = _login(presence_user.email)
    response = client.post(
        f"{API}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        json={"device_id": "bad-device", "platform": "desktop"},
    )
    assert response.status_code == 422


def test_me_includes_online_fields(db, presence_user):
    token = _login(presence_user.email)
    client.post(
        f"{API}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        json={"device_id": "web-me-01", "platform": "web"},
    )
    response = client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["online_state"] == "online"
    assert body["is_online"] is True


@pytest.fixture
def dm_pair(db):
    suffix = uuid.uuid4().hex[:8]
    user_a = User(
        full_name=f"Conv User A {suffix}",
        email=f"conv-a-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    user_b = User(
        full_name=f"Conv User B {suffix}",
        email=f"conv-b-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    return {"a": user_a, "b": user_b}


def _create_direct(token: str, other_user_id: uuid.UUID) -> dict:
    response = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "direct", "participant_ids": [str(other_user_id)]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _participant_user(conversation: dict, user_id: uuid.UUID) -> dict:
    match = next(p for p in conversation["participants"] if p["user_id"] == str(user_id))
    return match["user"]


def test_conversation_list_includes_offline_state_for_offline_users(db, dm_pair):
    token = _login(dm_pair["a"].email)
    conversation = _create_direct(token, dm_pair["b"].id)
    response = client.get(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    match = next(item for item in response.json() if item["id"] == conversation["id"])
    other = _participant_user(match, dm_pair["b"].id)
    assert other["online_state"] == "offline"
    assert other["is_online"] is False


def test_conversation_list_includes_online_state_for_online_users(db, dm_pair):
    token_b = _login(dm_pair["b"].email)
    client.post(
        f"{API}/presence/heartbeat",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"device_id": "web-online-1", "platform": "web"},
    )
    token_a = _login(dm_pair["a"].email)
    conversation = _create_direct(token_a, dm_pair["b"].id)
    response = client.get(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200, response.text
    match = next(item for item in response.json() if item["id"] == conversation["id"])
    other = _participant_user(match, dm_pair["b"].id)
    assert other["online_state"] == "online"
    assert other["is_online"] is True
