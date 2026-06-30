"""Approval Center API tests."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.eod_report import EODReport
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
def approval_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Approval Manager {suffix}",
        email=f"approval-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Approval Employee {suffix}",
        email=f"approval-emp-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    hr = User(
        full_name=f"Approval HR {suffix}",
        email=f"approval-hr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.HR_OPERATIONS,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, employee, hr])
    db.commit()
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "employee": employee, "hr": hr}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _pending_eod(db, user_id) -> EODReport:
    report = EODReport(
        user_id=user_id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Employee submitted EOD with enough detail for approval center tests.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def _find_eod_item(body: dict, report_id: uuid.UUID) -> dict | None:
    for item in body["items"]:
        if item["type"] == "eod" and item["id"] == str(report_id):
            return item
    return None


def test_pending_eod_includes_direct_actions_for_manager(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    token = _login(approval_users["manager"].email)
    response = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "pending", "scope": "my_team"},
    )
    assert response.status_code == 200, response.text
    item = _find_eod_item(response.json(), report.id)
    assert item is not None
    assert set(item["available_actions"]) == {"review", "approve", "request_revision", "reject"}


def test_approved_eod_has_review_only_actions(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    report.status = "Approved"
    db.commit()

    token = _login(approval_users["manager"].email)
    response = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "all", "scope": "my_team"},
    )
    assert response.status_code == 200
    item = _find_eod_item(response.json(), report.id)
    assert item is not None
    assert item["available_actions"] == ["review"]


def test_hr_sees_eod_without_direct_actions(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    token = _login(approval_users["hr"].email)
    response = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "pending", "scope": "organization"},
    )
    assert response.status_code == 200
    item = _find_eod_item(response.json(), report.id)
    assert item is not None
    assert item["available_actions"] == ["review"]


def test_manager_cannot_approve_own_eod_via_review_endpoint(db, approval_users):
    report = _pending_eod(db, approval_users["manager"].id)
    token = _login(approval_users["manager"].email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Self approve attempt"},
    )
    assert response.status_code == 403


def test_manager_can_approve_direct_report_eod_from_review_endpoint(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    token = _login(approval_users["manager"].email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Approved from Approval Center."},
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Approved"


def test_admin_eod_reviews_match_approval_center_pending_item(db, approval_users):
    from app.models.enums import UserRole

    admin = approval_users["manager"]
    admin.role = UserRole.ADMIN
    db.commit()

    report = _pending_eod(db, approval_users["employee"].id)
    token = _login(admin.email)

    approvals = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "pending", "scope": "organization"},
    )
    assert approvals.status_code == 200
    approval_item = _find_eod_item(approvals.json(), report.id)
    assert approval_item is not None

    reviews = client.get(f"{API}/eod/team", headers={"Authorization": f"Bearer {token}"})
    assert reviews.status_code == 200
    review_ids = {row["id"] for row in reviews.json()}
    assert str(report.id) in review_ids


def test_generated_eod_not_in_approval_center(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    report.status = "Generated"
    db.commit()

    token = _login(approval_users["manager"].email)
    response = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "all", "scope": "my_team"},
    )
    assert response.status_code == 200
    assert _find_eod_item(response.json(), report.id) is None


def test_approval_summary_updates_after_eod_action(db, approval_users):
    report = _pending_eod(db, approval_users["employee"].id)
    token = _login(approval_users["manager"].email)
    before = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "pending", "scope": "my_team"},
    ).json()["summary"]["pending"]
    assert before >= 1

    approve = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Looks good"},
    )
    assert approve.status_code == 200

    after = client.get(
        f"{API}/approvals",
        headers={"Authorization": f"Bearer {token}"},
        params={"type": "eod", "status": "pending", "scope": "my_team"},
    ).json()["summary"]["pending"]
    assert after == before - 1
