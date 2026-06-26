"""Team performance report tests."""

from __future__ import annotations



import uuid

from datetime import date, datetime, time, timedelta, timezone



import pytest

from fastapi.testclient import TestClient



from app.core.config import settings

from app.core.security import hash_password

from app.main import app

from app.models.attendance_session import AttendanceSession

from app.models.daily_stats import DailyStats

from app.models.enums import (

    AttendanceSessionStatus,

    ProjectStatus,

    TaskStatus,

    TimeLogSourceType,

    TimeLogStatus,

    TimerSessionStatus,

    UserRole,

    UserStatus,

    WorkMode,

)

from app.models.eod_report import EODReport

from app.models.project import Project

from app.models.shift import Shift

from app.models.task import Task

from app.models.task_timer_session import TaskTimerSession

from app.models.time_log import TimeLog

from app.models.user import User

from app.services.report_metrics_service import get_user_report_window, live_hours_in_window, live_user_metrics

from app.services.report_service import ReportService

from app.services.shift_window_service import get_shift_window_for_business_date



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

def report_team(db):

    suffix = uuid.uuid4().hex[:8]

    manager = User(

        full_name=f"Report Manager {suffix}",

        email=f"report-mgr-{suffix}@test.com",

        password_hash=hash_password(PASSWORD),

        role=UserRole.MANAGER,

        status=UserStatus.ACTIVE,

        department="Engineering",

    )

    alice = User(

        full_name=f"Alice Employee {suffix}",

        email=f"alice-{suffix}@test.com",

        password_hash=hash_password(PASSWORD),

        role=UserRole.EMPLOYEE,

        status=UserStatus.ACTIVE,

        department="Engineering",

        designation="Developer",

    )

    bob = User(

        full_name=f"Bob Employee {suffix}",

        email=f"bob-{suffix}@test.com",

        password_hash=hash_password(PASSWORD),

        role=UserRole.EMPLOYEE,

        status=UserStatus.ACTIVE,

        department="Sales",

        designation="Analyst",

    )

    db.add_all([manager, alice, bob])

    db.commit()

    alice.manager_id = manager.id

    bob.manager_id = manager.id

    db.commit()

    return {"manager": manager, "alice": alice, "bob": bob}





def _login(email: str) -> str:

    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})

    assert response.status_code == 200, response.text

    return response.json()["access_token"]





def _seed_time_log(db, user_id: uuid.UUID, task_id: uuid.UUID, start: datetime, hours: float) -> None:

    end = start + timedelta(hours=hours)

    db.add(

        TimeLog(

            task_id=task_id,

            user_id=user_id,

            started_at=start,

            ended_at=end,

            duration_minutes=int(hours * 60),

            source_type=TimeLogSourceType.TIMER,

            status=TimeLogStatus.COMPLETED,

        )

    )

    db.commit()





def _create_task(db, manager: User, assignee: User) -> Task:

    project = Project(

        title=f"Proj {uuid.uuid4().hex[:6]}",

        description="test",

        owner_id=manager.id,

        manager_id=manager.id,

        project_status=ProjectStatus.ACTIVE,

    )

    db.add(project)

    db.flush()

    task = Task(

        project_id=project.id,

        assigned_to=assignee.id,

        created_by=manager.id,

        title="Work task",

        status=TaskStatus.IN_PROGRESS,

    )

    db.add(task)

    db.commit()

    db.refresh(task)

    return task





def test_daily_report_returns_selected_date_only(db, report_team):

    target = date.today() - timedelta(days=2)

    other = target - timedelta(days=1)

    manager = report_team["manager"]

    alice = report_team["alice"]

    task = _create_task(db, manager, alice)

    _seed_time_log(db, alice.id, task.id, datetime.combine(target, time(10, 0), tzinfo=timezone.utc), 5.5)

    _seed_time_log(db, alice.id, task.id, datetime.combine(other, time(10, 0), tzinfo=timezone.utc), 8.0)



    token = _login(manager.email)

    response = client.get(

        f"{API}/reports/team-performance",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "daily", "date": target.isoformat()},

    )

    assert response.status_code == 200, response.text

    alice_row = next(row for row in response.json()["rows"] if row["email"] == alice.email)

    assert alice_row["hours"] == 5.5





