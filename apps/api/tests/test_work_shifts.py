"""Organization module — work shift CRUD and employee listing tests."""
from __future__ import annotations

import uuid
from datetime import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
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
def shift_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Shift Admin {suffix}",
        email=f"shift-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Shift Employee {suffix}",
        email=f"shift-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, employee])
    db.flush()
    shift = Shift(
        name=f"Morning {suffix}",
        start_time=time(9, 0),
        end_time=time(17, 0),
        grace_period_minutes=10,
        working_days="1,2,3,4,5",
        timezone="Asia/Karachi",
    )
    db.add(shift)
    db.flush()
    employee.shift_id = shift.id
    db.commit()
    return {"admin": admin, "employee": employee, "shift": shift}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_admin_can_update_shift(shift_users):
    token = _login(shift_users["admin"].email)
    shift_id = str(shift_users["shift"].id)
    response = client.patch(
        f"{API}/shifts/{shift_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Morning", "grace_period_minutes": 20},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Updated Morning"
    assert response.json()["grace_period_minutes"] == 20


def test_shift_delete_blocked_when_employees_assigned(shift_users):
    token = _login(shift_users["admin"].email)
    shift_id = str(shift_users["shift"].id)
    response = client.delete(
        f"{API}/shifts/{shift_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409
    assert "assigned employees" in response.json()["error"]["message"].lower()


def test_admin_can_deactivate_empty_shift(db, shift_users):
    suffix = uuid.uuid4().hex[:8]
    empty_shift = Shift(
        name=f"Empty Shift {suffix}",
        start_time=time(8, 0),
        end_time=time(16, 0),
        grace_period_minutes=5,
        working_days="1,2,3,4,5",
        timezone="Asia/Karachi",
    )
    db.add(empty_shift)
    db.commit()
    db.refresh(empty_shift)

    token = _login(shift_users["admin"].email)
    response = client.delete(
        f"{API}/shifts/{empty_shift.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_shift_employees_endpoint(shift_users):
    token = _login(shift_users["admin"].email)
    shift_id = str(shift_users["shift"].id)
    response = client.get(
        f"{API}/shifts/{shift_id}/employees",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == shift_users["employee"].full_name
    assert "password" not in data[0]


def test_employee_cannot_update_shift(shift_users):
    token = _login(shift_users["employee"].email)
    shift_id = str(shift_users["shift"].id)
    response = client.patch(
        f"{API}/shifts/{shift_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Blocked"},
    )
    assert response.status_code == 403
