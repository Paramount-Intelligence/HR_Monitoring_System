"""Project edit and archive RBAC tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import ApprovalStatus, ProjectStatus, UserRole, UserStatus
from app.models.project import Project
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
        full_name=f"Edit Manager {suffix}",
        email=f"edit-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    other_manager = User(
        full_name=f"Edit Other Manager {suffix}",
        email=f"edit-other-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Edit Employee {suffix}",
        email=f"edit-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    admin = User(
        full_name=f"Edit Admin {suffix}",
        email=f"edit-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, other_manager, employee, admin])
    db.flush()
    employee.manager_id = manager.id
    db.commit()
    return {"manager": manager, "other_manager": other_manager, "employee": employee, "admin": admin}


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_project(db, *, owner, manager, title: str, status: ProjectStatus = ProjectStatus.ACTIVE) -> Project:
    project = Project(
        title=title,
        description="Edit/archive test",
        owner_id=owner.id,
        manager_id=manager.id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=status,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def test_admin_can_edit_project(db, users):
    project = _seed_project(db, owner=users["manager"], manager=users["manager"], title="Editable")
    token = _login(users["admin"].email)
    response = client.patch(
        f"{API}/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Updated Title", "description": "Updated description"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated Title"
    assert body["manager_name"] == users["manager"].full_name


def test_manager_can_edit_own_project(db, users):
    project = _seed_project(db, owner=users["manager"], manager=users["manager"], title="Manager Owned")
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Manager Updated"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Manager Updated"


def test_manager_cannot_edit_outside_project(db, users):
    project = _seed_project(
        db,
        owner=users["other_manager"],
        manager=users["other_manager"],
        title="Outside",
    )
    token = _login(users["manager"].email)
    response = client.patch(
        f"{API}/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Should Fail"},
    )
    assert response.status_code == 403


def test_employee_cannot_edit_project(db, users):
    project = _seed_project(db, owner=users["employee"], manager=users["manager"], title="Employee Owned")
    token = _login(users["employee"].email)
    response = client.patch(
        f"{API}/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Should Fail"},
    )
    assert response.status_code == 403


def test_admin_can_archive_project(db, users):
    project = _seed_project(db, owner=users["manager"], manager=users["manager"], title="To Archive")
    token = _login(users["admin"].email)
    response = client.patch(
        f"{API}/projects/{project.id}/archive",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["project_status"] == "archived"


def test_archived_hidden_from_default_list(db, users):
    active = _seed_project(db, owner=users["manager"], manager=users["manager"], title="Active One")
    archived = _seed_project(
        db,
        owner=users["manager"],
        manager=users["manager"],
        title="Archived One",
        status=ProjectStatus.ARCHIVED,
    )
    token = _login(users["admin"].email)
    response = client.get(f"{API}/projects", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(active.id) in ids
    assert str(archived.id) not in ids


def test_admin_include_archived_shows_archived(db, users):
    archived = _seed_project(
        db,
        owner=users["manager"],
        manager=users["manager"],
        title="Archived Visible",
        status=ProjectStatus.ARCHIVED,
    )
    token = _login(users["admin"].email)
    response = client.get(
        f"{API}/projects?include_archived=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(archived.id) in ids
