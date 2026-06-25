"""Organization module — department CRUD and employee listing tests."""
from __future__ import annotations

import uuid
from datetime import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.department import Department
from app.models.enums import UserRole, UserStatus
from app.models.shift import Shift
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
def org_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Org Admin {suffix}",
        email=f"org-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Org Manager {suffix}",
        email=f"org-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Org Employee {suffix}",
        email=f"org-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        designation="Analyst",
    )
    db.add_all([admin, manager, employee])
    db.flush()
    dept = Department(name=f"Engineering {suffix}", description="Core team", admin_id=manager.id)
    db.add(dept)
    db.flush()
    employee.department_id = dept.id
    db.commit()
    return {"admin": admin, "manager": manager, "employee": employee, "dept": dept}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_admin_can_update_department(org_users):
    token = _login(org_users["admin"].email)
    dept_id = str(org_users["dept"].id)
    updated_name = f"Updated Engineering {uuid.uuid4().hex[:6]}"
    response = client.patch(
        f"{API}/departments/{dept_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": updated_name, "is_active": True},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == updated_name


def test_department_delete_blocked_when_employees_assigned(org_users):
    token = _login(org_users["admin"].email)
    dept_id = str(org_users["dept"].id)
    response = client.delete(
        f"{API}/departments/{dept_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409
    assert "assigned employees" in response.json()["error"]["message"].lower()


def test_admin_can_delete_empty_department(db, org_users):
    suffix = uuid.uuid4().hex[:8]
    empty_dept = Department(name=f"Empty Dept {suffix}", description="No staff")
    db.add(empty_dept)
    db.commit()
    db.refresh(empty_dept)

    token = _login(org_users["admin"].email)
    response = client.delete(
        f"{API}/departments/{empty_dept.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_department_employees_endpoint(org_users):
    token = _login(org_users["admin"].email)
    dept_id = str(org_users["dept"].id)
    response = client.get(
        f"{API}/departments/{dept_id}/employees",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == org_users["employee"].full_name
    assert data[0]["designation"] == "Analyst"
    assert "password" not in data[0]
    assert "email" not in data[0]


def test_manager_cannot_update_department(org_users):
    token = _login(org_users["manager"].email)
    dept_id = str(org_users["dept"].id)
    response = client.patch(
        f"{API}/departments/{dept_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Blocked"},
    )
    assert response.status_code == 403
