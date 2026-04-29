"""Auth service: login and token refresh business logic."""
from __future__ import annotations

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
    hash_password,
)
from app.models.audit_log import AuditLog
from app.models.enums import UserStatus
from app.models.password_reset_token import PasswordResetToken
from app.models.account_invitation import AccountInvitation
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RefreshResponse, TokenUser


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def login(self, payload: LoginRequest) -> LoginResponse:
        user = self.db.query(User).filter(User.email == payload.email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check status before password
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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(str(user.id), user.role.value)
        refresh_token = create_refresh_token(str(user.id))

        # Audit login success
        self._write_audit(user.id, "LOGIN", "auth", user.id, new_value={"role": user.role.value})
        self.db.commit()

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=TokenUser(
                id=str(user.id),
                full_name=user.full_name,
                role=user.role.value,
                department=user.department,
                designation=user.designation,
            ),
        )

    def refresh(self, refresh_token: str) -> RefreshResponse:
        try:
            payload = decode_refresh_token(refresh_token)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload",
            )

        import uuid as _uuid
        user = self.db.get(User, _uuid.UUID(user_id))
        if not user or user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )

        new_access_token = create_access_token(str(user.id), user.role.value)
        return RefreshResponse(access_token=new_access_token)

    def logout(self, user_id: str) -> None:
        """Record logout audit event."""
        import uuid as _uuid
        uid = _uuid.UUID(user_id)
        self._write_audit(uid, "LOGOUT", "auth", uid)
        self.db.commit()

    def request_password_reset(self, email: str) -> str | None:
        """Generate a password reset token for the given email."""
        import secrets
        import hashlib
        from datetime import datetime, timedelta, timezone
        
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None  # Don't reveal if user exists
        
        # Invalidate old tokens
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        # Create new token
        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2)
        )
        self.db.add(reset_token)
        self._write_audit(user.id, "PASSWORD_RESET_REQUEST", "auth", user.id)
        self.db.commit()
        return raw_token

    def reset_password(self, raw_token: str, new_password: str) -> bool:
        """Consume a reset token and set the new password."""
        import hashlib
        from datetime import datetime, timezone
        
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        token = self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used == False
        ).first()
        
        if not token:
            return False
            
        # SQLite returns naive datetimes
        now = datetime.now(timezone.utc)
        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < now:
            return False
        
        user = self.db.get(User, token.user_id)
        if not user:
            return False
        
        user.password_hash = hash_password(new_password)
        token.is_used = True
        self._write_audit(user.id, "PASSWORD_RESET_COMPLETE", "auth", user.id)
        self.db.commit()
        return True

    def activate_account(self, raw_token: str, password: str) -> bool:
        """Validate invitation token and activate account with a new password."""
        import hashlib
        from datetime import datetime, timezone
        
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        invitation = self.db.query(AccountInvitation).filter(
            AccountInvitation.token_hash == token_hash,
            AccountInvitation.is_used == False
        ).first()
        
        if not invitation:
            return False
            
        # SQLite returns naive datetimes, so we must normalize for comparison
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
