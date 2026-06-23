"""Task edit and archive RBAC tests."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import ApprovalStatus, ProjectStatus, TaskStatus, UserRole, UserStatus
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
        full_name=f"Edit Task Manager {suffix}",
        email=f"edit-task-mgr-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    report = User(
        full_name=f"Edit Task Report {suffix}",
        email=f"edit-task-report-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Edit Task Outsider {suffix}",
        email=f"edit-task-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    admin = User(
        full_name=f"Edit Task Admin {suffix}",
        email=f"edit-task-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, report, outsider, admin])
    db.flush()
    report.manager_id = manager.id
    db.commit()
    return {"manager": manager, "report": report, "outsider": outsider, "admin": admin}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_task(db, manager: User, assignee: User, title: str = "Edit me") -> Task:
    project = Project(
        title="Task Edit Project",
        description="test",
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
        title=title,
        status=TaskStatus.CREATED,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_manager_edits_self_assigned_task(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/tasks/{task.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Updated self task", "description": "New desc"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Updated self task"
    assert response.json()["assigned_to_name"] == users["manager"].full_name


def test_manager_edits_delegated_task(db, users):
    task = _seed_task(db, users["manager"], users["report"])
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/tasks/{task.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"priority": "high"},
    )
    assert response.status_code == 200
    assert response.json()["priority"] == "high"


def test_manager_cannot_edit_outside_task(db, users):
    task = _seed_task(db, users["outsider"], users["outsider"])
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/tasks/{task.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Nope"},
    )
    assert response.status_code == 403


def test_manager_archives_self_task(db, users):
    task = _seed_task(db, users["manager"], users["manager"], title="Archive me")
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/tasks/{task.id}/archive",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


def test_archived_task_hidden_from_list(db, users):
    task = _seed_task(db, users["manager"], users["manager"])
    token = _login(users["manager"].email)
    client.patch(
        f"{API}/tasks/{task.id}/archive",
        headers={"Authorization": f"Bearer {token}"},
    )
    listed = client.get(f"{API}/tasks", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    ids = {item["id"] for item in listed.json()}
    assert str(task.id) not in ids


def test_admin_include_archived_tasks(db, users):
    task = _seed_task(db, users["manager"], users["report"])
    mgr_token = _login(users["manager"].email)
    client.patch(
        f"{API}/tasks/{task.id}/archive",
        headers={"Authorization": f"Bearer {mgr_token}"},
    )
    admin_token = _login(users["admin"].email)
    response = client.get(
        f"{API}/tasks?include_archived=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(task.id) in ids
