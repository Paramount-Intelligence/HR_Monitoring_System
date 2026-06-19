"""Database-backed authentication rate limiting."""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.auth_rate_limit import AuthRateLimit


def _hash_key(scope: str, key: str) -> str:
    normalized = key.strip().lower()
    return hashlib.sha256(f"{scope}:{normalized}".encode("utf-8")).hexdigest()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class AuthRateLimitService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_limit(self, scope: str) -> tuple[int, int]:
        if scope.startswith("login"):
            return settings.auth_login_max_attempts, settings.auth_login_window_seconds
        if scope.startswith("forgot"):
            return settings.auth_forgot_password_max_attempts, settings.auth_forgot_password_window_seconds
        if scope.startswith("reset"):
            return settings.auth_reset_password_max_attempts, settings.auth_reset_password_window_seconds
        return 5, 900

    def check_blocked(self, scope: str, key: str) -> None:
        key_hash = _hash_key(scope, key)
        now = datetime.now(timezone.utc)
        row = (
            self.db.query(AuthRateLimit)
            .filter(AuthRateLimit.scope == scope, AuthRateLimit.key_hash == key_hash)
            .first()
        )
        if not row or not row.locked_until:
            return
        locked_until = row.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            retry_after = max(1, int((locked_until - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        row.locked_until = None
        row.counter = 0
        row.window_start = now
        self.db.commit()

    def record_failure(self, scope: str, key: str) -> None:
        key_hash = _hash_key(scope, key)
        max_attempts, window_seconds = self._get_limit(scope)
        now = datetime.now(timezone.utc)
        row = (
            self.db.query(AuthRateLimit)
            .filter(AuthRateLimit.scope == scope, AuthRateLimit.key_hash == key_hash)
            .first()
        )
        if not row:
            row = AuthRateLimit(
                key_hash=key_hash,
                scope=scope,
                counter=1,
                window_start=now,
            )
            self.db.add(row)
        else:
            window_start = row.window_start
            if window_start.tzinfo is None:
                window_start = window_start.replace(tzinfo=timezone.utc)
            if now - window_start > timedelta(seconds=window_seconds):
                row.counter = 1
                row.window_start = now
                row.locked_until = None
            else:
                row.counter += 1
            if row.counter >= max_attempts:
                row.locked_until = now + timedelta(seconds=window_seconds)
        self.db.commit()
        if row.locked_until:
            locked_until = row.locked_until
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            retry_after = max(1, int((locked_until - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    def record_attempt(self, scope: str, key: str) -> None:
        """Count every attempt (for forgot-password)."""
        self.record_failure(scope, key)

    def reset(self, scope: str, key: str) -> None:
        key_hash = _hash_key(scope, key)
        row = (
            self.db.query(AuthRateLimit)
            .filter(AuthRateLimit.scope == scope, AuthRateLimit.key_hash == key_hash)
            .first()
        )
        if not row:
            return
        row.counter = 0
        row.locked_until = None
        row.window_start = datetime.now(timezone.utc)
        self.db.commit()

    def enforce_login(self, request: Request, email: str) -> None:
        ip = client_ip(request)
        normalized_email = email.strip().lower()
        self.check_blocked("login:email", normalized_email)
        self.check_blocked("login:ip", ip)

    def record_login_failure(self, request: Request, email: str) -> None:
        ip = client_ip(request)
        normalized_email = email.strip().lower()
        try:
            self.record_failure("login:email", normalized_email)
        except HTTPException:
            raise
        try:
            self.record_failure("login:ip", ip)
        except HTTPException:
            raise

    def record_login_success(self, request: Request, email: str) -> None:
        normalized_email = email.strip().lower()
        self.reset("login:email", normalized_email)
        self.reset("login:ip", client_ip(request))

    def enforce_forgot_password(self, request: Request, email: str) -> None:
        normalized_email = email.strip().lower()
        ip = client_ip(request)
        self.check_blocked("forgot:email", normalized_email)
        self.check_blocked("forgot:ip", ip)

    def record_forgot_password(self, request: Request, email: str) -> None:
        normalized_email = email.strip().lower()
        ip = client_ip(request)
        self.record_attempt("forgot:email", normalized_email)
        self.record_attempt("forgot:ip", ip)

    def enforce_reset_password(self, request: Request, token: str) -> None:
        ip = client_ip(request)
        token_key = hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
        self.check_blocked("reset:ip", ip)
        self.check_blocked("reset:token", token_key)

    def record_reset_password_failure(self, request: Request, token: str) -> None:
        ip = client_ip(request)
        token_key = hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
        self.record_failure("reset:ip", ip)
        self.record_failure("reset:token", token_key)
