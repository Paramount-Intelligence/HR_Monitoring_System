"""Auth service: login and token refresh business logic."""
from __future__ import annotations

from fastapi import HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import verify_password, hash_password
from app.models.audit_log import AuditLog
from app.models.enums import UserStatus
from app.models.password_reset_token import PasswordResetToken
from app.models.account_invitation import AccountInvitation
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RefreshResponse, TokenUser
from app.services.auth_rate_limit_service import AuthRateLimitService, client_ip
from app.services.email_service import EmailService
from app.services.refresh_token_service import RefreshTokenService


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def login(self, payload: LoginRequest, *, request: Request | None = None) -> LoginResponse:
        if request is not None:
            AuthRateLimitService(self.db).enforce_login(request, payload.email)

        user = self.db.query(User).filter(User.email == payload.email).first()

        if not user:
            if request is not None:
                AuthRateLimitService(self.db).record_login_failure(request, payload.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.status == UserStatus.INACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        if user.status == UserStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended. Please contact your administrator.",
            )
        if user.status == UserStatus.INVITED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not yet activated. Please check your email for the invitation link.",
            )

        if not verify_password(payload.password, user.password_hash):
            self._write_audit(user.id, "LOGIN_FAILED", "auth", user.id, new_value={"reason": "bad_password"})
            self.db.commit()
            if request is not None:
                AuthRateLimitService(self.db).record_login_failure(request, payload.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_agent = request.headers.get("User-Agent") if request else None
        ip_address = client_ip(request) if request else None
        access_token, refresh_token = RefreshTokenService(self.db).issue_tokens(
            user,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        self._write_audit(user.id, "LOGIN", "auth", user.id, new_value={"role": user.role.value})
        self.db.commit()

        if request is not None:
            AuthRateLimitService(self.db).record_login_success(request, payload.email)

        from app.services.user_online_enricher import UserOnlineEnricher

        online = UserOnlineEnricher(self.db).offline_defaults()
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=TokenUser(
                id=str(user.id),
                full_name=user.full_name,
                role=user.role.value,
                department=user.department,
                designation=user.designation,
                avatar_url=user.avatar_url,
                profile_picture_url=user.avatar_url,
                presence_status=getattr(user, "presence_status", None) or "active",
                presence_updated_at=user.presence_updated_at.isoformat() if user.presence_updated_at else None,
                last_seen_at=user.last_seen_at.isoformat() if user.last_seen_at else None,
                online_state=online["online_state"],
                is_online=online["is_online"],
            ),
        )

    def refresh(
        self,
        refresh_token: str,
        *,
        request: Request | None = None,
    ) -> RefreshResponse:
        user_agent = request.headers.get("User-Agent") if request else None
        ip_address = client_ip(request) if request else None
        access_token, new_refresh_token, _user = RefreshTokenService(self.db).rotate(
            refresh_token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        return RefreshResponse(access_token=access_token, refresh_token=new_refresh_token)

    def logout(self, user_id: str, refresh_token: str | None = None) -> None:
        import uuid as _uuid

        uid = _uuid.UUID(user_id)
        RefreshTokenService(self.db).revoke_raw_token(refresh_token)
        self._write_audit(uid, "LOGOUT", "auth", uid)
        self.db.commit()

    def request_password_reset(self, email: str, *, request: Request | None = None) -> str | None:
        if request is not None:
            limiter = AuthRateLimitService(self.db)
            limiter.enforce_forgot_password(request, email)
            limiter.record_forgot_password(request, email)

        import secrets
        import hashlib
        from datetime import datetime, timedelta, timezone

        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None

        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,
        ).update({"is_used": True})

        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(reset_token)
        self._write_audit(user.id, "PASSWORD_RESET_REQUEST", "auth", user.id)

        try:
            EmailService.send_password_reset(user, raw_token)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send password reset email: {e}")

        self.db.commit()
        return raw_token

    def admin_send_password_reset(self, user: User, actor: User) -> tuple[bool, str | None]:
        import secrets
        import hashlib
        import logging
        from datetime import datetime, timedelta, timezone

        logger = logging.getLogger(__name__)

        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,
        ).update({"is_used": True})

        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(reset_token)

        email_sent = True
        email_error = None
        try:
            EmailService.send_password_reset(user, raw_token)
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            email_sent = False
            email_error = str(e)

        return email_sent, email_error

    def reset_password(self, raw_token: str, new_password: str, *, request: Request | None = None) -> bool:
        if request is not None:
            AuthRateLimitService(self.db).enforce_reset_password(request, raw_token)

        import hashlib
        from datetime import datetime, timezone

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        token = self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used == False,
        ).first()

        if not token:
            if request is not None:
                AuthRateLimitService(self.db).record_reset_password_failure(request, raw_token)
            return False

        now = datetime.now(timezone.utc)
        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            if request is not None:
                AuthRateLimitService(self.db).record_reset_password_failure(request, raw_token)
            return False

        user = self.db.get(User, token.user_id)
        if not user:
            if request is not None:
                AuthRateLimitService(self.db).record_reset_password_failure(request, raw_token)
            return False

        user.password_hash = hash_password(new_password)
        token.is_used = True
        RefreshTokenService(self.db).revoke_all_for_user(user.id)
        self._write_audit(user.id, "PASSWORD_RESET_COMPLETE", "auth", user.id)
        self.db.commit()
        return True

    def activate_account(self, raw_token: str, password: str) -> bool:
        import hashlib
        from datetime import datetime, timezone

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        invitation = self.db.query(AccountInvitation).filter(
            AccountInvitation.token_hash == token_hash,
            AccountInvitation.is_used == False,
        ).first()

        if not invitation:
            return False

        now = datetime.now(timezone.utc)
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            return False

        user = self.db.get(User, invitation.user_id)
        if not user:
            return False

        user.password_hash = hash_password(password)
        user.status = UserStatus.ACTIVE
        invitation.is_used = True

        self._write_audit(user.id, "ACCOUNT_ACTIVATED", "auth", user.id)
        self.db.commit()
        return True

    def _write_audit(
        self,
        actor_id,
        action: str,
        entity_type: str,
        entity_id,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        log = AuditLog(
            actor_user_id=actor_id,
            action_type=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
        )
        self.db.add(log)
