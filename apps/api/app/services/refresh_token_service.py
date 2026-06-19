"""Server-side refresh token lifecycle — issue, rotate, revoke, reuse detection."""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_refresh_token
from app.models.enums import UserStatus
from app.models.refresh_token_session import RefreshTokenSession
from app.models.user import User


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class RefreshTokenService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def issue_tokens(
        self,
        user: User,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[str, str]:
        family_id = uuid.uuid4()
        raw_refresh, jti = create_refresh_token(str(user.id), family_id=str(family_id))
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.refresh_token_expire_days)
        session = RefreshTokenSession(
            user_id=user.id,
            token_jti=jti,
            token_hash=hash_refresh_token(raw_refresh),
            family_id=family_id,
            issued_at=now,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(session)
        access_token = create_access_token(str(user.id), user.role.value)
        return access_token, raw_refresh

    def rotate(self, raw_token: str, *, user_agent: str | None = None, ip_address: str | None = None) -> tuple[str, str, User]:
        try:
            payload = decode_refresh_token(raw_token)
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            ) from exc

        user_id_raw = payload.get("sub")
        jti = payload.get("jti")
        family_id_raw = payload.get("family_id")
        if not user_id_raw or not jti or not family_id_raw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload",
            )

        try:
            user_uuid = uuid.UUID(str(user_id_raw))
            family_uuid = uuid.UUID(str(family_id_raw))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload",
            ) from exc

        token_hash = hash_refresh_token(raw_token)
        session = (
            self.db.query(RefreshTokenSession)
            .filter(
                RefreshTokenSession.token_jti == jti,
                RefreshTokenSession.user_id == user_uuid,
            )
            .first()
        )

        if not session:
            self._handle_reuse(family_uuid, jti)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        now = datetime.now(timezone.utc)
        if session.token_hash != token_hash:
            self._mark_reuse(session, now)
            self._revoke_family(family_uuid, now, exclude_jti=None)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        if session.reuse_detected_at or session.revoked_at or session.replaced_by_jti:
            self._mark_reuse(session, now)
            self._revoke_family(family_uuid, now, exclude_jti=None)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            session.revoked_at = now
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user = self.db.get(User, user_uuid)
        if not user or user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED, UserStatus.INVITED):
            self.revoke_all_for_user(user_uuid)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )

        new_raw, new_jti = create_refresh_token(str(user.id), family_id=str(family_uuid))
        new_expires = now + timedelta(days=settings.refresh_token_expire_days)
        session.revoked_at = now
        session.replaced_by_jti = new_jti
        self.db.add(
            RefreshTokenSession(
                user_id=user.id,
                token_jti=new_jti,
                token_hash=hash_refresh_token(new_raw),
                family_id=family_uuid,
                issued_at=now,
                expires_at=new_expires,
                user_agent=user_agent,
                ip_address=ip_address,
            )
        )
        self.db.commit()
        access_token = create_access_token(str(user.id), user.role.value)
        return access_token, new_raw, user

    def revoke_raw_token(self, raw_token: str | None) -> None:
        if not raw_token:
            return
        try:
            payload = decode_refresh_token(raw_token)
        except JWTError:
            return
        jti = payload.get("jti")
        if not jti:
            return
        session = self.db.query(RefreshTokenSession).filter(RefreshTokenSession.token_jti == jti).first()
        if not session:
            return
        now = datetime.now(timezone.utc)
        if not session.revoked_at:
            session.revoked_at = now
        self.db.commit()

    def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        now = datetime.now(timezone.utc)
        sessions = (
            self.db.query(RefreshTokenSession)
            .filter(
                RefreshTokenSession.user_id == user_id,
                RefreshTokenSession.revoked_at.is_(None),
            )
            .all()
        )
        for session in sessions:
            session.revoked_at = now
        if sessions:
            self.db.commit()

    def _handle_reuse(self, family_id: uuid.UUID, jti: str) -> None:
        session = self.db.query(RefreshTokenSession).filter(RefreshTokenSession.token_jti == jti).first()
        now = datetime.now(timezone.utc)
        if session:
            self._mark_reuse(session, now)
            self._revoke_family(family_id, now, exclude_jti=None)
            self.db.commit()

    def _mark_reuse(self, session: RefreshTokenSession, now: datetime) -> None:
        session.reuse_detected_at = now
        if not session.revoked_at:
            session.revoked_at = now

    def _revoke_family(self, family_id: uuid.UUID, now: datetime, *, exclude_jti: str | None) -> None:
        q = self.db.query(RefreshTokenSession).filter(
            RefreshTokenSession.family_id == family_id,
            RefreshTokenSession.revoked_at.is_(None),
        )
        if exclude_jti:
            q = q.filter(RefreshTokenSession.token_jti != exclude_jti)
        for session in q.all():
            session.revoked_at = now
