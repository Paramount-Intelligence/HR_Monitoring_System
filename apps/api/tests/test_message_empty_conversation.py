"""Empty direct-message conversation loading and first-message flow."""
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
def dm_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Empty DM Manager {suffix}",
        email=f"empty-dm-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Empty DM Employee {suffix}",
        email=f"empty-dm-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Empty DM Outsider {suffix}",
        email=f"empty-dm-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, employee, outsider])
    db.flush()
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "employee": employee, "outsider": outsider}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _create_direct(token: str, other_user_id: uuid.UUID) -> dict:
    response = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "direct", "participant_ids": [str(other_user_id)]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_create_find_dm_without_messages_returns_200(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    assert conversation["type"] == "direct"
    assert conversation.get("last_message") is None


def test_empty_dm_messages_list_returns_empty_array(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    response = client.get(
        f"{API}/messages/conversations/{conversation['id']}/messages",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    assert response.json() == []


def test_empty_dm_detail_does_not_error(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    response = client.get(
        f"{API}/messages/conversations/{conversation['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["id"] == conversation["id"]
    assert payload.get("last_message") is None


def test_conversation_list_preview_handles_null_last_message(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    response = client.get(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    match = next(item for item in response.json() if item["id"] == conversation["id"])
    assert match.get("last_message") is None


def test_sending_first_message_to_empty_dm_succeeds(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    response = client.post(
        f"{API}/messages/conversations/{conversation['id']}/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "Hello there", "body_html": "<p>Hello there</p>"},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["body"] == "Hello there"
    assert payload["body_html"] == "<p>Hello there</p>"


def test_after_first_message_conversation_list_preview_updates(dm_users):
    users = dm_users
    token = _login(users["manager"].email)
    conversation = _create_direct(token, users["employee"].id)
    client.post(
        f"{API}/messages/conversations/{conversation['id']}/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "First preview", "body_html": "<p>First preview</p>"},
    )
    response = client.get(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    match = next(item for item in response.json() if item["id"] == conversation["id"])
    assert match["last_message"] is not None
    assert match["last_message"]["body"] == "First preview"


def test_non_participant_cannot_fetch_empty_dm(dm_users):
    users = dm_users
    manager_token = _login(users["manager"].email)
    conversation = _create_direct(manager_token, users["employee"].id)
    outsider_token = _login(users["outsider"].email)
    response = client.get(
        f"{API}/messages/conversations/{conversation['id']}/messages",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert response.status_code == 403
