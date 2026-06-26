"""EOD work summary and submission tests."""
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
def eod_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"EOD Manager {suffix}",
        email=f"eod-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"EOD Employee {suffix}",
        email=f"eod-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        manager_id=None,
    )
    other_employee = User(
        full_name=f"EOD Other {suffix}",
        email=f"eod-other-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, employee, other_employee])
    db.commit()
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "employee": employee, "other": other_employee}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_employee_can_get_own_today_eod(db, eod_users):
    report = EODReport(
        user_id=eod_users["employee"].id,
        report_date=date.today(),
        status="Generated",
        total_hours=5,
        completed_tasks=2,
    )
    db.add(report)
    db.commit()

    token = _login(eod_users["employee"].email)
    response = client.get(
        f"{API}/eod/me/today",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() is not None
    assert response.json()["status"] == "Generated"


def test_employee_can_submit_eod_with_work_summary(db, eod_users):
    token = _login(eod_users["employee"].email)
    summary = "Completed onboarding fixes, reviewed attendance timers, and updated dashboard widgets."
    response = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": summary},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["work_summary"] == summary
    assert body["status"] == "Pending Approval"
    assert body["submitted_at"] is not None


def test_submit_requires_minimum_work_summary_length(db, eod_users):
    token = _login(eod_users["employee"].email)
    response = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Too short"},
    )
    assert response.status_code == 422


def test_submit_same_date_updates_existing_record(db, eod_users):
    token = _login(eod_users["employee"].email)
    first = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "First submission with enough characters for validation."},
    )
    assert first.status_code == 200
    first_id = first.json()["id"]

    report = db.query(EODReport).filter(EODReport.id == uuid.UUID(first_id)).first()
    report.status = "Needs Revision"
    db.commit()

    second = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Updated submission with revised work summary details included."},
    )
    assert second.status_code == 200
    assert second.json()["id"] == first_id
    count = (
        db.query(EODReport)
        .filter(EODReport.user_id == eod_users["employee"].id, EODReport.report_date == date.today())
        .count()
    )
    assert count == 1


def test_generated_metrics_preserved_after_text_update(db, eod_users):
    report = EODReport(
        user_id=eod_users["employee"].id,
        report_date=date.today(),
        status="Generated",
        total_hours=7,
        completed_tasks=4,
        productivity_score=80,
    )
    db.add(report)
    db.commit()

    token = _login(eod_users["employee"].email)
    response = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Submitted while preserving generated metrics for the day."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_hours"] == 7
    assert body["completed_tasks"] == 4
    assert body["productivity_score"] == 80


def test_manager_can_submit_own_eod(db, eod_users):
    token = _login(eod_users["manager"].email)
    response = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Manager personal EOD summary with enough detail for validation."},
    )
    assert response.status_code == 200
    assert response.json()["user_id"] == str(eod_users["manager"].id)


def test_manager_cannot_review_non_team_eod(db, eod_users):
    report = EODReport(
        user_id=eod_users["other"].id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Other employee summary with enough characters included here.",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    token = _login(eod_users["manager"].email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Looks good"},
    )
    assert response.status_code == 403


