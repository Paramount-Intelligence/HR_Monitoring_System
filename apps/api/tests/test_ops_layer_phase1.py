import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker, Session
from datetime import time, datetime, timedelta, timezone
import uuid

from app.main import app
from app.core.deps import get_db
from app.models.base import Base
from app.models.user import User
from app.models.shift import Shift
from app.models.attendance_session import AttendanceSession
from app.models.attendance_correction import AttendanceCorrection
from app.models.enums import UserRole, CorrectionStatus
from app.core.config import settings
from app.services.shift_service import ShiftService
from app.core.security import hash_password

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
        # Seed basic users for auth tests
        admin = User(
            email="admin@test.com",
            password_hash=hash_password("Admin1234!"),
            role=UserRole.ADMIN,
            full_name="Admin User"
        )
        alice = User(
            email="alice@test.com",
            password_hash=hash_password("Employee1234!"),
            role=UserRole.EMPLOYEE,
            full_name="Alice Employee"
        )
        sarah = User(
            email="sarah@test.com",
            password_hash=hash_password("Manager1234!"),
            role=UserRole.MANAGER,
            full_name="Sarah Manager"
        )
        db.add_all([admin, alice, sarah])
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
def admin_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "admin@test.com", "password": "Admin1234!"})
    return response.json()["access_token"]

@pytest.fixture
def alice_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "alice@test.com", "password": "Employee1234!"})
    return response.json()["access_token"]

@pytest.fixture
def sarah_token(client):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": "sarah@test.com", "password": "Manager1234!"})
    return response.json()["access_token"]

def test_overnight_shift_logic():
    """Verify ShiftService correctly detects overnight shift boundaries."""
    day_shift = Shift(start_time=time(9, 0), end_time=time(18, 0), grace_period_minutes=15)
    assert ShiftService.is_late(datetime.combine(datetime.now().date(), time(9, 10)), day_shift) is False
    assert ShiftService.is_late(datetime.combine(datetime.now().date(), time(9, 16)), day_shift) is True
    assert ShiftService.is_early_logout(datetime.combine(datetime.now().date(), time(17, 50)), day_shift) is True
    
    night_shift = Shift(start_time=time(22, 0), end_time=time(6, 0), grace_period_minutes=15)
    assert ShiftService.is_late(datetime.combine(datetime.now().date(), time(22, 10)), night_shift) is False
    assert ShiftService.is_late(datetime.combine(datetime.now().date(), time(22, 16)), night_shift) is True
    assert ShiftService.is_early_logout(datetime.combine(datetime.now().date(), time(5, 50)), night_shift) is True

def test_shift_management_api(client, admin_token, db_session):
    """Verify shift CRUD and assignment."""
    payload = {
        "name": "Evening Shift",
        "start_time": "14:00:00",
        "end_time": "22:00:00",
        "grace_period_minutes": 20,
        "working_days": "1,2,3,4,5"
    }
    response = client.post(
        f"{settings.api_v1_prefix}/shifts",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    shift_id = response.json()["id"]
    
    alice = db_session.query(User).filter(User.email == "alice@test.com").first()
    response = client.post(
        f"{settings.api_v1_prefix}/shifts/assign/{alice.id}?shift_id={shift_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    db_session.refresh(alice)
    assert str(alice.shift_id) == shift_id

def test_attendance_flags_persistence(client, admin_token, db_session):
    """Verify flags are calculated and stored during check-in/out."""
    shift = Shift(name="Early Shift", start_time=time(0, 0), end_time=time(23, 59), grace_period_minutes=0)
    db_session.add(shift)
    db_session.commit()
    
    admin = db_session.query(User).filter(User.email == "admin@test.com").first()
    admin.shift_id = shift.id
    db_session.commit()
    
    response = client.post(
        f"{settings.api_v1_prefix}/attendance/check-in",
        json={"work_mode": "office"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["is_late_login"] is True
    
    response = client.post(
        f"{settings.api_v1_prefix}/attendance/check-out",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["is_early_logout"] is True

def test_attendance_correction_workflow(client, db_session, alice_token, sarah_token):
    """Verify correction request with history and clarification."""
    alice = db_session.query(User).filter(User.email == "alice@test.com").first()
    session = AttendanceSession(
        user_id=alice.id,
        check_in_at=datetime.now(timezone.utc) - timedelta(hours=8),
        check_out_at=datetime.now(timezone.utc) - timedelta(hours=1),
        work_mode="office",
        session_status="completed",
        is_late_login=False,
        is_early_logout=False
    )
    db_session.add(session)
    db_session.commit()
    
    req_check_in = (datetime.now(timezone.utc) - timedelta(hours=9)).isoformat()
    response = client.patch(
        f"{settings.api_v1_prefix}/attendance/{session.id}/correction-request",
        json={
            "requested_check_in_at": req_check_in,
            "reason": "Forgot to check in on time"
        },
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert response.status_code == 200
    
    correction = db_session.query(AttendanceCorrection).filter(AttendanceCorrection.session_id == session.id).first()
    assert correction.original_check_in_at is not None
    
    response = client.patch(
        f"{settings.api_v1_prefix}/attendance/{session.id}/resolve-correction",
        json={"action": "clarify", "manager_comment": "Please provide more details"},
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    assert response.status_code == 200
    db_session.refresh(correction)
    assert correction.status == CorrectionStatus.NEEDS_CLARIFICATION
    
    response = client.patch(
        f"{settings.api_v1_prefix}/attendance/{session.id}/resolve-correction",
        json={"action": "approve", "manager_comment": "Approved after clarification"},
        headers={"Authorization": f"Bearer {sarah_token}"}
    )
    assert response.status_code == 200
    db_session.refresh(session)
    assert session.correction_requested is False
