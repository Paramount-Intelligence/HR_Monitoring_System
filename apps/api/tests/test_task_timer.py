"""Task timer start/stop tests."""
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
    TaskStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.project import Project
from app.models.task import Task
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
        full_name=f"Timer Manager {suffix}",
        email=f"timer-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    report = User(
        full_name=f"Timer Report {suffix}",
        email=f"timer-report-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, report])
    db.flush()
    report.manager_id = manager.id
    db.commit()
    return {"manager": manager, "report": report}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


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
        title="Timer Project",
        description="Timer test",
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
        title="Timer Task",
        status=TaskStatus.APPROVED,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_active_timer_includes_task_and_project_titles(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    _check_in(db, users["manager"])
    token = _login(users["manager"].email)
    headers = {"Authorization": f"Bearer {token}"}
    start = client.post(
        f"{API}/time-logs/start",
        headers=headers,
        json={"task_id": str(task.id)},
    )
    assert start.status_code == 200, start.text
    assert start.json()["task_title"] == "Timer Task"
    assert start.json()["project_title"] == "Timer Project"

    active = client.get(f"{API}/time-logs/active-timer", headers=headers)
    assert active.status_code == 200, active.text
    body = active.json()
    assert body["task_title"] == "Timer Task"
    assert body["project_title"] == "Timer Project"


def test_manager_can_start_timer_on_self_assigned_task(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    _check_in(db, users["manager"])
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/time-logs/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": str(task.id)},
    )
    assert response.status_code == 200, response.text
    assert response.json()["task_id"] == str(task.id)


def test_employee_can_start_and_stop_timer(db, users):
    task = _seed_task(db, users["manager"], users["report"])
    _check_in(db, users["report"])
    token = _login(users["report"].email)
    start = client.post(
        f"{API}/time-logs/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": str(task.id)},
    )
    assert start.status_code == 200, start.text

    stop = client.post(
        f"{API}/time-logs/stop",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": str(task.id)},
    )
    assert stop.status_code == 200, stop.text
    assert stop.json()["task_title"] == "Timer Task"


def test_employee_cannot_start_timer_on_unassigned_task(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    _check_in(db, users["report"])
    token = _login(users["report"].email)
    response = client.post(
        f"{API}/time-logs/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": str(task.id)},
    )
    assert response.status_code == 403


def test_manager_cannot_start_timer_on_report_task(db, users):
    task = _seed_task(db, users["manager"], users["report"])
    _check_in(db, users["manager"])
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/time-logs/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"task_id": str(task.id)},
    )
    assert response.status_code == 403
    body = response.json()
    message = body.get("detail") or body.get("error", {}).get("message", "")
    assert "assigned to you" in str(message).lower()


def test_pause_resume_stop_timer_flow(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    _check_in(db, users["manager"])
    token = _login(users["manager"].email)
    headers = {"Authorization": f"Bearer {token}"}

    start = client.post(f"{API}/time-logs/start", headers=headers, json={"task_id": str(task.id)})
    assert start.status_code == 200, start.text
    assert start.json()["status"] == "running"

    pause = client.post(f"{API}/time-logs/pause", headers=headers, json={"task_id": str(task.id)})
    assert pause.status_code == 200, pause.text
    assert pause.json()["status"] == "paused"

    resume = client.post(f"{API}/time-logs/resume", headers=headers, json={"task_id": str(task.id)})
    assert resume.status_code == 200, resume.text
    assert resume.json()["status"] == "running"

    stop = client.post(f"{API}/time-logs/stop", headers=headers, json={"task_id": str(task.id)})
    assert stop.status_code == 200, stop.text
    assert stop.json()["task_title"] == "Timer Task"
    assert stop.json()["ended_at"] is not None


def test_start_second_timer_returns_409(db, users):
    task_a = _seed_task(db, users["manager"], users["manager"])
    project = db.get(Project, task_a.project_id)
    task_b = Task(
        project_id=project.id,
        assigned_to=users["manager"].id,
        created_by=users["manager"].id,
        title="Second Timer Task",
        status=TaskStatus.APPROVED,
    )
    db.add(task_b)
    db.commit()
    db.refresh(task_b)

    _check_in(db, users["manager"])
    token = _login(users["manager"].email)
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post(f"{API}/time-logs/start", headers=headers, json={"task_id": str(task_a.id)})
    assert first.status_code == 200, first.text

    second = client.post(f"{API}/time-logs/start", headers=headers, json={"task_id": str(task_b.id)})
    assert second.status_code == 409
