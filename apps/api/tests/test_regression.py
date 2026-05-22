import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import UserRole, AuditAction
from app.models.audit_log import AuditLog
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def admin_token(db):
    user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert user is not None, "Admin user not found in database"
    # Use JSON for login as per LoginRequest schema
    response = client.post(
        f"{settings.api_v1_prefix}/auth/login", 
        json={"email": user.email, "password": "Admin1234!"}
    )
    if response.status_code != 200:
        print(f"Login failed: {response.json()}")
    assert response.status_code == 200, f"Login failed for {user.email}"
    return response.json()["access_token"]

@pytest.fixture
def intern_token(db):
    user = db.query(User).filter(User.role == UserRole.INTERN).first()
    assert user is not None, "Intern user not found in database"
    response = client.post(
        f"{settings.api_v1_prefix}/auth/login", 
        json={"email": user.email, "password": "Intern123!"}
    )
    if response.status_code != 200:
        print(f"Login failed: {response.json()}")
    assert response.status_code == 200, f"Login failed for {user.email}"
    return response.json()["access_token"]

def test_forgot_password_import_fix():
    """Verify that forgot-password doesn't crash with NameError."""
    response = client.post(f"{settings.api_v1_prefix}/auth/forgot-password", json={"email": "admin@company.com"})
    assert response.status_code in [200, 404, 400]

def test_audit_log_enum_fix(admin_token, db):
    """Verify that audit logs load correctly."""
    response = client.get(
        f"{settings.api_v1_prefix}/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

def test_user_list_scoping_fix(intern_token):
    """Verify that an intern only sees their own user record."""
    response = client.get(
        f"{settings.api_v1_prefix}/users",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 1

def test_admin_project_creation_no_manager_id(admin_token):
    """Verify that an admin can create a project without providing manager_id."""
    payload = {
        "title": "Regression Test Project",
        "description": "Testing optional manager_id",
        "priority": "high"
    }
    response = client.post(
        f"{settings.api_v1_prefix}/projects",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201

def test_standardized_error_response(admin_token):
    """Verify that validation errors follow the new standardized shape."""
    response = client.post(
        f"{settings.api_v1_prefix}/projects", 
        json={},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_user_creation_smtp_mock(admin_token, db):
    """Verify user creation when SMTP is not configured."""
    import secrets
    email = f"test-invited-{secrets.token_hex(4)}@company.com"
    
    # We temporarily clear SMTP_HOST to test mock behavior
    old_smtp_host = settings.smtp_host
    settings.smtp_host = None
    try:
        payload = {
            "full_name": "SMTP Test User",
            "email": email,
            "role": "employee"
        }
        response = client.post(
            f"{settings.api_v1_prefix}/users",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["invitation_email_sent"] is False
        assert data["email_error"] == "SMTP not configured"
        assert "user" in data
        assert data["user"]["email"] == email
        assert data["user"]["status"] == "invited"
        
        # Test resend invitation with mock SMTP
        user_id = data["user"]["id"]
        resend_response = client.post(
            f"{settings.api_v1_prefix}/users/{user_id}/resend-invite",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resend_response.status_code == 200
        resend_data = resend_response.json()
        assert resend_data["email_sent"] is False
        assert resend_data["email_error"] == "SMTP not configured"
        
    finally:
        settings.smtp_host = old_smtp_host


def test_activate_account_flow(admin_token, db):
    """Verify that an invited user can activate their account and log in."""
    import secrets
    from app.services.user_service import UserService
    
    email = f"test-active-{secrets.token_hex(4)}@company.com"
    payload = {
        "full_name": "Activation Test User",
        "email": email,
        "role": "employee"
    }
    
    # Create user as admin
    response = client.post(
        f"{settings.api_v1_prefix}/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    
    # Retrieve user from db to get the invitation token
    user_id = data["user"]["id"]
    raw_token = data["debug_token"]
    assert raw_token is not None
    
    # Now call activate-account
    new_password = "SecurePassword123!"
    activate_payload = {
        "token": raw_token,
        "password": new_password
    }
    activate_response = client.post(
        f"{settings.api_v1_prefix}/auth/activate-account",
        json=activate_payload
    )
    assert activate_response.status_code == 200
    assert activate_response.json()["message"] == "Account activated successfully. You can now log in."
    
    # Confirm status is now active
    user_response = client.get(
        f"{settings.api_v1_prefix}/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert user_response.status_code == 200
    assert user_response.json()["status"] == "active"
    
    # Confirm the user can log in with their new password
    login_response = client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"email": email, "password": new_password}
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["user"]["full_name"] == "Activation Test User"


