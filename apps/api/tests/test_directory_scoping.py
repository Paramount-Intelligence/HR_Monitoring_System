"""Active directory scoping tests."""
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
def directory_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Dir Manager {suffix}",
        email=f"dir-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Dir Outsider {suffix}",
        email=f"dir-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Dir Employee {suffix}",
        email=f"dir-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    admin = User(
        full_name=f"Dir Admin {suffix}",
        email=f"dir-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, outsider, employee, admin])
    db.flush()
    employee.manager_id = manager.id
    outsider.manager_id = None
    db.commit()
    return {
        "manager": manager,
        "outsider": outsider,
        "employee": employee,
        "admin": admin,
    }


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_employee_users_list_self_only(directory_users):
    users = directory_users
    token = _login(users["employee"].email)
    response = client.get(f"{API}/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_employee_active_directory_not_full_org(directory_users):
    users = directory_users
    token = _login(users["employee"].email)
    response = client.get(f"{API}/users/active-directory", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(users["outsider"].id) not in ids
    assert str(users["employee"].id) in ids
    assert str(users["manager"].id) in ids
    for item in response.json():
        assert item.get("email") is None


def test_manager_directory_excludes_unrelated_users(directory_users):
    users = directory_users
    token = _login(users["manager"].email)
    response = client.get(f"{API}/users/active-directory", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(users["employee"].id) in ids
    assert str(users["outsider"].id) not in ids


def test_admin_directory_includes_emails(directory_users):
    users = directory_users
    token = _login(users["admin"].email)
    response = client.get(f"{API}/users/active-directory", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 4
    assert any(item.get("email") for item in response.json())
