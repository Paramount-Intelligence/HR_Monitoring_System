"""Intern task completion approval workflow tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    ApprovalStatus,
    AttendanceSessionStatus,
    ProjectStatus,
    TaskCompletionRequestStatus,
    TaskStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.notifications import Notification
from app.models.project import Project
from app.models.task import Task
from app.models.task_completion_request import TaskCompletionRequest
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
def users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Completion Manager {suffix}",
        email=f"completion-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    intern = User(
        full_name=f"Completion Intern {suffix}",
        email=f"completion-intern-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Completion Employee {suffix}",
        email=f"completion-emp-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Completion Outsider {suffix}",
        email=f"completion-out-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, intern, employee, outsider])
    db.flush()
    intern.manager_id = manager.id
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "intern": intern, "employee": employee, "outsider": outsider}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {_login(email)}"}


def _check_in(db, user: User) -> None:
    session = AttendanceSession(
        user_id=user.id,
        check_in_at=datetime.now(timezone.utc),
        work_mode=WorkMode.OFFICE,
        session_status=AttendanceSessionStatus.ACTIVE,
        is_late_login=False,
        is_early_logout=False,
    )
    db.add(session)
    db.commit()


def _seed_task(db, manager: User, assignee: User) -> Task:
    project = Project(
        title="Completion Project",
        description="Test",
        owner_id=manager.id,
        manager_id=manager.id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.flush()
    task = Task(
        project_id=project.id,
        assigned_to=assignee.id,
        created_by=manager.id,
        title="Intern deliverable",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _start_and_stop_timer(email: str, task_id: uuid.UUID) -> None:
    start = client.post(f"{API}/time-logs/start", json={"task_id": str(task_id)}, headers=_headers(email))
    assert start.status_code == 200, start.text
    stop = client.post(f"{API}/time-logs/stop", json={"task_id": str(task_id)}, headers=_headers(email))
    assert stop.status_code == 200, stop.text


class TestInternCompletionRequests:
    def test_intern_can_request_after_timer_stopped(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)

        response = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={"request_note": "Done with implementation"},
            headers=_headers(users["intern"].email),
        )
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["status"] == "pending"
        assert body["task_title"] == task.title
        assert body["requested_by_name"] == users["intern"].full_name

        task_resp = client.get(f"{API}/tasks/{task.id}", headers=_headers(users["intern"].email))
        assert task_resp.status_code == 200
        assert task_resp.json()["status"] == "in_progress"
        assert task_resp.json()["pending_completion_request"]["status"] == "pending"

    def test_intern_cannot_request_while_timer_active(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        start = client.post(
            f"{API}/time-logs/start",
            json={"task_id": str(task.id)},
            headers=_headers(users["intern"].email),
        )
        assert start.status_code == 200

        response = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        )
        assert response.status_code == 400
        detail = response.json().get("detail") or response.text
        assert "timer" in str(detail).lower()

    def test_intern_cannot_request_for_other_task(self, db, users):
        task = _seed_task(db, users["manager"], users["employee"])
        response = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        )
        assert response.status_code == 403

    def test_employee_cannot_use_intern_request_endpoint(self, db, users):
        task = _seed_task(db, users["manager"], users["employee"])
        response = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["employee"].email),
        )
        assert response.status_code == 403

    def test_duplicate_pending_request_blocked(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        headers = _headers(users["intern"].email)
        first = client.post(f"{API}/tasks/{task.id}/completion-requests", json={}, headers=headers)
        assert first.status_code == 201
        second = client.post(f"{API}/tasks/{task.id}/completion-requests", json={}, headers=headers)
        assert second.status_code == 409

    def test_manager_lists_pending_requests(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={"request_note": "Please review"},
            headers=_headers(users["intern"].email),
        )

        response = client.get(
            f"{API}/tasks/completion-requests?status=pending",
            headers=_headers(users["manager"].email),
        )
        assert response.status_code == 200
        rows = response.json()
        assert len(rows) >= 1
        assert any(r["task_title"] == task.title for r in rows)

    def test_outside_manager_cannot_list_intern_requests(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        )

        response = client.get(
            f"{API}/tasks/completion-requests?status=pending",
            headers=_headers(users["outsider"].email),
        )
        assert response.status_code == 200
        assert all(r["task_title"] != task.title for r in response.json())

    def test_manager_approves_and_completes_task(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        created = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        ).json()
        request_id = created["id"]

        approve = client.post(
            f"{API}/tasks/completion-requests/{request_id}/approve",
            json={"manager_comment": "Great work"},
            headers=_headers(users["manager"].email),
        )
        assert approve.status_code == 200, approve.text
        assert approve.json()["status"] == "approved"

        task_resp = client.get(f"{API}/tasks/{task.id}", headers=_headers(users["intern"].email))
        assert task_resp.json()["status"] == "completed"
        assert task_resp.json()["completed_at"] is not None

    def test_manager_reject_requires_comment(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        created = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        ).json()

        reject = client.post(
            f"{API}/tasks/completion-requests/{created['id']}/reject",
            json={"manager_comment": ""},
            headers=_headers(users["manager"].email),
        )
        assert reject.status_code == 422

    def test_manager_reject_keeps_task_open(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        created = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        ).json()

        reject = client.post(
            f"{API}/tasks/completion-requests/{created['id']}/reject",
            json={"manager_comment": "Needs more testing"},
            headers=_headers(users["manager"].email),
        )
        assert reject.status_code == 200
        assert reject.json()["status"] == "rejected"

        task_resp = client.get(f"{API}/tasks/{task.id}", headers=_headers(users["intern"].email))
        assert task_resp.json()["status"] == "in_progress"

    def test_intern_can_request_again_after_rejection(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        created = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        ).json()
        client.post(
            f"{API}/tasks/completion-requests/{created['id']}/reject",
            json={"manager_comment": "Try again"},
            headers=_headers(users["manager"].email),
        )

        again = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={"request_note": "Fixed issues"},
            headers=_headers(users["intern"].email),
        )
        assert again.status_code == 201

    def test_manual_manager_completion_still_works(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(users["manager"].email),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    def test_manual_completion_supersedes_pending_request(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        )

        client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(users["manager"].email),
        )

        row = (
            db.query(TaskCompletionRequest)
            .filter(TaskCompletionRequest.task_id == task.id)
            .order_by(TaskCompletionRequest.requested_at.desc())
            .first()
        )
        assert row is not None
        assert row.status == TaskCompletionRequestStatus.SUPERSEDED

    def test_outside_manager_cannot_approve(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        created = client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        ).json()

        approve = client.post(
            f"{API}/tasks/completion-requests/{created['id']}/approve",
            json={},
            headers=_headers(users["outsider"].email),
        )
        assert approve.status_code == 403

    def test_creates_manager_notification(self, db, users):
        task = _seed_task(db, users["manager"], users["intern"])
        _check_in(db, users["intern"])
        _start_and_stop_timer(users["intern"].email, task.id)
        client.post(
            f"{API}/tasks/{task.id}/completion-requests",
            json={},
            headers=_headers(users["intern"].email),
        )

        notif = (
            db.query(Notification)
            .filter(
                Notification.user_id == users["manager"].id,
                Notification.title == "Task completion requested",
            )
            .first()
        )
        assert notif is not None
        assert task.title in notif.message
