"""Tests for call push dispatch and device token RBAC."""
import uuid
from unittest.mock import MagicMock, patch

from app.models.enums import NotificationType
from app.models.notifications import Notification
from app.services.push_notification_service import (
    PushNotificationService,
    build_push_data_from_notification,
    is_valid_expo_push_token,
)


def test_is_valid_expo_push_token():
    assert is_valid_expo_push_token("ExponentPushToken[abc123]")
    assert not is_valid_expo_push_token("not-a-token")


def test_call_incoming_push_data_uses_call_session_id():
    notif = Notification(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Incoming Call",
        message="Alice is calling you (voice).",
        notification_type=NotificationType.CALL_INCOMING,
        related_entity_type="call_session",
        related_entity_id=uuid.uuid4(),
        is_read=False,
    )
    data = build_push_data_from_notification(notif)
    assert data["type"] == "incoming_call"
    assert data["call_id"] == str(notif.related_entity_id)


def test_send_for_notification_skips_call_incoming():
    db = MagicMock()
    notif = Notification(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Incoming Call",
        message="Alice is calling you",
        notification_type=NotificationType.CALL_INCOMING,
        related_entity_type="call_session",
        related_entity_id=uuid.uuid4(),
        is_read=False,
    )
    with patch.object(PushNotificationService, "send_push_to_user") as mock_send:
        PushNotificationService.send_for_notification(db, notif)
        mock_send.assert_not_called()


def test_send_incoming_call_push_targets_callee():
    db = MagicMock()
    recipient_id = uuid.uuid4()
    call_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    caller_id = uuid.uuid4()

    with patch.object(PushNotificationService, "send_push_to_user") as mock_send:
        PushNotificationService.send_incoming_call_push(
            db,
            recipient_user_id=recipient_id,
            call_session_id=call_id,
            conversation_id=conv_id,
            caller_id=caller_id,
            caller_name="Alice",
            call_type="voice",
        )
        mock_send.assert_called_once()
        assert mock_send.call_args[0][1] == recipient_id
        data = mock_send.call_args[0][4]
        assert data["type"] == "incoming_call"
        assert data["call_id"] == str(call_id)
        assert data["conversation_id"] == str(conv_id)
        assert data["caller_id"] == str(caller_id)
        assert "expires_at" in data
