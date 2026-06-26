"""Message delivery status and receipt serialization tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.communication import Conversation, ConversationParticipant, Message, MessageReceipt
from app.models.enums import ConversationType, UserRole, UserStatus
from app.models.user import User
from app.services.message_receipt_service import compute_delivery_status, serialize_message

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
def dm_users(db):
    suffix = uuid.uuid4().hex[:8]
    sender = User(
        full_name=f"Tick Sender {suffix}",
        email=f"tick-sender-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    recipient = User(
        full_name=f"Tick Recipient {suffix}",
        email=f"tick-recipient-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([sender, recipient])
    db.commit()
    return {"sender": sender, "recipient": recipient}


def _seed_dm(db, users) -> tuple[Conversation, Message]:
    conv = Conversation(
        type=ConversationType.DIRECT,
        title=None,
        created_by_id=users["sender"].id,
    )
    db.add(conv)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(conversation_id=conv.id, user_id=users["sender"].id),
            ConversationParticipant(conversation_id=conv.id, user_id=users["recipient"].id),
        ]
    )
    now = datetime.now(timezone.utc)
    msg = Message(
        conversation_id=conv.id,
        sender_id=users["sender"].id,
        body="Hello ticks",
        created_at=now,
        updated_at=now,
    )
    db.add(msg)
    db.flush()
    db.add(
        MessageReceipt(
            message_id=msg.id,
            user_id=users["recipient"].id,
            created_at=now,
        )
    )
    db.commit()
    db.refresh(msg)
    return conv, msg


def test_sent_only_status(db, dm_users):
    _, msg = _seed_dm(db, dm_users)
    status, seen, delivered, total, delivered_at, seen_at = compute_delivery_status(
        db, msg, dm_users["sender"].id
    )
    assert status == "sent"
    assert seen == 0
    assert delivered == 0
    assert total == 1
    assert delivered_at is None
    assert seen_at is None


def test_delivered_status(db, dm_users):
    _, msg = _seed_dm(db, dm_users)
    now = datetime.now(timezone.utc)
    receipt = db.query(MessageReceipt).filter_by(message_id=msg.id).one()
    receipt.delivered_at = now
    db.commit()

    status, seen, delivered, total, delivered_at, seen_at = compute_delivery_status(
        db, msg, dm_users["sender"].id
    )
    assert status == "delivered"
    assert delivered == 1
    assert seen == 0
    assert delivered_at == now
    assert seen_at is None


def test_seen_status(db, dm_users):
    _, msg = _seed_dm(db, dm_users)
    now = datetime.now(timezone.utc)
    receipt = db.query(MessageReceipt).filter_by(message_id=msg.id).one()
    receipt.delivered_at = now
    receipt.seen_at = now
    db.commit()

    status, seen, delivered, total, delivered_at, seen_at = compute_delivery_status(
        db, msg, dm_users["sender"].id
    )
    assert status == "seen"
    assert seen == 1
    assert delivered == 1
    assert seen_at == now


def test_serialize_message_includes_delivery_fields(db, dm_users):
    _, msg = _seed_dm(db, dm_users)
    now = datetime.now(timezone.utc)
    receipt = db.query(MessageReceipt).filter_by(message_id=msg.id).one()
    receipt.delivered_at = now
    receipt.seen_at = now
    db.commit()

    payload = serialize_message(db, msg, dm_users["sender"].id)
    assert payload.delivery_status == "seen"
    assert payload.sent_at == msg.created_at
    assert payload.delivered_at == now
    assert payload.seen_at == now


def test_incoming_message_has_no_delivery_fields(db, dm_users):
    _, msg = _seed_dm(db, dm_users)
    payload = serialize_message(db, msg, dm_users["recipient"].id)
    assert payload.delivery_status is None
    assert payload.delivered_at is None
    assert payload.seen_at is None


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_mark_messages_delivered_endpoint(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/delivered",
        headers=headers,
        json={"message_ids": [str(msg.id)]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["marked_count"] == 1
    assert str(msg.id) in body["message_ids"]

    payload = serialize_message(db, msg, dm_users["sender"].id)
    assert payload.delivery_status == "delivered"
    assert payload.delivered_at is not None


def test_sender_cannot_mark_own_message_delivered(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["sender"].email)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        f"{API}/messages/conversations/{conv.id}/delivered",
        headers=headers,
        json={"message_ids": [str(msg.id)]},
    )
    assert response.status_code == 200
    assert response.json()["marked_count"] == 0

    payload = serialize_message(db, msg, dm_users["sender"].id)
    assert payload.delivery_status == "sent"


def test_mark_messages_delivered_is_idempotent(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API}/messages/conversations/{conv.id}/delivered"
    payload = {"message_ids": [str(msg.id)]}

    first = client.post(url, headers=headers, json=payload)
    second = client.post(url, headers=headers, json=payload)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["marked_count"] == 1
    assert second.json()["marked_count"] == 0


def test_mark_conversation_seen_marks_incoming_only(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    now = datetime.now(timezone.utc)
    own_msg = Message(
        conversation_id=conv.id,
        sender_id=dm_users["recipient"].id,
        body="Reply later",
        created_at=now,
        updated_at=now,
    )
    db.add(own_msg)
    db.flush()
    db.add(MessageReceipt(message_id=own_msg.id, user_id=dm_users["sender"].id, created_at=now))
    db.commit()

    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(f"{API}/messages/conversations/{conv.id}/seen", headers=headers, json={})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["seen_count"] == 1
    assert str(msg.id) in body["message_ids"]
    assert str(own_msg.id) not in body["message_ids"]

    sender_view = serialize_message(db, msg, dm_users["sender"].id)
    assert sender_view.delivery_status == "seen"
    assert sender_view.seen_at is not None
    assert sender_view.delivered_at is not None


def test_sender_cannot_mark_own_messages_seen(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["sender"].email)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(f"{API}/messages/conversations/{conv.id}/seen", headers=headers, json={})
    assert response.status_code == 200
    assert response.json()["seen_count"] == 0
    payload = serialize_message(db, msg, dm_users["sender"].id)
    assert payload.delivery_status == "sent"


def test_mark_conversation_seen_is_idempotent(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API}/messages/conversations/{conv.id}/seen"

    first = client.post(url, headers=headers, json={})
    second = client.post(url, headers=headers, json={})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["seen_count"] == 1
    assert second.json()["seen_count"] == 0


def test_mark_conversation_seen_sets_delivered_if_missing(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(f"{API}/messages/conversations/{conv.id}/seen", headers=headers, json={})
    assert response.status_code == 200
    assert response.json()["seen_count"] == 1

    receipt = db.query(MessageReceipt).filter_by(message_id=msg.id).one()
    assert receipt.delivered_at is not None
    assert receipt.seen_at is not None


def test_mark_conversation_seen_rejects_non_participant(db, dm_users):
    conv, _ = _seed_dm(db, dm_users)
    suffix = uuid.uuid4().hex[:8]
    outsider = User(
        full_name=f"Outsider {suffix}",
        email=f"outsider-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(outsider)
    db.commit()

    token = _login(outsider.email)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(f"{API}/messages/conversations/{conv.id}/seen", headers=headers, json={})
    assert response.status_code == 403


def test_mark_conversation_seen_with_message_ids(db, dm_users):
    conv, msg = _seed_dm(db, dm_users)
    token = _login(dm_users["recipient"].email)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        f"{API}/messages/conversations/{conv.id}/seen",
        headers=headers,
        json={"message_ids": [str(msg.id)]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["seen_count"] == 1
    assert body["message_ids"] == [str(msg.id)]
