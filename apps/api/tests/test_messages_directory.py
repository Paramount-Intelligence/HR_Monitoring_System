"""Company-wide messaging directory for Start Conversation modal."""
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
def directory_org(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Dir Admin {suffix}",
        email=f"dir-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        department="HQ",
        designation="Administrator",
    )
    manager = User(
        full_name=f"Dir Manager {suffix}",
        email=f"dir-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Operations",
        designation="Manager",
    )
    employee = User(
        full_name=f"Dir Employee {suffix}",
        email=f"dir-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Engineering",
        designation="Engineer",
    )
    intern = User(
        full_name=f"Dir Intern {suffix}",
        email=f"dir-intern-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
        department="Engineering",
        designation="Intern",
    )
    outsider = User(
        full_name=f"Dir Outsider {suffix}",
        email=f"dir-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Sales",
        designation="Rep",
    )
    suspended = User(
        full_name=f"Dir Suspended {suffix}",
        email=f"dir-suspended-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.SUSPENDED,
        department="Sales",
    )
    db.add_all([admin, manager, employee, intern, outsider, suspended])
    db.flush()
    employee.manager_id = manager.id
    intern.manager_id = manager.id
    db.commit()
    return {
        "admin": admin,
        "manager": manager,
        "employee": employee,
        "intern": intern,
        "outsider": outsider,
        "suspended": suspended,
    }


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _directory(token: str, **params):
    return client.get(
        f"{API}/messages/directory",
        headers={"Authorization": f"Bearer {token}"},
        params=params,
    )


@pytest.mark.parametrize(
    "user_key",
    ["admin", "manager", "employee", "intern"],
)
def test_messaging_directory_returns_org_users_for_all_roles(directory_org, user_key):
    users = directory_org
    token = _login(users[user_key].email)
    for target_key in ["outsider", "manager", "intern"]:
        needle = users[target_key].full_name.split()[-1]
        response = _directory(token, search=needle)
        assert response.status_code == 200, response.text
        assert any(item["full_name"] == users[target_key].full_name for item in response.json())


def test_messaging_directory_requires_auth():
    response = client.get(f"{API}/messages/directory")
    assert response.status_code in (401, 403)


def test_messaging_directory_excludes_inactive_users(directory_org):
    token = _login(directory_org["employee"].email)
    response = _directory(token, search=directory_org["suspended"].full_name.split()[-1])
    assert response.status_code == 200
    assert all(item["full_name"] != directory_org["suspended"].full_name for item in response.json())


def test_messaging_directory_excludes_sensitive_fields(directory_org):
    token = _login(directory_org["employee"].email)
    response = _directory(token)
    assert response.status_code == 200
    entry = response.json()[0]
    assert "email" not in entry
    assert "password_hash" not in entry
    assert "phone" not in entry
    assert set(entry.keys()) <= {
        "id",
        "full_name",
        "role",
        "department_name",
        "designation",
        "profile_picture_url",
        "is_active",
    }


def test_messaging_directory_search_by_name(directory_org):
    token = _login(directory_org["employee"].email)
    target = directory_org["outsider"].full_name.split()[1]
    response = _directory(token, search=target)
    assert response.status_code == 200
    assert any(directory_org["outsider"].full_name == item["full_name"] for item in response.json())


def test_messaging_directory_search_by_role(directory_org):
    token = _login(directory_org["intern"].email)
    response = _directory(token, search="intern")
    assert response.status_code == 200
    assert any(item["role"] == "intern" for item in response.json())


def test_messaging_directory_search_by_department(directory_org):
    token = _login(directory_org["manager"].email)
    response = _directory(token, search="Sales")
    assert response.status_code == 200
    assert any(item["department_name"] == "Sales" for item in response.json())


def test_employee_can_dm_any_active_user(directory_org):
    users = directory_org
    token = _login(users["employee"].email)
    response = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "direct", "participant_ids": [str(users["outsider"].id)]},
    )
    assert response.status_code == 201, response.text


def test_non_participant_cannot_fetch_created_dm(directory_org):
    users = directory_org
    employee_token = _login(users["employee"].email)
    create = client.post(
        f"{API}/messages/conversations",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"type": "direct", "participant_ids": [str(users["outsider"].id)]},
    )
    assert create.status_code == 201
    conv_id = create.json()["id"]
    manager_token = _login(users["manager"].email)
    denied = client.get(
        f"{API}/messages/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert denied.status_code == 403
