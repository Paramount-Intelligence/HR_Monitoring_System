"""Admin dashboard user management analytics tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.core.time_utils import pk_day_start, pk_now, pk_today
from app.main import app
from app.models.attendance_session import AttendanceSession
from app.models.enums import (
    ApprovalStatus,
    AttendanceSessionStatus,
    LeaveStatus,
    LeaveType,
    ProjectStatus,
    TaskStatus,
    TimeLogSourceType,
    TimeLogStatus,
    UserRole,
    UserStatus,
    WorkMode,
)
from app.models.leave_request import LeaveRequest
from app.models.project import Project
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.admin_user_management_service import (
    is_present_status,
    logged_hours_by_user,
    resolve_today_attendance_status,
    sessions_for_business_date,
    task_counts_by_user,
)

client = TestClient(app)
API = settings.api_v1_prefix
PASSWORD = "TestPass123!"


class TestResolveTodayAttendanceStatus:
    def test_open_check_in_is_present(self):
        session = SimpleNamespace(
            work_mode=WorkMode.OFFICE,
            is_late_login=False,
            check_out_at=None,
        )
        assert resolve_today_attendance_status(session=session, leave=None) == "Present"

    def test_completed_check_in_is_checked_out(self):
        session = SimpleNamespace(
            work_mode=WorkMode.OFFICE,
            is_late_login=False,
            check_out_at=pk_now(),
        )
        assert resolve_today_attendance_status(session=session, leave=None) == "Checked Out"

    def test_late_check_in_is_late(self):
        session = SimpleNamespace(
            work_mode=WorkMode.OFFICE,
            is_late_login=True,
            check_out_at=None,
        )
        assert resolve_today_attendance_status(session=session, leave=None) == "Late"

    def test_approved_leave_overrides_absent(self):
        leave = SimpleNamespace(leave_type=LeaveType.ANNUAL)
        assert resolve_today_attendance_status(session=None, leave=leave) == "On Leave"

    def test_wfh_session(self):
        session = SimpleNamespace(
            work_mode=WorkMode.WFH,
            is_late_login=False,
            check_out_at=None,
        )
        assert resolve_today_attendance_status(session=session, leave=None) == "WFH"

    def test_wfh_leave_without_session(self):
        leave = SimpleNamespace(leave_type=LeaveType.WFH)
        assert resolve_today_attendance_status(session=None, leave=leave) == "WFH"

    def test_no_session_no_leave_is_absent(self):
        assert resolve_today_attendance_status(session=None, leave=None) == "Absent"

    def test_present_statuses(self):
        assert is_present_status("Present")
        assert is_present_status("Late")
        assert is_present_status("Checked Out")
        assert is_present_status("WFH")
        assert not is_present_status("Absent")
        assert not is_present_status("On Leave")


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_token(db):
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert admin is not None
    response = client.post(
        f"{API}/auth/login",
        json={"email": admin.email, "password": "Admin1234!"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def roster_context(db):
    suffix = uuid.uuid4().hex[:8]
    password = PASSWORD
    manager = User(
        full_name=f"Roster Manager {suffix}",
        email=f"roster-manager-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="QA Dept",
    )
    present_user = User(
        full_name=f"Present User {suffix}",
        email=f"present-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
        department="QA Dept",
    )
    absent_user = User(
        full_name=f"Absent User {suffix}",
        email=f"absent-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="QA Dept",
    )
    db.add_all([manager, present_user, absent_user])
    db.flush()
    present_user.manager_id = manager.id
    absent_user.manager_id = manager.id

    check_in = pk_day_start(pk_today()) + timedelta(hours=9)
    db.add(
        AttendanceSession(
            user_id=present_user.id,
            check_in_at=check_in,
            work_mode=WorkMode.OFFICE,
            session_status=AttendanceSessionStatus.ACTIVE,
            is_late_login=False,
        )
    )
    db.commit()
    db.refresh(present_user)
    db.refresh(absent_user)
    return {
        "present_user": present_user,
        "absent_user": absent_user,
        "manager": manager,
    }


def test_sessions_for_business_date_returns_latest_per_user(db, roster_context):
    sessions = sessions_for_business_date(db, pk_today())
    assert roster_context["present_user"].id in sessions
    assert sessions[roster_context["present_user"].id].check_in_at is not None


def test_open_check_in_shows_present_not_absent(db, roster_context, admin_token):
    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    roster = {row["id"]: row for row in body["employee_roster"]}
    present_row = roster[str(roster_context["present_user"].id)]
    absent_row = roster[str(roster_context["absent_user"].id)]
    assert present_row["today_attendance"] in {"Present", "Late", "Checked Out", "WFH"}
    assert present_row["today_attendance"] != "Absent"
    assert absent_row["today_attendance"] == "Absent"
    assert body["summary"]["present_today"] >= 1


def test_late_check_in_shows_late(db, roster_context, admin_token):
    session = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.user_id == roster_context["present_user"].id)
        .one()
    )
    session.is_late_login = True
    db.commit()

    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    roster = {row["id"]: row for row in response.json()["employee_roster"]}
    assert roster[str(roster_context["present_user"].id)]["today_attendance"] == "Late"
    assert response.json()["summary"]["late_today"] >= 1


def test_approved_leave_overrides_absent(db, roster_context, admin_token):
    today = pk_today()
    db.add(
        LeaveRequest(
            user_id=roster_context["absent_user"].id,
            start_date=today,
            end_date=today,
            leave_type=LeaveType.ANNUAL,
            reason="Approved leave test",
            status=LeaveStatus.APPROVED,
        )
    )
    db.commit()

    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    roster = {row["id"]: row for row in response.json()["employee_roster"]}
    assert roster[str(roster_context["absent_user"].id)]["today_attendance"] == "On Leave"
    assert response.json()["summary"]["on_leave"] >= 1


def test_wfh_attendance_shows_wfh(db, roster_context, admin_token):
    session = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.user_id == roster_context["present_user"].id)
        .one()
    )
    session.work_mode = WorkMode.WFH
    session.is_late_login = False
    db.commit()

    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    roster = {row["id"]: row for row in response.json()["employee_roster"]}
    assert roster[str(roster_context["present_user"].id)]["today_attendance"] == "WFH"
    assert response.json()["summary"]["wfh_today"] >= 1


def test_task_and_logged_hours_aggregation(db, roster_context):
    project = Project(
        title="Roster Project",
        description="Dashboard roster test",
        owner_id=roster_context["manager"].id,
        manager_id=roster_context["manager"].id,
        approval_status=ApprovalStatus.APPROVED,
        project_status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.flush()
    active_task = Task(
        project_id=project.id,
        assigned_to=roster_context["present_user"].id,
        created_by=roster_context["manager"].id,
        title="Active",
        status=TaskStatus.IN_PROGRESS,
    )
    done_task = Task(
        project_id=project.id,
        assigned_to=roster_context["present_user"].id,
        created_by=roster_context["manager"].id,
        title="Done",
        status=TaskStatus.COMPLETED,
    )
    db.add_all([active_task, done_task])
    db.flush()
    started = datetime.now(tz=pk_now().tzinfo)
    db.add(
        TimeLog(
            task_id=active_task.id,
            user_id=roster_context["present_user"].id,
            started_at=started,
            ended_at=started + timedelta(hours=2),
            duration_minutes=120,
            source_type=TimeLogSourceType.MANUAL,
            status=TimeLogStatus.COMPLETED,
        )
    )
    db.add(
        TimeLog(
            task_id=done_task.id,
            user_id=roster_context["present_user"].id,
            started_at=started,
            ended_at=started + timedelta(minutes=30),
            duration_minutes=30,
            source_type=TimeLogSourceType.MANUAL,
            status=TimeLogStatus.INVALID,
        )
    )
    db.commit()

    tasks = task_counts_by_user(db)
    hours = logged_hours_by_user(db)
    user_tasks = tasks[roster_context["present_user"].id]
    assert user_tasks["active"] == 1
    assert user_tasks["completed"] == 1
    assert hours[roster_context["present_user"].id] == 2.0


def test_users_analytics_admin_only(db, roster_context):
    employee = roster_context["present_user"]
    login = client.post(
        f"{API}/auth/login",
        json={"email": employee.email, "password": PASSWORD},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_users_analytics_excludes_sensitive_fields(db, admin_token):
    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "business_date" in body
    assert "timezone" in body
    for row in body["employee_roster"]:
        assert "password_hash" not in row
        assert "salary" not in row
        assert "date_of_birth" not in row


def test_user_management_overview_alias(db, admin_token):
    response = client.get(
        f"{API}/dashboard/admin/user-management-overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert "employee_roster" in response.json()


def test_admin_analytics_overview_returns_200(db, admin_token):
    response = client.get(
        f"{API}/dashboard/admin/analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "kpis" in body
    assert "attendance_trend" in body
    assert "task_statistics" in body
    assert "project_statistics" in body
    assert isinstance(body["attendance_trend"], list)
    assert isinstance(body["department_comparison"], list)
    assert "total_employees" in body["kpis"]


def test_admin_analytics_forbidden_for_employee(db, roster_context):
    employee = roster_context["present_user"]
    login = client.post(
        f"{API}/auth/login",
        json={"email": employee.email, "password": PASSWORD},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    response = client.get(
        f"{API}/dashboard/admin/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_users_analytics_response_shape(db, admin_token):
    response = client.get(
        f"{API}/dashboard/admin/users-analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "summary" in body
    assert "role_distribution" in body
    assert "department_distribution" in body
    assert "attendance_by_department" in body
    assert "employee_roster" in body
    assert isinstance(body["employee_roster"], list)
    assert isinstance(body["employee_activity_trend"], list)
    assert "business_date" in body
    assert "timezone" in body
    if body["employee_roster"]:
        row = body["employee_roster"][0]
        assert "full_name" in row
        assert "today_attendance" in row
        assert "department" in row
        assert row.get("department") is not None

