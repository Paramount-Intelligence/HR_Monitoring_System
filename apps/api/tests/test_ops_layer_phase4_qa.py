import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from datetime import date, datetime, timedelta, timezone
import uuid

from app.main import app
from app.core.deps import get_db
from app.models.base import Base
from app.models.user import User
from app.models.attendance_session import AttendanceSession
from app.models.leave_request import LeaveRequest
from app.models.daily_stats import DailyStats
from app.models.enums import UserRole, LeaveStatus, LeaveType, AttendanceSessionStatus
from app.core.config import settings
from app.core.security import hash_password
from app.services.aggregation_service import AggregationService
from app.services.report_service import ReportService

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
        # Seed users
        admin = User(email="admin@qa.com", password_hash=hash_password("Admin1234!"), role=UserRole.ADMIN, full_name="Admin QA")
        hr = User(email="hr@qa.com", password_hash=hash_password("HR1234!"), role=UserRole.HR_OPERATIONS, full_name="HR QA")
        manager = User(email="manager@qa.com", password_hash=hash_password("Manager1234!"), role=UserRole.MANAGER, full_name="Manager QA")
        emp = User(email="emp@qa.com", password_hash=hash_password("Employee1234!"), role=UserRole.EMPLOYEE, full_name="Employee QA")
        
        db.add_all([admin, hr, manager, emp])
        db.commit()
        emp.manager_id = manager.id
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

def get_token(client, email, password):
    response = client.post(f"{settings.api_v1_prefix}/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]

def test_aggregation_accuracy(db_session):
    """Verify aggregation logic for exceptions, leaves, WFH, and idempotency."""
    emp = db_session.query(User).filter(User.email == "emp@qa.com").first()
    target_date = date(2026, 8, 1)
    service = AggregationService(db_session)

    # 1. Late Login & Early Logout propagation
    sess = AttendanceSession(
        user_id=emp.id,
        check_in_at=datetime(2026, 8, 1, 9, 30, tzinfo=timezone.utc), # Late
        check_out_at=datetime(2026, 8, 1, 16, 0, tzinfo=timezone.utc), # Early
        is_late_login=True,
        is_early_logout=True,
        total_hours=6.5,
        work_mode="wfh",
        session_status=AttendanceSessionStatus.COMPLETED
    )
    db_session.add(sess)
    db_session.commit()

    stats = service.compute_daily_snapshot(emp.id, target_date)
    assert stats.is_late_login is True
    assert stats.is_early_logout is True
    assert stats.total_hours == 6.5
    assert stats.is_wfh is True
    assert stats.is_absent is False

    # 2. Approved leave prevents false absence
    leave_date = date(2026, 8, 2)
    leave = LeaveRequest(
        user_id=emp.id,
        start_date=leave_date,
        end_date=leave_date,
        leave_type=LeaveType.ANNUAL,
        status=LeaveStatus.APPROVED,
        reason="Vacation"
    )
    db_session.add(leave)
    db_session.commit()

    stats_leave = service.compute_daily_snapshot(emp.id, leave_date)
    assert stats_leave.is_absent is False
    assert stats_leave.leave_type == LeaveType.ANNUAL
    assert stats_leave.total_hours == 0.0

    # 3. True Absence
    absent_date = date(2026, 8, 3)
    stats_absent = service.compute_daily_snapshot(emp.id, absent_date)
    assert stats_absent.is_absent is True

    # 4. Idempotency check
    stats_recheck = service.compute_daily_snapshot(emp.id, target_date)
    assert stats_recheck.id == stats.id
    assert stats_recheck.total_hours == 6.5

def test_permission_scoping(client, db_session):
    """Verify role-based access for report endpoints."""
    emp_token = get_token(client, "emp@qa.com", "Employee1234!")
    manager_token = get_token(client, "manager@qa.com", "Manager1234!")
    hr_token = get_token(client, "hr@qa.com", "HR1234!")
    admin_token = get_token(client, "admin@qa.com", "Admin1234!")

    params = {"start_date": "2026-08-01", "end_date": "2026-08-07"}

    # 1. Employee sees own
    resp = client.get(f"{settings.api_v1_prefix}/reports/employee", params=params, headers={"Authorization": f"Bearer {emp_token}"})
    assert resp.status_code == 200
    assert resp.json()["user_name"] == "Employee QA"

    # 2. Employee cannot see manager/hr/admin
    assert client.get(f"{settings.api_v1_prefix}/reports/manager", params=params, headers={"Authorization": f"Bearer {emp_token}"}).status_code == 403
    assert client.get(f"{settings.api_v1_prefix}/reports/hr", params=params, headers={"Authorization": f"Bearer {emp_token}"}).status_code == 403
    assert client.get(f"{settings.api_v1_prefix}/reports/admin", params=params, headers={"Authorization": f"Bearer {emp_token}"}).status_code == 403

    # 3. Manager sees team
    resp = client.get(f"{settings.api_v1_prefix}/reports/manager", params=params, headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 200
    assert any(r["user_name"] == "Employee QA" for r in resp.json())

    # 4. HR sees org
    resp = client.get(f"{settings.api_v1_prefix}/reports/hr", params=params, headers={"Authorization": f"Bearer {hr_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # 5. Admin sees org
    resp = client.get(f"{settings.api_v1_prefix}/reports/admin", params=params, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