def test_weekly_report_aggregates_week(db, report_team):

    monday = date.today() - timedelta(days=date.today().weekday() + 7)

    tuesday = monday + timedelta(days=1)

    manager = report_team["manager"]

    alice = report_team["alice"]

    task = _create_task(db, manager, alice)

    _seed_time_log(db, alice.id, task.id, datetime.combine(monday, time(9, 0), tzinfo=timezone.utc), 4.0)

    _seed_time_log(db, alice.id, task.id, datetime.combine(tuesday, time(9, 0), tzinfo=timezone.utc), 3.5)



    token = _login(manager.email)

    response = client.get(

        f"{API}/reports/team-performance",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "weekly", "date": monday.isoformat()},

    )

    assert response.status_code == 200

    alice_row = next(row for row in response.json()["rows"] if row["email"] == alice.email)

    assert alice_row["hours"] == 7.5





def test_search_filters_team_members(db, report_team):

    token = _login(report_team["manager"].email)

    response = client.get(

        f"{API}/reports/team-performance",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "daily", "search": "Alice"},

    )

    assert response.status_code == 200

    rows = response.json()["rows"]

    assert len(rows) == 1

    assert rows[0]["name"].startswith("Alice")





def test_manager_sees_only_direct_reports(db, report_team):

    outsider = User(

        full_name="Outside User",

        email=f"outside-{uuid.uuid4().hex[:8]}@test.com",

        password_hash=hash_password(PASSWORD),

        role=UserRole.EMPLOYEE,

        status=UserStatus.ACTIVE,

    )

    db.add(outsider)

    db.commit()



    token = _login(report_team["manager"].email)

    response = client.get(

        f"{API}/reports/team-performance",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "daily"},

    )

    assert response.status_code == 200

    emails = {row["email"] for row in response.json()["rows"]}

    assert report_team["alice"].email in emails

    assert report_team["bob"].email in emails

    assert outsider.email not in emails





def test_custom_range_validation(db, report_team):

    token = _login(report_team["manager"].email)

    start = date.today() - timedelta(days=120)

    end = date.today()

    response = client.get(

        f"{API}/reports/team-performance",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "custom", "start_date": start.isoformat(), "end_date": end.isoformat()},

    )

    assert response.status_code == 422





def test_export_excludes_uuid_columns(db, report_team):

    token = _login(report_team["manager"].email)

    response = client.get(

        f"{API}/reports/team-performance/export",

        headers={"Authorization": f"Bearer {token}"},

        params={"period": "daily"},

    )

    assert response.status_code == 200

    text = response.text

    assert "Employee Name" in text

    assert "Tasks Worked On" in text

    assert "user_id" not in text.lower()





def test_resolve_period_monthly(db):

    service = ReportService(db)

    start, end = service.resolve_period_dates("monthly", target_date=date(2026, 6, 15))

    assert start == date(2026, 6, 1)

    assert end == date(2026, 6, 30)





def test_completed_tasks_counted_in_range(db, report_team):

    manager = report_team["manager"]

    alice = report_team["alice"]

    task = _create_task(db, manager, alice)

    task.status = TaskStatus.COMPLETED

    task.completed_at = datetime.now(timezone.utc)

    db.commit()



    service = ReportService(db)

    row = service.build_team_performance_row(alice, date.today(), date.today(), "daily")

    assert row.completed_tasks >= 1

    assert row.tasks_worked_on >= 0





def test_eod_status_for_daily_report(db, report_team):

    alice = report_team["alice"]

    db.add(

        EODReport(

            user_id=alice.id,

            report_date=date.today(),

            status="Pending Approval",

            total_hours=6,

            completed_tasks=2,

        )

    )

    db.commit()



    service = ReportService(db)

    row = service.build_team_performance_row(alice, date.today(), date.today(), "daily")

    assert row.eod_status == "submitted"





