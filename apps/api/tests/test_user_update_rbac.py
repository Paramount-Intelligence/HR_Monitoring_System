"""RBAC tests for user mutation endpoints (object- and field-level authorization)."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole, UserStatus
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


def _login(email: str, password: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def rbac_users(db):
    """Create an isolated manager, intern, team member, and outside employee."""
    suffix = uuid.uuid4().hex[:8]
    password = "TestPass123!"

    manager = User(
        full_name=f"RBAC Manager {suffix}",
        email=f"rbac-manager-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Engineering",
    )
    other_manager = User(
        full_name=f"RBAC Other Manager {suffix}",
        email=f"rbac-other-manager-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Product",
    )
    db.add_all([manager, other_manager])
    db.flush()

    intern = User(
        full_name=f"RBAC Intern {suffix}",
        email=f"rbac-intern-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
        department="Engineering",
        manager_id=manager.id,
        phone="+10000000001",
        designation="Intern",
    )
    team_member = User(
        full_name=f"RBAC Team Member {suffix}",
        email=f"rbac-team-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Engineering",
        manager_id=manager.id,
        phone="+10000000002",
        designation="Engineer",
    )
    outside_employee = User(
        full_name=f"RBAC Outside Employee {suffix}",
        email=f"rbac-outside-{suffix}@test.com",
        password_hash=hash_password(password),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Product",
        manager_id=other_manager.id,
        phone="+10000000003",
        designation="Analyst",
    )
    db.add_all([intern, team_member, outside_employee])
    db.commit()
    for user in (manager, other_manager, intern, team_member, outside_employee):
        db.refresh(user)

    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert admin is not None

    return {
        "admin": admin,
        "admin_token": _login(admin.email, "Admin1234!"),
        "manager": manager,
        "manager_token": _login(manager.email, password),
        "intern": intern,
        "intern_token": _login(intern.email, password),
        "team_member": team_member,
        "outside_employee": outside_employee,
        "password": password,
    }


def _patch(token: str, user_id: uuid.UUID, payload: dict):
    return client.patch(
        f"{API}/users/{user_id}",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def _snapshot_value(user: User, field: str):
    value = getattr(user, field)
    if isinstance(value, (UserRole, UserStatus)):
        return value.value
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _assert_forbidden_no_leak(response, target: User, db=None):
    assert response.status_code == 403
    body = response.json()
    assert body.get("error", {}).get("code") == "PERMISSION_ERROR"
    body_text = str(body)
    assert target.email not in body_text
    assert target.full_name not in body_text
    if target.phone:
        assert target.phone not in body_text
    assert "UserRead" not in body_text
    assert "access_token" not in body_text


def _assert_no_field_change(db, user: User, field: str, before):
    db.refresh(user)
    after = getattr(user, field)
    if isinstance(before, (UserRole, UserStatus)):
        before = before.value
    if isinstance(before, uuid.UUID):
        before = str(before)
    if isinstance(after, (UserRole, UserStatus)):
        after = after.value
    if isinstance(after, uuid.UUID):
        after = str(after)
    assert after == before


class TestInternUserMutations:
    def test_intern_cannot_patch_other_user_empty_body(self, rbac_users):
        other = rbac_users["outside_employee"]
        response = _patch(rbac_users["intern_token"], other.id, {})
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "PERMISSION_ERROR"

    @pytest.mark.parametrize(
        "field",
        ["full_name", "phone", "designation", "manager_id", "status"],
    )
    def test_intern_cannot_patch_other_user_fields(self, db, rbac_users, field):
        other = rbac_users["outside_employee"]
        original = getattr(other, field)
        if field == "manager_id" and original:
            payload = {field: str(original)}
        elif field == "status":
            payload = {field: other.status.value}
        else:
            payload = {field: original}
        response = _patch(rbac_users["intern_token"], other.id, payload)
        assert response.status_code == 403
        db.refresh(other)

    def test_intern_cannot_patch_other_user_department_id(self, rbac_users):
        other = rbac_users["outside_employee"]
        payload = {"department_id": str(other.department_id) if other.department_id else None}
        response = _patch(rbac_users["intern_token"], other.id, payload)
        assert response.status_code == 403

    def test_intern_cannot_patch_other_user_shift_id(self, rbac_users):
        other = rbac_users["outside_employee"]
        payload = {"shift_id": str(other.shift_id) if other.shift_id else None}
        response = _patch(rbac_users["intern_token"], other.id, payload)
        assert response.status_code == 403

    def test_intern_cannot_update_own_role(self, db, rbac_users):
        intern = rbac_users["intern"]
        response = _patch(rbac_users["intern_token"], intern.id, {"role": "admin"})
        assert response.status_code == 403
        db.refresh(intern)
        assert intern.role == UserRole.INTERN

    def test_intern_cannot_update_own_status(self, db, rbac_users):
        intern = rbac_users["intern"]
        response = _patch(rbac_users["intern_token"], intern.id, {"status": "inactive"})
        assert response.status_code == 403
        db.refresh(intern)
        assert intern.status == UserStatus.ACTIVE

    def test_intern_cannot_update_own_manager_id(self, db, rbac_users):
        intern = rbac_users["intern"]
        manager_id = intern.manager_id
        response = _patch(
            rbac_users["intern_token"],
            intern.id,
            {"manager_id": str(manager_id) if manager_id else None},
        )
        assert response.status_code == 403
        _assert_no_field_change(db, intern, "manager_id", manager_id)

    def test_intern_cannot_update_own_designation(self, db, rbac_users):
        intern = rbac_users["intern"]
        before = intern.designation
        response = _patch(
            rbac_users["intern_token"],
            intern.id,
            {"designation": before},
        )
        assert response.status_code == 403
        _assert_no_field_change(db, intern, "designation", before)

    def test_intern_unauthorized_patch_does_not_leak_target(self, rbac_users):
        other = rbac_users["outside_employee"]
        response = _patch(
            rbac_users["intern_token"],
            other.id,
            {"full_name": other.full_name},
        )
        _assert_forbidden_no_leak(response, other)

    def test_intern_unauthorized_patch_no_db_change(self, db, rbac_users):
        other = rbac_users["outside_employee"]
        before = {
            "full_name": other.full_name,
            "phone": other.phone,
            "designation": other.designation,
            "status": other.status,
        }
        response = _patch(
            rbac_users["intern_token"],
            other.id,
            {
                "full_name": other.full_name,
                "phone": other.phone,
                "designation": other.designation,
                "status": other.status.value,
            },
        )
        assert response.status_code == 403
        for field, value in before.items():
            _assert_no_field_change(db, other, field, value)

    def test_intern_can_update_own_phone(self, db, rbac_users):
        intern = rbac_users["intern"]
        new_phone = "+19998887777"
        response = _patch(rbac_users["intern_token"], intern.id, {"phone": new_phone})
        assert response.status_code == 200
        db.refresh(intern)
        assert intern.phone == new_phone

    def test_intern_get_other_user_still_forbidden(self, rbac_users):
        other = rbac_users["outside_employee"]
        response = client.get(
            f"{API}/users/{other.id}",
            headers={"Authorization": f"Bearer {rbac_users['intern_token']}"},
        )
        assert response.status_code == 403


class TestManagerUserMutations:
    def test_manager_cannot_patch_outside_team_user_empty(self, rbac_users):
        outside = rbac_users["outside_employee"]
        response = _patch(rbac_users["manager_token"], outside.id, {})
        assert response.status_code == 403

    def test_manager_cannot_patch_outside_team_user_noop_values(self, db, rbac_users):
        outside = rbac_users["outside_employee"]
        response = _patch(
            rbac_users["manager_token"],
            outside.id,
            {
                "full_name": outside.full_name,
                "phone": outside.phone,
                "designation": outside.designation,
            },
        )
        assert response.status_code == 403
        db.refresh(outside)

    def test_manager_cannot_patch_team_member(self, db, rbac_users):
        member = rbac_users["team_member"]
        response = _patch(
            rbac_users["manager_token"],
            member.id,
            {"designation": member.designation},
        )
        assert response.status_code == 403
        db.refresh(member)

    def test_manager_cannot_patch_outside_team_status(self, rbac_users):
        outside = rbac_users["outside_employee"]
        response = _patch(
            rbac_users["manager_token"],
            outside.id,
            {"status": outside.status.value},
        )
        assert response.status_code == 403

    @pytest.mark.parametrize("field", ["full_name", "phone", "designation", "manager_id"])
    def test_manager_cannot_patch_outside_team_field(self, db, rbac_users, field):
        outside = rbac_users["outside_employee"]
        original = getattr(outside, field)
        if field == "manager_id" and original:
            payload = {field: str(original)}
        else:
            payload = {field: original}
        response = _patch(rbac_users["manager_token"], outside.id, payload)
        assert response.status_code == 403
        _assert_no_field_change(db, outside, field, original)

    def test_manager_get_outside_team_forbidden(self, rbac_users):
        outside = rbac_users["outside_employee"]
        response = client.get(
            f"{API}/users/{outside.id}",
            headers={"Authorization": f"Bearer {rbac_users['manager_token']}"},
        )
        assert response.status_code == 403

    def test_manager_list_users_team_scoped(self, rbac_users):
        manager = rbac_users["manager"]
        response = client.get(
            f"{API}/users",
            headers={"Authorization": f"Bearer {rbac_users['manager_token']}"},
        )
        assert response.status_code == 200
        users = response.json()
        ids = {item["id"] for item in users}
        assert str(manager.id) in ids
        assert str(rbac_users["team_member"].id) in ids
        assert str(rbac_users["outside_employee"].id) not in ids

    def test_manager_unauthorized_patch_does_not_leak_target(self, rbac_users):
        outside = rbac_users["outside_employee"]
        response = _patch(rbac_users["manager_token"], outside.id, {})
        _assert_forbidden_no_leak(response, outside)

    def test_manager_can_patch_own_phone(self, db, rbac_users):
        manager = rbac_users["manager"]
        response = _patch(rbac_users["manager_token"], manager.id, {"phone": "+15550101010"})
        assert response.status_code == 200
        db.refresh(manager)
        assert manager.phone == "+15550101010"


class TestAdminUserMutations:
    def test_admin_can_patch_allowed_fields(self, db, rbac_users):
        target = rbac_users["outside_employee"]
        new_designation = f"{target.designation}-updated"
        response = _patch(
            rbac_users["admin_token"],
            target.id,
            {"designation": new_designation},
        )
        assert response.status_code == 200
        db.refresh(target)
        assert target.designation == new_designation

    def test_admin_patch_empty_body_allowed(self, rbac_users):
        target = rbac_users["outside_employee"]
        response = _patch(rbac_users["admin_token"], target.id, {})
        assert response.status_code == 200

    def test_admin_can_patch_status(self, db, rbac_users):
        target = rbac_users["outside_employee"]
        before = target.status
        response = _patch(
            rbac_users["admin_token"],
            target.id,
            {"status": before.value},
        )
        assert response.status_code == 200
        db.refresh(target)
        assert target.status == before


class TestAuditLogging:
    def test_denied_cross_user_patch_is_audit_logged(self, db, rbac_users):
        from app.models.audit_log import AuditLog

        other = rbac_users["outside_employee"]
        before_count = (
            db.query(AuditLog)
            .filter(
                AuditLog.entity_id == other.id,
                AuditLog.action_type == "user.update_denied",
            )
            .count()
        )
        response = _patch(rbac_users["intern_token"], other.id, {"status": "active"})
        assert response.status_code == 403
        after_count = (
            db.query(AuditLog)
            .filter(
                AuditLog.entity_id == other.id,
                AuditLog.action_type == "user.update_denied",
            )
            .count()
        )
        assert after_count == before_count + 1

    def test_successful_admin_patch_is_audit_logged(self, db, rbac_users):
        from app.models.audit_log import AuditLog

        target = rbac_users["outside_employee"]
        before_count = (
            db.query(AuditLog)
            .filter(AuditLog.entity_id == target.id, AuditLog.action_type == "USER_UPDATED")
            .count()
        )
        response = _patch(
            rbac_users["admin_token"],
            target.id,
            {"designation": f"{target.designation}-audit-check"},
        )
        assert response.status_code == 200
        after_count = (
            db.query(AuditLog)
            .filter(AuditLog.entity_id == target.id, AuditLog.action_type == "USER_UPDATED")
            .count()
        )
        assert after_count == before_count + 1


class TestRegressionReadScoping:
    def test_intern_user_list_scoped_to_self(self, rbac_users):
        response = client.get(
            f"{API}/users",
            headers={"Authorization": f"Bearer {rbac_users['intern_token']}"},
        )
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 1
        assert users[0]["id"] == str(rbac_users["intern"].id)

    def test_role_escalation_still_blocked_for_intern(self, db, rbac_users):
        intern = rbac_users["intern"]
        response = _patch(rbac_users["intern_token"], intern.id, {"role": UserRole.ADMIN.value})
        assert response.status_code == 403
        db.refresh(intern)
        assert intern.role == UserRole.INTERN

    def test_intern_cannot_access_audit_logs(self, rbac_users):
        response = client.get(
            f"{API}/audit-logs",
            headers={"Authorization": f"Bearer {rbac_users['intern_token']}"},
        )
        assert response.status_code == 403
