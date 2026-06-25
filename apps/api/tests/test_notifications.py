"""Notification preferences and delivery tests."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.communication import Conversation, ConversationParticipant
from app.models.enums import ConversationType, NotificationType, UserRole, UserStatus
from app.models.notifications import Notification
from app.models.user import User
from app.models.user_notification_preferences import UserNotificationPreferences
from app.services.notification_preference_service import get_or_create_preferences
from app.services.notification_service import (
    create_message_notifications,
    create_notification,
    display_message_for_user,
    generic_body_for,
)

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


def _login(email: str) -> str:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def users(db):
    suffix = uuid.uuid4().hex[:8]
    user_a = User(
        full_name=f"Notif User A {suffix}",
        email=f"notif-a-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    user_b = User(
        full_name=f"Notif User B {suffix}",
        email=f"notif-b-{suffix}@test.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    return {"a": user_a, "b": user_b}


def test_user_can_get_own_notification_preferences(users):
    token = _login(users["a"].email)
    response = client.get(
        f"{API}/notifications/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["banner_mode"] == "always"
    assert data["show_previews"] is True
    assert "user_id" not in data
    assert "id" not in data


def test_user_can_update_own_notification_preferences(users):
    token = _login(users["a"].email)
    response = client.patch(
        f"{API}/notifications/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"show_previews": False, "message_notifications_enabled": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["show_previews"] is False
    assert data["message_notifications_enabled"] is False


def test_invalid_preference_enum_rejected(users):
    token = _login(users["a"].email)
    response = client.patch(
        f"{API}/notifications/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"banner_mode": "sometimes"},
    )
    assert response.status_code == 422


def test_show_previews_false_masks_display_body(users, db):
    prefs = get_or_create_preferences(db, users["b"].id)
    prefs.show_previews = False
    db.commit()
    body = display_message_for_user(
        prefs,
        NotificationType.MESSAGE,
        "Secret message body",
        related_entity_type="conversation",
        conversation_type=ConversationType.DIRECT,
    )
    assert body == generic_body_for(NotificationType.MESSAGE, conversation_type=ConversationType.DIRECT)
    assert "Secret" not in body


def test_message_notification_created_for_recipient_not_sender(users, db):
    conv = Conversation(type=ConversationType.DIRECT, title=None, created_by_id=users["a"].id)
    db.add(conv)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(conversation_id=conv.id, user_id=users["a"].id),
            ConversationParticipant(conversation_id=conv.id, user_id=users["b"].id),
        ]
    )
    db.commit()

    created = create_message_notifications(
        db,
        participants=[users["a"].id, users["b"].id],
        sender_id=users["a"].id,
        sender_name=users["a"].full_name,
        conversation_id=conv.id,
        conversation_title=None,
        conversation_type=ConversationType.DIRECT,
        body_preview="Hello there",
        mentioned_user_ids=[],
    )
    db.commit()

    assert len(created) == 1
    assert created[0].user_id == users["b"].id

    sender_notifs = (
        db.query(Notification)
        .filter(Notification.user_id == users["a"].id, Notification.related_entity_id == conv.id)
        .count()
    )
    assert sender_notifs == 0


def test_notification_list_is_self_scoped(users, db):
    create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="For A",
        body="A only",
        related_entity_type="task",
        related_entity_id=uuid.uuid4(),
    )
    create_notification(
        db,
        recipient_id=users["b"].id,
        notification_type=NotificationType.SYSTEM,
        title="For B",
        body="B only",
        related_entity_type="task",
        related_entity_id=uuid.uuid4(),
    )
    db.commit()

    token_a = _login(users["a"].email)
    response = client.get(
        f"{API}/notifications",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert "For A" in titles
    assert "For B" not in titles


def test_mark_read_self_scoped(users, db):
    notif = create_notification(
        db,
        recipient_id=users["b"].id,
        notification_type=NotificationType.SYSTEM,
        title="Private",
        body="Body",
        related_entity_type="task",
        related_entity_id=uuid.uuid4(),
        emit_realtime=False,
    )
    db.commit()
    assert notif is not None

    token_a = _login(users["a"].email)
    response = client.patch(
        f"{API}/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 403


def test_mark_all_read_current_user_only(users, db):
    create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="Unread A",
        body="x",
        related_entity_type="task",
        related_entity_id=uuid.uuid4(),
        emit_realtime=False,
    )
    create_notification(
        db,
        recipient_id=users["b"].id,
        notification_type=NotificationType.SYSTEM,
        title="Unread B",
        body="x",
        related_entity_type="task",
        related_entity_id=uuid.uuid4(),
        emit_realtime=False,
    )
    db.commit()

    token_a = _login(users["a"].email)
    response = client.patch(
        f"{API}/notifications/read-all",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200

    b_unread = (
        db.query(Notification)
        .filter(Notification.user_id == users["b"].id, Notification.is_read.is_(False))
        .count()
    )
    assert b_unread == 1


def test_push_public_key_endpoint():
    response = client.get(f"{API}/notifications/push-public-key")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data


def test_push_public_key_configured_when_vapid_set(monkeypatch):
    monkeypatch.setattr(
        "app.services.web_push_service.settings.vapid_public_key",
        "BPublicKeyExample",
    )
    monkeypatch.setattr(
        "app.services.web_push_service.settings.vapid_private_key",
        "private-secret",
    )
    monkeypatch.setattr(
        "app.services.web_push_service.settings.vapid_subject",
        "mailto:test@example.com",
    )
    response = client.get(f"{API}/notifications/push-public-key")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["public_key"] == "BPublicKeyExample"
    assert "private" not in str(data).lower()


def test_push_public_key_not_configured_when_vapid_missing(monkeypatch):
    monkeypatch.setattr("app.services.web_push_service.settings.vapid_public_key", None)
    monkeypatch.setattr("app.services.web_push_service.settings.vapid_private_key", None)
    monkeypatch.setattr("app.services.web_push_service.settings.vapid_subject", None)
    response = client.get(f"{API}/notifications/push-public-key")
    data = response.json()
    assert data["configured"] is False
    assert data["public_key"] is None


def _sample_subscription_payload():
    return {
        "endpoint": f"https://push.example.test/sub/{uuid.uuid4().hex}",
        "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Cy4P5aj3wE88",
        "auth": "tBHItJI5svbpez7KI4CCXg",
        "user_agent": "pytest",
    }


def test_register_push_subscription(users, monkeypatch):
    monkeypatch.setattr("app.api.routes.notifications.WebPushService.is_configured", lambda: True)
    token = _login(users["a"].email)
    payload = _sample_subscription_payload()
    response = client.post(
        f"{API}/notifications/push-subscriptions",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201


def test_register_push_subscription_updates_existing(users, db, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription

    monkeypatch.setattr("app.api.routes.notifications.WebPushService.is_configured", lambda: True)
    token = _login(users["a"].email)
    payload = _sample_subscription_payload()

    first = client.post(
        f"{API}/notifications/push-subscriptions",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert first.status_code == 201

    payload["p256dh"] = "UpdatedP256dhKeyValueExample1234567890"
    second = client.post(
        f"{API}/notifications/push-subscriptions",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert second.status_code == 201

    rows = (
        db.query(WebPushSubscription)
        .filter(
            WebPushSubscription.user_id == users["a"].id,
            WebPushSubscription.endpoint == payload["endpoint"],
            WebPushSubscription.revoked_at.is_(None),
        )
        .all()
    )
    assert len(rows) == 1
    assert rows[0].p256dh == payload["p256dh"]


def test_unregister_push_subscription(users, db, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription

    monkeypatch.setattr("app.api.routes.notifications.WebPushService.is_configured", lambda: True)
    token = _login(users["a"].email)
    payload = _sample_subscription_payload()
    client.post(
        f"{API}/notifications/push-subscriptions",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    response = client.request(
        "DELETE",
        f"{API}/notifications/push-subscriptions",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 200

    row = (
        db.query(WebPushSubscription)
        .filter(WebPushSubscription.endpoint == payload["endpoint"])
        .first()
    )
    assert row is not None
    assert row.revoked_at is not None


def test_web_push_service_skips_when_not_configured(db, users, monkeypatch):
    from app.services.web_push_service import WebPushService

    monkeypatch.setattr("app.services.web_push_service.WebPushService.is_configured", lambda: False)
    notif = create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="Test",
        body="Body",
        emit_realtime=False,
    )
    db.commit()
    stats = WebPushService.send_for_notification(db, notif)
    assert stats.configured is False
    assert stats.attempted == 0


def test_web_push_service_skips_when_desktop_disabled(db, users, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription
    from app.services.web_push_service import WebPushService

    monkeypatch.setattr("app.services.web_push_service.WebPushService.is_configured", lambda: True)
    prefs = get_or_create_preferences(db, users["a"].id)
    prefs.desktop_notifications_enabled = False
    db.add(
        WebPushSubscription(
            id=uuid.uuid4(),
            user_id=users["a"].id,
            endpoint="https://push.example.test/sub/abc",
            p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Cy4P5aj3wE88",
            auth="tBHItJI5svbpez7KI4CCXg",
        )
    )
    notif = create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="Test",
        body="Body",
        emit_realtime=False,
    )
    db.commit()

    with monkeypatch.context() as m:
        m.setattr("pywebpush.webpush", lambda **kwargs: None)
        stats = WebPushService.send_for_notification(db, notif, prefs=prefs)
    assert stats.attempted == 0


def test_web_push_service_hides_preview(db, users, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription
    from app.services.web_push_service import GENERIC_WEB_PUSH_BODY, GENERIC_WEB_PUSH_TITLE, WebPushService

    monkeypatch.setattr("app.services.web_push_service.WebPushService.is_configured", lambda: True)
    prefs = get_or_create_preferences(db, users["a"].id)
    prefs.desktop_notifications_enabled = True
    prefs.show_previews = False
    db.add(
        WebPushSubscription(
            id=uuid.uuid4(),
            user_id=users["a"].id,
            endpoint="https://push.example.test/sub/preview",
            p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Cy4P5aj3wE88",
            auth="tBHItJI5svbpez7KI4CCXg",
        )
    )
    notif = create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.MESSAGE,
        title="Secret title",
        body="Secret body content",
        related_entity_type="conversation",
        related_entity_id=uuid.uuid4(),
        emit_realtime=False,
    )
    db.commit()

    captured = {}

    def fake_webpush(**kwargs):
        captured["data"] = kwargs.get("data")

    monkeypatch.setattr("pywebpush.webpush", fake_webpush)
    stats = WebPushService.send_for_notification(db, notif, prefs=prefs)
    assert stats.sent == 1
    payload = __import__("json").loads(captured["data"])
    assert payload["title"] == GENERIC_WEB_PUSH_TITLE
    assert payload["body"] == GENERIC_WEB_PUSH_BODY
    assert "Secret" not in payload["body"]


def test_web_push_service_calls_pywebpush(db, users, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription
    from app.services.web_push_service import WebPushService

    monkeypatch.setattr("app.services.web_push_service.WebPushService.is_configured", lambda: True)
    prefs = get_or_create_preferences(db, users["a"].id)
    prefs.desktop_notifications_enabled = True
    db.commit()
    db.add(
        WebPushSubscription(
            id=uuid.uuid4(),
            user_id=users["a"].id,
            endpoint="https://push.example.test/sub/send",
            p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Cy4P5aj3wE88",
            auth="tBHItJI5svbpez7KI4CCXg",
        )
    )
    notif = create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="Hello",
        body="World",
        emit_realtime=False,
    )
    db.commit()

    calls = []

    def fake_webpush(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr("pywebpush.webpush", fake_webpush)
    stats = WebPushService.send_for_notification(db, notif)
    assert stats.attempted == 1
    assert stats.sent == 1
    assert calls
    assert calls[0]["subscription_info"]["endpoint"].startswith("https://push.example.test")
    assert "vapid_private_key" in calls[0]


def test_web_push_service_revokes_on_410(db, users, monkeypatch):
    from app.models.web_push_subscription import WebPushSubscription
    from app.services.web_push_service import WebPushService
    from pywebpush import WebPushException

    monkeypatch.setattr("app.services.web_push_service.WebPushService.is_configured", lambda: True)
    prefs = get_or_create_preferences(db, users["a"].id)
    prefs.desktop_notifications_enabled = True
    sub_id = uuid.uuid4()
    db.add(
        WebPushSubscription(
            id=sub_id,
            user_id=users["a"].id,
            endpoint="https://push.example.test/sub/gone",
            p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Cy4P5aj3wE88",
            auth="tBHItJI5svbpez7KI4CCXg",
        )
    )
    notif = create_notification(
        db,
        recipient_id=users["a"].id,
        notification_type=NotificationType.SYSTEM,
        title="Hello",
        body="World",
        emit_realtime=False,
    )
    db.commit()

    class FakeResponse:
        status_code = 410

    def fake_webpush(**kwargs):
        raise WebPushException("gone", response=FakeResponse())

    monkeypatch.setattr("pywebpush.webpush", fake_webpush)
    stats = WebPushService.send_for_notification(db, notif)
    assert stats.failed == 1
    row = db.get(WebPushSubscription, sub_id)
    assert row.revoked_at is not None


def test_push_test_endpoint(users, monkeypatch):
    from app.services.web_push_service import WebPushSendStats, WebPushService

    monkeypatch.setattr("app.api.routes.notifications.WebPushService.is_configured", lambda: True)

    def fake_test(db, user_id):
        return WebPushSendStats(configured=True, subscriptions=1, attempted=1, sent=1, failed=0)

    monkeypatch.setattr("app.api.routes.notifications.WebPushService.send_test_to_user", fake_test)
    token = _login(users["a"].email)
    response = client.post(
        f"{API}/notifications/push/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["sent"] == 1
    assert "private" not in str(data).lower()

