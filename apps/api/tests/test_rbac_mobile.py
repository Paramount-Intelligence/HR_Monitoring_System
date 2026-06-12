"""Phase 13 RBAC and mobile security regression tests."""
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.main import app
from app.models.enums import UserRole

client = TestClient(app)

NON_ADMIN_ROLES = (
    UserRole.INTERN,
    UserRole.EMPLOYEE,
    UserRole.JUNIOR_EMPLOYEE,
)


@pytest.fixture
def admin_token(db):
    from app.models.user import User

    user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert user is not None
    response = client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"email": user.email, "password": "Admin1234!"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def employee_token(db):
    from app.models.user import User

    user = (
        db.query(User)
        .filter(User.role.in_(NON_ADMIN_ROLES))
        .first()
    )
    if user is None:
        pytest.skip("No employee/intern user in test database")
    password = "Intern123!" if user.role == UserRole.INTERN else "Employee123!"
    response = client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"email": user.email, "password": password},
    )
    if response.status_code != 200:
        pytest.skip(f"Could not login as {user.role}: {response.text}")
    return response.json()["access_token"]


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_employee_cannot_access_other_user_profile(employee_token, db):
    from app.models.user import User

    other = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert other is not None
    response = client.get(
        f"{settings.api_v1_prefix}/users/{other.id}",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert response.status_code == 403


def test_employee_user_list_not_full_org(employee_token, db):
    from app.models.user import User

    total_users = db.query(User).count()
    response = client.get(
        f"{settings.api_v1_prefix}/users",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) < total_users


def test_employee_cannot_list_admin_call_recordings(employee_token):
    response = client.get(
        f"{settings.api_v1_prefix}/admin/call-recordings",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert response.status_code == 403


def test_admin_can_list_call_recordings(admin_token):
    response = client.get(
        f"{settings.api_v1_prefix}/admin/call-recordings",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code in (200, 404)


def test_employee_cannot_access_org_analytics(employee_token):
    response = client.get(
        f"{settings.api_v1_prefix}/analytics/best-performers",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert response.status_code == 403


def test_ws_rejects_missing_token():
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{settings.api_v1_prefix}/ws"):
            pass


def test_ws_rejects_invalid_token():
    with pytest.raises(Exception):
        with client.websocket_connect(f"{settings.api_v1_prefix}/ws?token=not-a-valid-jwt"):
            pass


def test_profile_media_rejects_path_traversal():
    response = client.get(f"{settings.api_v1_prefix}/media/profile-pictures/../../etc/passwd")
    assert response.status_code in (400, 404)


def test_unauthenticated_static_profile_mount_removed():
    """Legacy unauthenticated /media/profile-pictures mount must not exist."""
    response = client.get("/media/profile-pictures/test.jpg")
    assert response.status_code == 404
