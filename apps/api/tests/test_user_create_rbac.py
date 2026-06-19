"""RBAC tests for POST /users (N-01)."""
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
def create_rbac_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Create Admin {suffix}",
        email=f"create-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Create Manager {suffix}",
        email=f"create-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Create Employee {suffix}",
        email=f"create-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    existing = User(
        full_name=f"Existing User {suffix}",
        email=f"existing-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, manager, employee, existing])
    db.commit()
    return {
        "admin": admin,
        "manager": manager,
        "employee": employee,
        "existing": existing,
        "suffix": suffix,
    }


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_manager_create_user_empty_body_returns_403(create_rbac_users):
    users = create_rbac_users
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert response.status_code == 403


def test_manager_create_user_duplicate_email_returns_403(create_rbac_users):
    users = create_rbac_users
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Should Fail",
            "email": users["existing"].email,
            "role": "employee",
        },
    )
    assert response.status_code == 403


def test_employee_create_user_returns_403(create_rbac_users):
    users = create_rbac_users
    token = _login(users["employee"].email)
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Blocked",
            "email": f"blocked-{users['suffix']}@test.com",
            "role": "employee",
        },
    )
    assert response.status_code == 403


def test_admin_create_user_invalid_body_returns_422(create_rbac_users):
    users = create_rbac_users
    token = _login(users["admin"].email)
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422


def test_admin_create_user_duplicate_email_returns_409(create_rbac_users):
    users = create_rbac_users
    token = _login(users["admin"].email)
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Duplicate",
            "email": users["existing"].email,
            "role": "employee",
        },
    )
    assert response.status_code == 409


def test_admin_create_user_success(create_rbac_users):
    users = create_rbac_users
    token = _login(users["admin"].email)
    email = f"new-user-{users['suffix']}@test.com"
    response = client.post(
        f"{API}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "New User",
            "email": email,
            "role": "employee",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["email"] == email
