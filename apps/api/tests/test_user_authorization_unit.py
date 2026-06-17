"""Unit tests for user authorization helpers (no database required)."""
from __future__ import annotations

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.services.user_authorization import (
    FORBIDDEN_FIELDS_MESSAGE,
    FORBIDDEN_USER_MESSAGE,
    UserAuthorizationService,
)


def _make_user(
    *,
    role: UserRole,
    user_id: uuid.UUID | None = None,
    manager_id: uuid.UUID | None = None,
) -> User:
    return User(
        id=user_id or uuid.uuid4(),
        full_name="Test User",
        email=f"{uuid.uuid4().hex[:8]}@test.com",
        password_hash="!",
        role=role,
        status=UserStatus.ACTIVE,
        manager_id=manager_id,
    )


@pytest.fixture
def auth_service():
    return UserAuthorizationService(MagicMock())


class TestCanViewUser:
    def test_intern_can_view_self(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        assert auth_service.can_view_user(intern, intern) is True

    def test_intern_cannot_view_other(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        other = _make_user(role=UserRole.EMPLOYEE)
        assert auth_service.can_view_user(intern, other) is False

    def test_manager_can_view_direct_report(self, auth_service):
        manager = _make_user(role=UserRole.MANAGER)
        report = _make_user(role=UserRole.EMPLOYEE, manager_id=manager.id)
        assert auth_service.can_view_user(manager, report) is True

    def test_manager_cannot_view_outside_team(self, auth_service):
        manager = _make_user(role=UserRole.MANAGER)
        outside = _make_user(role=UserRole.EMPLOYEE)
        assert auth_service.can_view_user(manager, outside) is False


class TestCanUpdateUser:
    def test_intern_cannot_update_other_even_with_empty_body(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        other = _make_user(role=UserRole.EMPLOYEE)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(intern, other, set())
        assert exc.value.status_code == 403
        assert exc.value.detail == FORBIDDEN_USER_MESSAGE

    def test_intern_can_update_self_empty_body(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        auth_service.assert_can_update_user(intern, intern, set())

    def test_intern_can_update_self_phone(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        auth_service.assert_can_update_user(intern, intern, {"phone"})

    def test_intern_cannot_update_self_status(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(intern, intern, {"status"})
        assert exc.value.status_code == 403
        assert exc.value.detail == FORBIDDEN_FIELDS_MESSAGE

    def test_intern_cannot_update_other_full_name(self, auth_service):
        intern = _make_user(role=UserRole.INTERN)
        other = _make_user(role=UserRole.EMPLOYEE)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(intern, other, {"full_name"})
        assert exc.value.status_code == 403
        assert exc.value.detail == FORBIDDEN_USER_MESSAGE

    def test_manager_cannot_update_outside_team(self, auth_service):
        manager = _make_user(role=UserRole.MANAGER)
        outside = _make_user(role=UserRole.EMPLOYEE)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(manager, outside, {"phone"})
        assert exc.value.status_code == 403

    def test_manager_cannot_update_team_member(self, auth_service):
        manager = _make_user(role=UserRole.MANAGER)
        report = _make_user(role=UserRole.EMPLOYEE, manager_id=manager.id)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(manager, report, {"designation"})
        assert exc.value.status_code == 403

    def test_admin_can_update_sensitive_fields(self, auth_service):
        admin = _make_user(role=UserRole.ADMIN)
        target = _make_user(role=UserRole.INTERN)
        auth_service.assert_can_update_user(
            admin,
            target,
            {"status", "manager_id", "department_id", "role"},
        )

    def test_hr_cannot_update_role_via_patch_whitelist(self, auth_service):
        hr = _make_user(role=UserRole.HR_OPERATIONS)
        target = _make_user(role=UserRole.INTERN)
        with pytest.raises(HTTPException) as exc:
            auth_service.assert_can_update_user(hr, target, {"role"})
        assert exc.value.status_code == 403
        assert exc.value.detail == FORBIDDEN_FIELDS_MESSAGE

    def test_hr_can_update_status(self, auth_service):
        hr = _make_user(role=UserRole.HR_OPERATIONS)
        target = _make_user(role=UserRole.INTERN)
        auth_service.assert_can_update_user(hr, target, {"status"})
