"""Time log listing RBAC and display field tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import (
    ApprovalStatus,
    ProjectStatus,
    TaskStatus,
    TimeLogSourceType,
    TimeLogStatus,
    UserRole,
    UserStatus,
)
from app.models.project import Project
from app.models.task import Task
from app.models.time_log import TimeLog
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
        full_name=f"Log Manager {suffix}",
        email=f"log-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    report = User(
        full_name=f"Log Report {suffix}",
        email=f"log-report-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Log Outsider {suffix}",
        email=f"log-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, report, outsider])
    db.flush()
    report.manager_id = manager.id
    db.commit()
    return {"manager": manager, "report": report, "outsider": outsider}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_task(db, manager: User, assignee: User) -> Task:
    project = Project(
        title="Log Project",
        description="Time log test",
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
        title="Logged Task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _seed_log(db, task: Task, user: User) -> TimeLog:
    now = datetime.now(timezone.utc)
    log = TimeLog(
        task_id=task.id,
        user_id=user.id,
        started_at=now,
        ended_at=now,
        duration_minutes=30,
        source_type=TimeLogSourceType.MANUAL,
        status=TimeLogStatus.COMPLETED,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def test_manager_team_logs_include_self_and_reports(db, users):
    manager_task = _seed_task(db, users["manager"], users["manager"])
    report_task = _seed_task(db, users["manager"], users["report"])
    outsider_task = _seed_task(db, users["outsider"], users["outsider"])
    manager_log = _seed_log(db, manager_task, users["manager"])
    report_log = _seed_log(db, report_task, users["report"])
    _seed_log(db, outsider_task, users["outsider"])

    token = _login(users["manager"].email)
    response = client.get(f"{API}/time-logs/team", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(manager_log.id) in ids
    assert str(report_log.id) in ids
    assert len(ids) == 2


def test_team_log_response_includes_display_names(db, users):
    task = _seed_task(db, users["manager"], users["report"])
    log = _seed_log(db, task, users["report"])
    token = _login(users["manager"].email)
    response = client.get(f"{API}/time-logs/team", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    entry = next(item for item in response.json() if item["id"] == str(log.id))
    assert entry["user_name"] == users["report"].full_name
    assert entry["task_title"] == "Logged Task"
    assert entry["project_title"] == "Log Project"


def test_manual_entry_returns_readable_fields(db, users):
    from app.models.attendance_session import AttendanceSession
    from app.models.enums import AttendanceSessionStatus, WorkMode

    task = _seed_task(db, users["manager"], users["manager"])
    session = AttendanceSession(
        user_id=users["manager"].id,
        check_in_at=datetime.now(timezone.utc),
        work_mode=WorkMode.OFFICE,
        session_status=AttendanceSessionStatus.ACTIVE,
        is_late_login=False,
        is_early_logout=False,
    )
    db.add(session)
    db.commit()

    from datetime import timedelta

    token = _login(users["manager"].email)
    started = datetime.now(timezone.utc)
    ended = started + timedelta(minutes=30)
    response = client.post(
        f"{API}/time-logs/manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "task_id": str(task.id),
            "started_at": started.isoformat(),
            "ended_at": ended.isoformat(),
            "notes": "Manual test",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["task_title"] == "Logged Task"
    assert body["project_title"] == "Log Project"
    assert body["user_name"] == users["manager"].full_name


def test_manual_entry_rejects_outside_scope_task(db, users):
    from datetime import timedelta

    task = _seed_task(db, users["manager"], users["report"])
    token = _login(users["manager"].email)
    started = datetime.now(timezone.utc)
    ended = started + timedelta(minutes=30)
    response = client.post(
        f"{API}/time-logs/manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "task_id": str(task.id),
            "started_at": started.isoformat(),
            "ended_at": ended.isoformat(),
        },
    )
    assert response.status_code == 403


def test_employee_sees_own_logs_only(db, users):
    own_task = _seed_task(db, users["manager"], users["report"])
    other_task = _seed_task(db, users["manager"], users["manager"])
    own_log = _seed_log(db, own_task, users["report"])
    _seed_log(db, other_task, users["manager"])

    token = _login(users["report"].email)
    response = client.get(f"{API}/time-logs/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert ids == {str(own_log.id)}
