"""Conversation avatar upload/remove tests."""
from __future__ import annotations

import io
import uuid

import pytest
from fastapi import UploadFile

from app.core.security import hash_password
from app.models.communication import Conversation, ConversationParticipant
from app.models.enums import ConversationParticipantRole, ConversationType, UserRole, UserStatus
from app.models.user import User
from app.services.conversation_avatar_storage import ConversationAvatarStorageService


@pytest.fixture
def db():
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _user(db, *, role: UserRole, suffix: str) -> User:
    user = User(
        full_name=f"Avatar {suffix}",
        email=f"avatar-{suffix}@test.com",
        password_hash=hash_password("TestPass123!"),
        role=role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _group_with_participants(db, owner: User, member: User) -> Conversation:
    conv = Conversation(
        type=ConversationType.GROUP,
        title="Avatar Test Group",
        created_by_id=owner.id,
    )
    db.add(conv)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(
                conversation_id=conv.id,
                user_id=owner.id,
                role=ConversationParticipantRole.OWNER,
            ),
            ConversationParticipant(
                conversation_id=conv.id,
                user_id=member.id,
                role=ConversationParticipantRole.MEMBER,
            ),
        ]
    )
    db.commit()
    db.refresh(conv)
    return conv


def _png_upload() -> UploadFile:
    data = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return UploadFile(filename="group.png", file=io.BytesIO(data), headers={"content-type": "image/png"})


def test_storage_rejects_invalid_type():
    storage = ConversationAvatarStorageService()
    upload = UploadFile(filename="bad.txt", file=io.BytesIO(b"hello"), headers={"content-type": "text/plain"})
    with pytest.raises(Exception):
        import asyncio

        asyncio.get_event_loop().run_until_complete(storage.read_and_validate(upload))


def test_storage_rejects_oversized_file():
    storage = ConversationAvatarStorageService()
    data = b"\x89PNG\r\n\x1a\n" + (b"x" * (2 * 1024 * 1024 + 1))
    upload = UploadFile(filename="big.png", file=io.BytesIO(data), headers={"content-type": "image/png"})
    with pytest.raises(Exception):
        import asyncio

        asyncio.get_event_loop().run_until_complete(storage.read_and_validate(upload))


def test_admin_can_upload_group_avatar(db, monkeypatch):
    from app.api.routes import messages as messages_routes

    admin = _user(db, role=UserRole.ADMIN, suffix=uuid.uuid4().hex[:6])
    member = _user(db, role=UserRole.EMPLOYEE, suffix=uuid.uuid4().hex[:6])
    conv = _group_with_participants(db, admin, member)

    async def fake_validate(self, _file):
        return b"png", "png", "image/png"

    monkeypatch.setattr(ConversationAvatarStorageService, "read_and_validate", fake_validate)
    monkeypatch.setattr(
        ConversationAvatarStorageService,
        "save",
        lambda self, conversation_id, data, ext, content_type: (
            f"conversation-avatars/{conversation_id}/test.png",
            f"/api/v1/media/conversation-avatars/{conversation_id}/test.png",
        ),
    )
    from app.services.realtime_service import RealtimeService

    monkeypatch.setattr(RealtimeService, "emit_conversation_avatar_updated", lambda *a, **k: None)

    import asyncio

    result = asyncio.get_event_loop().run_until_complete(
        messages_routes.upload_conversation_avatar(conv.id, _png_upload(), db, admin)
    )
    assert result.avatar_url is not None
    db.refresh(conv)
    assert conv.avatar_url is not None


def test_unauthorized_member_cannot_upload(db, monkeypatch):
    from app.api.routes import messages as messages_routes
    from fastapi import HTTPException

    owner = _user(db, role=UserRole.MANAGER, suffix=uuid.uuid4().hex[:6])
    member = _user(db, role=UserRole.EMPLOYEE, suffix=uuid.uuid4().hex[:6])
    conv = _group_with_participants(db, owner, member)

    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.get_event_loop().run_until_complete(
            messages_routes.upload_conversation_avatar(conv.id, _png_upload(), db, member)
        )
    assert exc.value.status_code == 403


def test_direct_conversation_rejects_avatar_upload(db):
    from app.api.routes import messages as messages_routes
    from fastapi import HTTPException

    user_a = _user(db, role=UserRole.EMPLOYEE, suffix=uuid.uuid4().hex[:6])
    user_b = _user(db, role=UserRole.EMPLOYEE, suffix=uuid.uuid4().hex[:7])
    conv = Conversation(type=ConversationType.DIRECT, title=None, created_by_id=user_a.id)
    db.add(conv)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(conversation_id=conv.id, user_id=user_a.id, role=ConversationParticipantRole.OWNER),
            ConversationParticipant(conversation_id=conv.id, user_id=user_b.id, role=ConversationParticipantRole.MEMBER),
        ]
    )
    db.commit()

    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.get_event_loop().run_until_complete(
            messages_routes.upload_conversation_avatar(conv.id, _png_upload(), db, user_a)
        )
    assert exc.value.status_code == 400
