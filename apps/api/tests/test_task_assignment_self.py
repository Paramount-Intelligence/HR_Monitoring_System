"""Manager self-assignment and task display field tests."""
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
        full_name=f"Task Manager {suffix}",
        email=f"task-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    outsider = User(
        full_name=f"Task Outsider {suffix}",
        email=f"task-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    report = User(
        full_name=f"Task Report {suffix}",
        email=f"task-report-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, outsider, report])
    db.flush()
    report.manager_id = manager.id
    db.commit()
    return {"manager": manager, "outsider": outsider, "report": report}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_project(db, manager: User) -> Project:
    project = Project(
        title="Task Project",
        description="Assignment test",
        owner_id=manager.id,
        manager_id=manager.id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def test_manager_can_assign_task_to_self(db, users):
    project = _seed_project(db, users["manager"])
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "project_id": str(project.id),
            "assigned_to": str(users["manager"].id),
            "title": "Self assigned task",
            "priority": "medium",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["assigned_to"] == str(users["manager"].id)
    assert body["assigned_to_name"] == users["manager"].full_name


def test_manager_can_assign_task_to_direct_report(db, users):
    project = _seed_project(db, users["manager"])
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "project_id": str(project.id),
            "assigned_to": str(users["report"].id),
            "title": "Delegated task",
            "priority": "medium",
        },
    )
    assert response.status_code == 201
    assert response.json()["assigned_to_name"] == users["report"].full_name


def test_manager_cannot_assign_task_to_outsider(db, users):
    project = _seed_project(db, users["manager"])
    token = _login(users["manager"].email)
    response = client.post(
        f"{API}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "project_id": str(project.id),
            "assigned_to": str(users["outsider"].id),
            "title": "Forbidden task",
            "priority": "medium",
        },
    )
    assert response.status_code == 403


def test_manager_list_includes_self_assigned_tasks(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["manager"].id,
        created_by=users["manager"].id,
        title="Manager own task",
        status=TaskStatus.CREATED,
    )
    db.add(task)
    db.commit()
    token = _login(users["manager"].email)
    response = client.get(f"{API}/tasks", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(task.id) in ids


def test_manager_list_returns_assignee_name_for_employee_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["report"].id,
        created_by=users["manager"].id,
        title="Employee task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["manager"].email)
    response = client.get(f"{API}/tasks", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    entry = next(item for item in response.json() if item["id"] == str(task.id))
    assert entry["assigned_to_name"] == users["report"].full_name
    assert entry["project_title"] == project.title


def test_manager_can_get_self_assigned_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["manager"].id,
        created_by=users["manager"].id,
        title="Self assigned task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["manager"].email)
    response = client.get(f"{API}/tasks/{task.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == str(task.id)
    assert body["assigned_to_name"] == users["manager"].full_name
    assert body["project_title"] == project.title


def test_manager_can_get_direct_report_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["report"].id,
        created_by=users["manager"].id,
        title="Report task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["manager"].email)
    response = client.get(f"{API}/tasks/{task.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["assigned_to_name"] == users["report"].full_name


def test_manager_cannot_get_outsider_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["outsider"].id,
        created_by=users["outsider"].id,
        title="Outsider task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["manager"].email)
    response = client.get(f"{API}/tasks/{task.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_employee_can_get_assigned_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["report"].id,
        created_by=users["manager"].id,
        title="My task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["report"].email)
    response = client.get(f"{API}/tasks/{task.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["project_title"] == project.title


def test_employee_cannot_get_unrelated_task(db, users):
    project = _seed_project(db, users["manager"])
    task = Task(
        project_id=project.id,
        assigned_to=users["outsider"].id,
        created_by=users["outsider"].id,
        title="Someone else task",
        status=TaskStatus.IN_PROGRESS,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    token = _login(users["report"].email)
    response = client.get(f"{API}/tasks/{task.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
