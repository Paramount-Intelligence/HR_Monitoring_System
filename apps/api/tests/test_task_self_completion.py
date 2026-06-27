"""Employee/intern self task completion — no manager approval required."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

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
from app.services.eod_metrics_service import calculate_eod_metrics_for_user

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
def org(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Self Complete Manager {suffix}",
        email=f"self-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Self Complete Employee {suffix}",
        email=f"self-emp-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    intern = User(
        full_name=f"Self Complete Intern {suffix}",
        email=f"self-intern-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Self Complete Outsider {suffix}",
        email=f"self-out-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, employee, intern, outsider])
    db.flush()
    employee.manager_id = manager.id
    intern.manager_id = manager.id
    db.commit()
    return {"manager": manager, "employee": employee, "intern": intern, "outsider": outsider}


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


def _seed_project(db, manager: User) -> Project:
    project = Project(
        title="Self Complete Project",
        description="Test",
        owner_id=manager.id,
        manager_id=manager.id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def _seed_task(
    db,
    project: Project,
    *,
    assignee: User,
    creator: User,
    title: str = "Deliverable",
) -> Task:
    task = Task(
        project_id=project.id,
        assigned_to=assignee.id,
        created_by=creator.id,
        title=title,
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestSelfTaskCompletion:
    def test_employee_can_complete_assigned_task(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["employee"].email),
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "completed"
        assert body["completed_at"] is not None
        assert body["completed_by"] == str(org["employee"].id)

    def test_employee_can_complete_task_they_created(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(
            db,
            project,
            assignee=org["employee"],
            creator=org["employee"],
            title="Self-created task",
        )
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["employee"].email),
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "completed"

    def test_intern_can_complete_assigned_task(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["intern"], creator=org["manager"])
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["intern"].email),
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "completed"

    def test_employee_cannot_complete_unrelated_task(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["outsider"], creator=org["manager"])
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["employee"].email),
        )
        assert response.status_code == 403

    def test_manager_can_complete_team_task(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        response = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["manager"].email),
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "completed"

    def test_completed_task_counts_in_eod_without_approval(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        response = client.post(
            f"{API}/tasks/{task.id}/complete",
            headers=_headers(org["employee"].email),
        )
        assert response.status_code == 200, response.text
        db.refresh(task)
        task.completed_at = datetime.now(timezone.utc)
        db.commit()

        metrics = calculate_eod_metrics_for_user(db, org["employee"].id, date.today())
        assert metrics.task_metrics.completed >= 1

    def test_complete_endpoint_returns_can_complete_false_after_completion(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        before = client.get(f"{API}/tasks/{task.id}", headers=_headers(org["employee"].email))
        assert before.status_code == 200
        assert before.json()["can_complete"] is True

        complete = client.post(f"{API}/tasks/{task.id}/complete", headers=_headers(org["employee"].email))
        assert complete.status_code == 200, complete.text
        body = complete.json()
        assert body["status"] == "completed"
        assert body["can_complete"] is False
        assert body["completed_at"] is not None
        assert body["completed_by"] == str(org["employee"].id)

    def test_complete_stops_active_timer(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        _check_in(db, org["employee"])
        headers = _headers(org["employee"].email)
        start = client.post(
            f"{API}/time-logs/start",
            headers=headers,
            json={"task_id": str(task.id)},
        )
        assert start.status_code == 200, start.text

        complete = client.post(f"{API}/tasks/{task.id}/complete", headers=headers)
        assert complete.status_code == 200, complete.text
        assert complete.json()["status"] == "completed"

        active = client.get(f"{API}/time-logs/active-timer", headers=headers)
        assert active.status_code == 200, active.text
        assert active.json() is None

    def test_reopening_clears_completed_fields(self, db, org):
        project = _seed_project(db, org["manager"])
        task = _seed_task(db, project, assignee=org["employee"], creator=org["manager"])
        complete = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "completed"},
            headers=_headers(org["employee"].email),
        )
        assert complete.status_code == 200
        reopen = client.patch(
            f"{API}/tasks/{task.id}",
            json={"status": "in_progress"},
            headers=_headers(org["employee"].email),
        )
        assert reopen.status_code == 200, reopen.text
        body = reopen.json()
        assert body["status"] == "in_progress"
        assert body["completed_at"] is None
        assert body["completed_by"] is None
