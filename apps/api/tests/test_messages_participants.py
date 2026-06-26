"""Conversation participant management tests."""
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.communication import Conversation, ConversationParticipant
from app.models.enums import ConversationParticipantRole, ConversationType, UserRole, UserStatus
from app.models.user import User

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
def participant_users(db):
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        full_name=f"Part Admin {suffix}",
        email=f"part-admin-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        department="Operations",
        designation="Admin",
    )
    manager = User(
        full_name=f"Part Manager {suffix}",
        email=f"part-manager-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Engineering",
        designation="Manager",
    )
    employee = User(
        full_name=f"Part Employee {suffix}",
        email=f"part-employee-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Engineering",
        designation="Developer",
    )
    candidate = User(
        full_name=f"Part Candidate {suffix}",
        email=f"part-candidate-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.INTERN,
        status=UserStatus.ACTIVE,
        department="AI Automation",
        designation="Intern",
    )
    inactive = User(
        full_name=f"Part Inactive {suffix}",
        email=f"part-inactive-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.INACTIVE,
        department="Engineering",
        designation="Former",
    )
    outsider = User(
        full_name=f"Part Outsider {suffix}",
        email=f"part-outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Sales",
        designation="Rep",
    )
    db.add_all([admin, manager, employee, candidate, inactive, outsider])
    db.flush()
    employee.manager_id = manager.id
    db.commit()
    return {
        "admin": admin,
        "manager": manager,
        "employee": employee,
        "candidate": candidate,
        "inactive": inactive,
        "outsider": outsider,
    }


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _seed_group(
    db,
    creator: User,
    members: list[User],
    *,
    conv_type: ConversationType = ConversationType.GROUP,
    title: str = "Test Group",
) -> Conversation:
    conv = Conversation(
        type=conv_type,
        title=title,
        created_by_id=creator.id,
    )
    db.add(conv)
    db.flush()
    participants = [
        ConversationParticipant(
            conversation_id=conv.id,
            user_id=creator.id,
            role=ConversationParticipantRole.OWNER,
        )
    ]
    for member in members:
        participants.append(
            ConversationParticipant(
                conversation_id=conv.id,
                user_id=member.id,
                role=ConversationParticipantRole.MEMBER,
            )
        )
    db.add_all(participants)
    db.commit()
    db.refresh(conv)
    return conv


def _seed_direct(db, user_a: User, user_b: User) -> Conversation:
    conv = Conversation(type=ConversationType.DIRECT, created_by_id=user_a.id)
    db.add(conv)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(conversation_id=conv.id, user_id=user_a.id),
            ConversationParticipant(conversation_id=conv.id, user_id=user_b.id),
        ]
    )
    db.commit()
    db.refresh(conv)
    return conv


@patch("app.api.routes.messages.RealtimeService.emit_conversation_participants_added")
@patch("app.api.routes.messages.RealtimeService.emit_conversation_updated")
def test_admin_can_add_user_to_group(mock_updated, mock_added, db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["employee"], [users["manager"]], title="Admin Group")
    token = _login(users["admin"].email)

    db.add(
        ConversationParticipant(
            conversation_id=conv.id,
            user_id=users["admin"].id,
            role=ConversationParticipantRole.MEMBER,
        )
    )
    db.commit()

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["added_count"] == 1
    assert body["participants"][0]["name"] == users["candidate"].full_name
    mock_added.assert_called_once()


@patch("app.api.routes.messages.RealtimeService.emit_conversation_participants_added")
@patch("app.api.routes.messages.RealtimeService.emit_conversation_updated")
def test_manager_can_add_user_to_group(mock_updated, mock_added, db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["employee"], [users["manager"]], title="Manager Group")
    token = _login(users["manager"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["added_count"] == 1


@patch("app.api.routes.messages.RealtimeService.emit_conversation_participants_added")
@patch("app.api.routes.messages.RealtimeService.emit_conversation_updated")
def test_admin_can_add_user_to_task_thread(mock_updated, mock_added, db, participant_users):
    users = participant_users
    conv = _seed_group(
        db,
        users["employee"],
        [users["manager"]],
        conv_type=ConversationType.TASK_THREAD,
        title="Task: Flexagon AI Copilot",
    )
    db.add(
        ConversationParticipant(
            conversation_id=conv.id,
            user_id=users["admin"].id,
            role=ConversationParticipantRole.MEMBER,
        )
    )
    db.commit()
    token = _login(users["admin"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["added_count"] == 1


def test_employee_member_cannot_add_user(db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["manager"], [users["employee"]], title="Restricted Group")
    token = _login(users["employee"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 403


def test_cannot_add_participants_to_direct_conversation(db, participant_users):
    users = participant_users
    conv = _seed_direct(db, users["employee"], users["manager"])
    token = _login(users["employee"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 400
    body = response.json()
    message = body.get("detail") or body.get("error", {}).get("message", "")
    assert "direct" in str(message).lower()


@patch("app.api.routes.messages.RealtimeService.emit_conversation_participants_added")
@patch("app.api.routes.messages.RealtimeService.emit_conversation_updated")
def test_duplicate_participant_is_idempotent(mock_updated, mock_added, db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["manager"], [users["employee"], users["candidate"]])
    token = _login(users["manager"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["added_count"] == 0
    mock_added.assert_not_called()


@patch("app.api.routes.messages.RealtimeService.emit_conversation_participants_added")
@patch("app.api.routes.messages.RealtimeService.emit_conversation_updated")
def test_inactive_user_is_skipped(mock_updated, mock_added, db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["manager"], [users["employee"]])
    token = _login(users["manager"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["inactive"].id)]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["added_count"] == 0


def test_available_members_excludes_existing_participants(db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["manager"], [users["employee"], users["candidate"]])
    token = _login(users["manager"].email)

    response = client.get(
        f"{API}/messages/conversations/{conv.id}/available-members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    returned_ids = {item["id"] for item in response.json()["users"]}
    assert str(users["employee"].id) not in returned_ids
    assert str(users["candidate"].id) not in returned_ids


def test_available_members_search_by_department(db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["admin"], [users["manager"]])
    token = _login(users["admin"].email)

    response = client.get(
        f"{API}/messages/conversations/{conv.id}/available-members",
        headers={"Authorization": f"Bearer {token}"},
        params={"search": "AI Automation"},
    )
    assert response.status_code == 200, response.text
    names = [item["name"] for item in response.json()["users"]]
    assert users["candidate"].full_name in names


def test_unauthorized_user_cannot_add_members(db, participant_users):
    users = participant_users
    conv = _seed_group(db, users["manager"], [users["employee"]])
    token = _login(users["outsider"].email)

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [str(users["candidate"].id)]},
    )
    assert response.status_code == 403
