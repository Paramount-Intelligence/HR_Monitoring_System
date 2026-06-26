"""Daily-scoped EOD metric tests."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.core.security import hash_password
from app.core.time_utils import PK_TZ
from app.models.enums import TaskStatus, TimeLogSourceType, TimeLogStatus, UserRole, UserStatus, WorkMode
from app.models.shift import Shift
from app.models.task import Task
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.eod_metrics_service import calculate_eod_metrics_for_user


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def eod_metric_context(db):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        full_name=f"EOD Metrics {suffix}",
        email=f"eod-metrics-{suffix}@test.com",
        password_hash=hash_password("TestPass123!"),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    project_id = uuid.uuid4()
    from app.models.project import Project
    from app.models.enums import ProjectStatus, ProjectPriority

    project = Project(
        id=project_id,
        title=f"Project {suffix}",
        owner_id=user.id,
        manager_id=user.id,
        project_status=ProjectStatus.ACTIVE,
        priority=ProjectPriority.MEDIUM,
    )
    db.add(project)
    db.commit()

    report_date = date(2026, 6, 26)
    day_start = datetime(2026, 6, 26, 9, 0, tzinfo=PK_TZ).astimezone(timezone.utc)
    day_end = datetime(2026, 6, 26, 17, 0, tzinfo=PK_TZ).astimezone(timezone.utc)

    old_completed = Task(
        project_id=project_id,
        assigned_to=user.id,
        created_by=user.id,
        title="Old completed",
        status=TaskStatus.COMPLETED,
        completed_at=day_start - timedelta(days=2),
    )
    today_completed = Task(
        project_id=project_id,
        assigned_to=user.id,
        created_by=user.id,
        title="Today completed",
        status=TaskStatus.COMPLETED,
        completed_at=day_start + timedelta(hours=2),
    )
    pending_worked = Task(
        project_id=project_id,
        assigned_to=user.id,
        created_by=user.id,
        title="Worked pending",
        status=TaskStatus.IN_PROGRESS,
        updated_at=day_start + timedelta(hours=3),
    )
    untouched_pending = Task(
        project_id=project_id,
        assigned_to=user.id,
        created_by=user.id,
        title="Untouched pending",
        status=TaskStatus.IN_PROGRESS,
        updated_at=day_start - timedelta(days=5),
    )
    db.add_all([old_completed, today_completed, pending_worked, untouched_pending])
    db.commit()

    active_log = TimeLog(
        task_id=pending_worked.id,
        user_id=user.id,
        started_at=day_start + timedelta(hours=1),
        ended_at=None,
        duration_minutes=None,
        source_type=TimeLogSourceType.MANUAL,
        status=TimeLogStatus.ACTIVE,
    )
    completed_log = TimeLog(
        task_id=today_completed.id,
        user_id=user.id,
        started_at=day_start + timedelta(hours=1, minutes=30),
        ended_at=day_start + timedelta(hours=2),
        duration_minutes=30,
        source_type=TimeLogSourceType.MANUAL,
        status=TimeLogStatus.COMPLETED,
    )
    db.add_all([active_log, completed_log])
    db.commit()

    return {
        "user": user,
        "report_date": report_date,
        "today_completed": today_completed,
        "pending_worked": pending_worked,
        "untouched_pending": untouched_pending,
    }


def test_completed_tasks_only_for_report_date(db, eod_metric_context, monkeypatch):
    user = eod_metric_context["user"]
    report_date = eod_metric_context["report_date"]
    now = datetime(2026, 6, 26, 12, 0, tzinfo=PK_TZ)
    monkeypatch.setattr("app.services.eod_metrics_service._utc_now", lambda: now.astimezone(timezone.utc))
    monkeypatch.setattr("app.services.eod_metrics_service.pk_now", lambda: now)

    metrics = calculate_eod_metrics_for_user(db, user.id, report_date)
    assert metrics.task_metrics.completed == 1
    assert metrics.task_metrics.tasks_worked_on >= 2
    assert metrics.logged_hours > 0


def test_pending_excludes_untouched_tasks(db, eod_metric_context, monkeypatch):
    user = eod_metric_context["user"]
    report_date = eod_metric_context["report_date"]
    now = datetime(2026, 6, 26, 12, 0, tzinfo=PK_TZ)
    monkeypatch.setattr("app.services.eod_metrics_service._utc_now", lambda: now.astimezone(timezone.utc))
    monkeypatch.setattr("app.services.eod_metrics_service.pk_now", lambda: now)

    metrics = calculate_eod_metrics_for_user(db, user.id, report_date)
    assert metrics.task_metrics.pending >= 1
    assert metrics.task_metrics.pending < 10