def test_manager_team_eod_includes_submitted_text_fields(db, eod_users):
    summary = "Shipped attendance fixes and validated manager dashboard metrics today."
    report = EODReport(
        user_id=eod_users["employee"].id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary=summary,
        blockers="Waiting on API credentials.",
        next_day_plan="Finish EOD review modal QA.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()

    token = _login(eod_users["manager"].email)
    response = client.get(
        f"{API}/eod/team",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    row = body[0]
    assert row["work_summary"] == summary
    assert row["blockers"] == "Waiting on API credentials."
    assert row["next_day_plan"] == "Finish EOD review modal QA."
    assert row["user_name"] == eod_users["employee"].full_name


def test_manager_team_eod_hides_generated_without_submission(db, eod_users):
    db.add(
        EODReport(
            user_id=eod_users["employee"].id,
            report_date=date.today(),
            status="Generated",
            work_summary="Should not appear in manager team list.",
        )
    )
    db.commit()

    token = _login(eod_users["manager"].email)
    response = client.get(
        f"{API}/eod/team",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_manager_team_eod_shows_submitted_pending_report(db, eod_users):
    db.add(
        EODReport(
            user_id=eod_users["employee"].id,
            report_date=date.today(),
            status="Pending Approval",
            work_summary="Visible submitted summary with enough detail for manager review.",
            submitted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    token = _login(eod_users["manager"].email)
    response = client.get(
        f"{API}/eod/team",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["status"] == "Pending Approval"


def test_manager_review_approve_still_works(db, eod_users):
    report = EODReport(
        user_id=eod_users["employee"].id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Submitted summary with enough characters for manager approval flow.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    token = _login(eod_users["manager"].email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Great work"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Approved"
    assert response.json()["manager_comments"] == "Great work"
    assert response.json()["work_summary"] == report.work_summary


@pytest.fixture
def manager_chain(db):
    suffix = uuid.uuid4().hex[:8]
    senior = User(
        full_name=f"Senior Manager {suffix}",
        email=f"senior-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    junior = User(
        full_name=f"Junior Manager {suffix}",
        email=f"junior-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([senior, junior])
    db.commit()
    junior.manager_id = senior.id
    db.commit()
    db.refresh(senior)
    db.refresh(junior)
    return {"senior": senior, "junior": junior}


def test_reporting_manager_sees_manager_direct_report_eod(db, manager_chain):
    junior = manager_chain["junior"]
    senior = manager_chain["senior"]
    summary = "Led sprint planning, reviewed team EODs, and closed project blockers today."
    report = EODReport(
        user_id=junior.id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary=summary,
        blockers="None",
        next_day_plan="Follow up on hiring pipeline.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()

    token = _login(senior.email)
    response = client.get(
        f"{API}/eod/team",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    assert body[0]["user_name"] == junior.full_name
    assert body[0]["work_summary"] == summary


def test_manager_does_not_see_own_eod_in_team_list(db, manager_chain):
    junior = manager_chain["junior"]
    db.add(
        EODReport(
            user_id=junior.id,
            report_date=date.today(),
            status="Pending Approval",
            work_summary="Junior manager submitted EOD with enough detail for review.",
            submitted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    token = _login(junior.email)
    response = client.get(
        f"{API}/eod/team",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_manager_cannot_review_own_eod(db, manager_chain):
    junior = manager_chain["junior"]
    report = EODReport(
        user_id=junior.id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Self review attempt should be blocked for manager own EOD.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    token = _login(junior.email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Self approve"},
    )
    assert response.status_code == 403


def test_manager_can_resubmit_after_needs_revision(db, manager_chain):
    junior = manager_chain["junior"]
    token = _login(junior.email)
    first = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Initial manager EOD submission with enough detail included."},
    )
    assert first.status_code == 200
    report_id = first.json()["id"]

    report = db.query(EODReport).filter(EODReport.id == uuid.UUID(report_id)).one()
    report.status = "Needs Revision"
    db.commit()

    second = client.post(
        f"{API}/eod/me/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"work_summary": "Revised manager EOD submission after feedback was requested."},
    )
    assert second.status_code == 200
    assert second.json()["id"] == report_id
    assert second.json()["status"] == "Pending Approval"


@pytest.fixture
def admin_manager_chain(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Admin Reviewer {suffix}",
        email=f"admin-reviewer-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    unrelated_admin = User(
        full_name=f"Unrelated Admin {suffix}",
        email=f"unrelated-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    manager = User(
        full_name=f"Managed Manager {suffix}",
        email=f"managed-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, unrelated_admin, manager])
    db.commit()
    manager.manager_id = admin.id
    db.commit()
    return {"admin": admin, "unrelated_admin": unrelated_admin, "manager": manager}


def test_admin_can_fetch_direct_report_manager_eod(db, admin_manager_chain):
    manager = admin_manager_chain["manager"]
    admin = admin_manager_chain["admin"]
    report = EODReport(
        user_id=manager.id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Manager submitted EOD for admin review with enough detail.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()

    token = _login(admin.email)
    response = client.get(f"{API}/eod/team", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["user_name"] == manager.full_name


def test_unrelated_admin_cannot_see_manager_eod(db, admin_manager_chain):
    manager = admin_manager_chain["manager"]
    db.add(
        EODReport(
            user_id=manager.id,
            report_date=date.today(),
            status="Pending Approval",
            work_summary="Should not be visible to unrelated admin reviewer.",
            submitted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    token = _login(admin_manager_chain["unrelated_admin"].email)
    response = client.get(f"{API}/eod/team", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []


def test_admin_can_review_manager_eod(db, admin_manager_chain):
    manager = admin_manager_chain["manager"]
    admin = admin_manager_chain["admin"]
    report = EODReport(
        user_id=manager.id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Manager EOD awaiting admin approval.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    token = _login(admin.email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Looks good"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"


def test_admin_cannot_review_own_eod(db, admin_manager_chain):
    admin = admin_manager_chain["admin"]
    report = EODReport(
        user_id=admin.id,
        report_date=date.today(),
        status="Pending Approval",
        work_summary="Admin own EOD should not be self-reviewed.",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    token = _login(admin.email)
    response = client.post(
        f"{API}/eod/{report.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Approved", "comments": "Self approve"},
    )
    assert response.status_code == 403
