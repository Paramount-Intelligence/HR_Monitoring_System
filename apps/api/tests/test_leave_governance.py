"""Leave/WFH governance tests."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.audit_log import AuditLog
from app.models.enums import LeaveStatus, LeaveType, UserRole, UserStatus
from app.models.leave_request import LeaveRequest
from app.models.user import User

client = TestClient(app)
API = settings.api_v1_prefix


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def leave_context(db):
    suffix = uuid.uuid4().hex[:8]
    password = "TestPass123!"

    manager = User(
        full_name=f"Leave Manager {suffix}",
        email=f"leave-manager-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Leave Employee {suffix}",
        email=f"leave-employee-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert admin is not None

    db.add(manager)
    db.flush()
    employee.manager_id = manager.id
    db.add(employee)
    db.commit()
    db.refresh(manager)
    db.refresh(employee)

    def login(user: User) -> str:
        if user.role == UserRole.ADMIN:
            pwd = "Admin1234!"
        else:
            pwd = password
        response = client.post(f"{API}/auth/login", json={"email": user.email, "password": pwd})
        assert response.status_code == 200, response.text
        return response.json()["access_token"]

    req = LeaveRequest(
        user_id=employee.id,
        start_date=date.today() + timedelta(days=10),
        end_date=date.today() + timedelta(days=10),
        leave_type=LeaveType.ANNUAL,
        reason="Test leave",
        status=LeaveStatus.PENDING,
        current_approver_id=manager.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "employee": employee,
        "manager": manager,
        "admin": admin,
        "request": req,
        "employee_token": login(employee),
        "manager_token": login(manager),
        "admin_token": login(admin),
    }


def test_reject_without_comment_returns_422(leave_context):
    req = leave_context["request"]
    response = client.patch(
        f"{API}/leaves/{req.id}/resolve",
        json={"action": "rejected"},
        headers={"Authorization": f"Bearer {leave_context['admin_token']}"},
    )
    assert response.status_code == 422
    body = response.json()
    assert "error" in body
    assert "input" not in str(body).lower() or "password" not in str(body)


def test_reject_with_comment_succeeds(db, leave_context):
    req = leave_context["request"]
    response = client.patch(
        f"{API}/leaves/{req.id}/resolve",
        json={"action": "rejected", "manager_comment": "Insufficient coverage"},
        headers={"Authorization": f"Bearer {leave_context['admin_token']}"},
    )
    assert response.status_code == 200
    db.refresh(req)
    assert req.status == LeaveStatus.REJECTED
    assert req.manager_comment == "Insufficient coverage"


def test_employee_cannot_approve_own_leave(db, leave_context):
    req = leave_context["request"]
    before = (
        db.query(AuditLog)
        .filter(
            AuditLog.action_type == "leave.self_approval_denied",
            AuditLog.entity_id == req.id,
        )
        .count()
    )
    response = client.patch(
        f"{API}/leaves/{req.id}/resolve",
        json={"action": "approved", "manager_comment": "ok"},
        headers={"Authorization": f"Bearer {leave_context['employee_token']}"},
    )
    assert response.status_code == 403
    after = (
        db.query(AuditLog)
        .filter(
            AuditLog.action_type == "leave.self_approval_denied",
            AuditLog.entity_id == req.id,
        )
        .count()
    )
    assert after == before + 1