def test_active_timer_contributes_live_hours(db, report_team):

    manager = report_team["manager"]

    alice = report_team["alice"]

    task = _create_task(db, manager, alice)

    now = datetime.now(timezone.utc)

    db.add(

        TaskTimerSession(

            task_id=task.id,

            user_id=alice.id,

            status=TimerSessionStatus.RUNNING,

            started_at=now - timedelta(hours=2),

            last_resumed_at=now - timedelta(hours=1),

            accumulated_seconds=3600,

        )

    )

    db.commit()



    metrics = live_user_metrics(db, alice, date.today(), date.today())

    assert metrics["hours"] >= 1.0





def test_stale_daily_stats_does_not_override_live_hours(db, report_team):

    alice = report_team["alice"]

    today = date.today()

    db.add(

        DailyStats(

            user_id=alice.id,

            date=today,

            total_hours=99.0,

            is_late_login=True,

        )

    )

    db.commit()



    metrics = live_user_metrics(db, alice, today, today)

    assert metrics["hours"] < 99.0





def test_overnight_shift_window_spans_next_day(db, report_team):

    alice = report_team["alice"]

    shift = Shift(

        name="Night",

        start_time=time(17, 0),

        end_time=time(2, 0),

        timezone="Asia/Karachi",

        grace_period_minutes=15,

    )

    db.add(shift)

    db.commit()

    alice.shift_id = shift.id

    db.commit()



    business_date = date(2026, 6, 26)

    local_start, local_end = get_shift_window_for_business_date(shift, business_date)

    assert local_start.date() == business_date

    assert local_end.date() == business_date + timedelta(days=1)



    window_start, window_end = get_user_report_window(alice, business_date, db)
    in_window = datetime(2026, 6, 26, 20, 0, tzinfo=timezone.utc)
    manager = report_team["manager"]
    task = _create_task(db, manager, alice)
    _seed_time_log(db, alice.id, task.id, in_window, 1.5)
    hours = live_hours_in_window(db, alice.id, window_start, window_end)
    assert hours >= 1.0





def test_admin_sees_org_wide_reports(db, report_team):

    admin = User(

        full_name="Org Admin",

        email=f"org-admin-{uuid.uuid4().hex[:8]}@test.com",

        password_hash=hash_password(PASSWORD),

        role=UserRole.ADMIN,

        status=UserStatus.ACTIVE,

    )

    db.add(admin)

    db.commit()



    token = _login(admin.email)
    response = client.get(
        f"{API}/reports/team-performance",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": "daily", "search": report_team["alice"].full_name.split()[0]},
    )
    assert response.status_code == 200
    emails = {row["email"] for row in response.json()["rows"]}
    assert report_team["alice"].email in emails
    assert report_team["bob"].email not in emails


def test_admin_pagination_returns_page_metadata(db, report_team):
    admin = User(
        full_name="Org Admin",
        email=f"org-admin-page-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()

    token = _login(admin.email)
    response = client.get(
        f"{API}/reports/team-performance",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": "daily", "page": 1, "page_size": 1},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "rows" in payload
    assert "summary" in payload
    assert payload["total_count"] >= 2
    assert payload["page"] == 1
    assert payload["page_size"] == 1
    assert len(payload["rows"]) == 1


def test_weekly_date_parsing_uses_iso_format(db, report_team):
    token = _login(report_team["manager"].email)
    response = client.get(
        f"{API}/reports/team-performance",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": "weekly", "date": "2026-06-22"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["start_date"] == "2026-06-22"
    assert payload["end_date"] == "2026-06-28"


def test_empty_search_does_not_filter_all_rows(db, report_team):
    token = _login(report_team["manager"].email)
    response = client.get(
        f"{API}/reports/team-performance",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": "daily", "search": ""},
    )
    assert response.status_code == 200
    assert len(response.json()["rows"]) >= 2


def test_response_shape_includes_summary_and_rows(db, report_team):
    token = _login(report_team["manager"].email)
    response = client.get(
        f"{API}/reports/team-performance",
        headers={"Authorization": f"Bearer {token}"},
        params={"period": "daily"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["rows"], list)
    assert isinstance(payload["summary"], dict)
    assert "team_hours" in payload["summary"]
    assert "total_count" in payload

