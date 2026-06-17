"""Attendance integrity tests — double check-in and stale session auto-close."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceSessionStatus, UserRole, UserStatus, WorkMode
from app.models.user import User

client = TestClient(app)
API = settings.api_v1_prefix


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def employee_auth(db):
    suffix = uuid.uuid4().hex[:8]
    password = "TestPass123!"
    user = User(
        full_name=f"Attendance Employee {suffix}",
        email=f"attendance-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Engineering",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    login = client.post(f"{API}/auth/login", json={"email": user.email, "password": password})
    assert login.status_code == 200, login.text
    return user, login.json()["access_token"]


def test_check_in_then_second_check_in_returns_409(employee_auth):
    user, token = employee_auth
    headers = {"Authorization": f"Bearer {token}"}
    first = client.post(f"{API}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
    assert first.status_code == 200, first.text
    second = client.post(f"{API}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
    assert second.status_code == 409
    assert "active attendance session" in second.json()["error"]["message"].lower()


def test_stale_session_auto_closes_before_active_lookup(db, employee_auth, monkeypatch):
    user, token = employee_auth
    monkeypatch.setattr(settings, "attendance_max_active_hours", 16)
    monkeypatch.setattr(settings, "attendance_auto_close_grace_minutes", 60)
    monkeypatch.setattr(
        "app.services.realtime_service.RealtimeService.emit_notification_created",
        lambda *_args, **_kwargs: None,
    )

    stale = AttendanceSession(
        user_id=user.id,
        check_in_at=datetime.now(timezone.utc) - timedelta(hours=20),
        work_mode=WorkMode.OFFICE,
        session_status=AttendanceSessionStatus.ACTIVE,
    )
    db.add(stale)
    db.commit()

    headers = {"Authorization": f"Bearer {token}"}
    active = client.get(f"{API}/attendance/active", headers=headers)
    assert active.status_code == 200
    assert active.json() is None

    db.refresh(stale)
    assert stale.session_status == AttendanceSessionStatus.COMPLETED
    assert stale.check_out_at is not None


def test_only_one_active_session_after_duplicate_legacy_rows(db, employee_auth):
    user, token = employee_auth
    now = datetime.now(timezone.utc)
    db.add(
        AttendanceSession(
            user_id=user.id,
            check_in_at=now - timedelta(hours=1),
            work_mode=WorkMode.OFFICE,
            session_status=AttendanceSessionStatus.ACTIVE,
        )
    )
    db.commit()

    with pytest.raises(IntegrityError):
        db.add(
            AttendanceSession(
                user_id=user.id,
                check_in_at=now - timedelta(hours=2),
                work_mode=WorkMode.OFFICE,
                session_status=AttendanceSessionStatus.ACTIVE,
            )
        )
        db.commit()
    db.rollback()

    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(f"{API}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
    assert response.status_code == 409

    active_count = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.user_id == user.id,
            AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE,
        )
        .count()
    )
    assert active_count == 1
