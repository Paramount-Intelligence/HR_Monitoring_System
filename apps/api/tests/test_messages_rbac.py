"""Messaging RBAC tests — direct conversation creation scoping."""
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
def message_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Msg Manager {suffix}",
        email=f"msg-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Msg Outsider {suffix}",
        email=f"msg-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Msg Employee {suffix}",
        email=f"msg-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, outsider, employee])
    db.flush()
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "outsider": outsider, "employee": employee}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_employee_can_dm_any_active_user(message_users):
    users = message_users
    token = _login(users["employee"].email)
    response = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "direct", "participant_ids": [str(users["outsider"].id)]},
    )
    assert response.status_code == 201, response.text


def test_employee_can_dm_manager(message_users):
    users = message_users
    token = _login(users["employee"].email)
    response = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "direct", "participant_ids": [str(users["manager"].id)]},
    )
    assert response.status_code == 201, response.text


def test_existing_direct_conversation_reused(message_users):
    users = message_users
    token = _login(users["employee"].email)
    payload = {"type": "direct", "participant_ids": [str(users["manager"].id)]}
    first = client.post(f"{API}/messages/conversations", headers={"Authorization": f"Bearer {token}"}, json=payload)
    second = client.post(f"{API}/messages/conversations", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
