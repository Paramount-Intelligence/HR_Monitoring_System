import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker, Session
from datetime import date, datetime, timedelta, timezone
import uuid

from app.main import app
from app.core.deps import get_db
from app.models.base import Base
from app.models.user import User
from app.models.leave_request import LeaveRequest
from app.models.approval_timeline import ApprovalTimeline
from app.models.enums import UserRole, LeaveStatus, LeaveType, HalfDayPeriod, ApprovalAction, ApprovalEntityType
from app.core.config import settings
from app.core.security import hash_password
from app.tasks.approvals import check_stale_leaves

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed basic users
        admin = User(email="admin@test.com", password_hash=hash_password("Admin1234!"), role=UserRole.ADMIN, full_name="Admin User")
        alice = User(email="alice@test.com", password_hash=hash_password("Employee1234!"), role=UserRole.EMPLOYEE, full_name="Alice Employee")
        sarah = User(email="sarah@test.com", password_hash=hash_password("Manager1234!"), role=UserRole.MANAGER, full_name="Sarah Manager")
        hr = User(email="hr@test.com", password_hash=hash_password("HR1234!"), role=UserRole.HR_OPERATIONS, full_name="HR User")
        
        db.add_all([admin, alice, sarah, hr])
        db.commit()
        alice.manager_id = sarah.id
        db.commit()
        
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def alice_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "alice@test.com", "password": "Employee1234!"})
    return response.json()["access_token"]

@pytest.fixture
def sarah_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "sarah@test.com", "password": "Manager1234!"})
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "admin@test.com", "password": "Admin1234!"})
    return response.json()["access_token"]

def test_leave_submission_and_overlap(client, alice_token, db_session):
    """Verify leave submission and overlap validation."""
    # 1. Submit valid leave
    payload = {
        "start_date": "2026-05-01",
        "end_date": "2026-05-05",
        "leave_type": "annual",
        "reason": "Vacation"
    }
    response = client.post(f"{settings.api_v1_prefix}/leaves", json=payload, headers={"Authorization": f"Bearer {alice_token}"})
    assert response.status_code == 200
    req_id = response.json()["id"]
    
    # 2. Check overlap (Full day vs Full day)
    response = client.post(f"{settings.api_v1_prefix}/leaves", json=payload, headers={"Authorization": f"Bearer {alice_token}"})
    assert response.status_code == 409
    
    # 3. Check overlap (Half day vs Full day)
    payload_half = {
        "start_date": "2026-05-03",
        "end_date": "2026-05-03",
        "leave_type": "half_day",
        "is_half_day": True,
        "half_day_period": "first_half",
        "reason": "Appointment"
    }
    response = client.post(f"{settings.api_v1_prefix}/leaves", json=payload_half, headers={"Authorization": f"Bearer {alice_token}"})
    assert response.status_code == 409
    
    # 4. Submit valid half day outside range
    payload_half["start_date"] = "2026-05-10"
    payload_half["end_date"] = "2026-05-10"
    response = client.post(f"{settings.api_v1_prefix}/leaves", json=payload_half, headers={"Authorization": f"Bearer {alice_token}"})
    assert response.status_code == 200

def test_wfh_overlap_with_leave(client, alice_token, db_session):
    """Verify WFH cannot overlap with approved leave."""
    # 1. Alice has annual leave on May 20
    db_session.add(LeaveRequest(
        user_id=db_session.query(User).filter(User.email=="alice@test.com").first().id,
        start_date=date(2026, 5, 20),
        end_date=date(2026, 5, 20),
        leave_type=LeaveType.ANNUAL,
        status=LeaveStatus.APPROVED,
        reason="Leave"
    ))
    db_session.commit()
    
    # 2. Alice tries to request WFH on May 20
    payload = {
        "start_date": "2026-05-20",
        "end_date": "2026-05-20",
        "leave_type": "wfh",
        "reason": "WFH"
    }
    response = client.post(f"{settings.api_v1_prefix}/leaves", json=payload, headers={"Authorization": f"Bearer {alice_token}"})
    assert response.status_code == 409

def test_manager_resolution_and_timeline(client, alice_token, sarah_token, db_session):
    """Verify manager approval workflow and timeline logging."""
    # 1. Alice submits
    payload = {
        "start_date": "2026-06-01",
        "end_date": "2026-06-01",
        "leave_type": "sick",
        "reason": "Fever"
    }
    resp = client.post(f"{settings.api_v1_prefix}/leaves", json=payload, headers={"Authorization": f"Bearer {alice_token}"})
    req_id = resp.json()["id"]
    
    # 2. Sarah requests clarification
    client.patch(
        f"{settings.api_v1_prefix}/leaves/{req_id}/resolve",
        json={"action": "clarified", "manager_comment": "Send doctor note"},
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    
    # 3. Sarah approves
    client.patch(
        f"{settings.api_v1_prefix}/leaves/{req_id}/resolve",
        json={"action": "approved", "manager_comment": "Ok, get well soon"},
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    
    # 4. Verify timeline
    response = client.get(f"{settings.api_v1_prefix}/leaves/{req_id}/timeline", headers={"Authorization": f"Bearer {alice_token}"})
    timeline = response.json()
    assert len(timeline) == 3
    assert timeline[0]["action"] == "created"
    assert timeline[1]["action"] == "clarified"
    assert timeline[2]["action"] == "approved"

def test_escalation_logic(client, alice_token, db_session):
    """Verify auto-escalation task."""
    # 1. Create a stale request
    alice = db_session.query(User).filter(User.email=="alice@test.com").first()
    sarah = db_session.query(User).filter(User.email=="sarah@test.com").first()
    req = LeaveRequest(
        user_id=alice.id,
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 1),
        leave_type=LeaveType.ANNUAL,
        reason="Old request",
        status=LeaveStatus.PENDING,
        current_approver_id=sarah.id
    )
    db_session.add(req)
    db_session.commit()
    
    # Hack: set created_at back 3 days
    db_session.query(LeaveRequest).filter(LeaveRequest.id == req.id).update({
        "created_at": datetime.now(timezone.utc) - timedelta(days=3)
    })
    db_session.commit()
    
    # 2. Run escalation task
    result = check_stale_leaves(db=db_session)
    assert "Escalated 1 requests" in result
    
    # 3. Verify status and approver
    db_session.refresh(req)
    assert req.status == LeaveStatus.ESCALATED
    assert req.current_approver_id != sarah.id
    assert req.escalated_from_id == sarah.id
