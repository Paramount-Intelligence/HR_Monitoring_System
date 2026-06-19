"""Project RBAC tests — no role fall-through."""
from __future__ import annotations

import uuid

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
def project_users(db):
    suffix = uuid.uuid4().hex[:8]
    manager = User(
        full_name=f"Proj Manager {suffix}",
        email=f"proj-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    other_manager = User(
        full_name=f"Proj Other Manager {suffix}",
        email=f"proj-other-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
    )
    intern = User(
        full_name=f"Proj Intern {suffix}",
        email=f"proj-intern-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
    )
    employee = User(
        full_name=f"Proj Employee {suffix}",
        email=f"proj-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        manager_id=None,
    )
    admin = User(
        full_name=f"Proj Admin {suffix}",
        email=f"proj-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add_all([manager, other_manager, intern, employee, admin])
    db.flush()
    employee.manager_id = manager.id
    intern.manager_id = manager.id
    db.commit()
    return {
        "manager": manager,
        "other_manager": other_manager,
        "intern": intern,
        "employee": employee,
        "admin": admin,
    }


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_project(db, *, owner, manager, title: str) -> Project:
    project = Project(
        title=title,
        description="RBAC test",
        owner_id=owner.id,
        manager_id=manager.id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def test_intern_cannot_create_project(project_users):
    users = project_users
    token = _login(users["intern"].email)
    response = client.post(
        f"{API}/projects",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Intern Project"},
    )
    assert response.status_code == 403


def test_employee_list_projects_scoped_to_self(db, project_users):
    users = project_users
    own = _seed_project(db, owner=users["employee"], manager=users["manager"], title="Own Project")
    _seed_project(
        db,
        owner=users["other_manager"],
        manager=users["other_manager"],
        title="Outside Project",
    )
    token = _login(users["employee"].email)
    response = client.get(f"{API}/projects", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert str(own.id) in ids
    assert len(ids) == 1


def test_intern_list_projects_empty_without_assignment(db, project_users):
    users = project_users
    _seed_project(db, owner=users["employee"], manager=users["manager"], title="Team Project")
    token = _login(users["intern"].email)
    response = client.get(f"{API}/projects", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []


def test_manager_cannot_read_outside_project(db, project_users):
    users = project_users
    outside = _seed_project(
        db,
        owner=users["other_manager"],
        manager=users["other_manager"],
        title="Outside Scope",
    )
    token = _login(users["manager"].email)
    response = client.get(
        f"{API}/projects/{outside.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_admin_can_read_any_project(db, project_users):
    users = project_users
    project = _seed_project(
        db,
        owner=users["other_manager"],
        manager=users["other_manager"],
        title="Admin Visible",
    )
    token = _login(users["admin"].email)
    response = client.get(
        f"{API}/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Admin Visible"
