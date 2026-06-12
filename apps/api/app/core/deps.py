from __future__ import annotations

import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.models.permission import RolePermission, UserPermissionOverride

bearer_scheme = HTTPBearer()
bearer_scheme_optional = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# DB session
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, uuid.UUID(user_id))
    if user is None:
        raise credentials_exception

    # Check all blocked statuses
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated"
        )
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact your administrator."
        )
    return user


# ---------------------------------------------------------------------------
# Permission resolver
# ---------------------------------------------------------------------------

def get_user_permissions(user: User, db: Session) -> set[str]:
    """Resolve the full permission set for a user (role-based + overrides)."""
    # Get role-based permissions
    role_perms = db.query(RolePermission).filter(
        RolePermission.role == user.role.value
    ).all()
    perms: set[str] = {rp.permission_key for rp in role_perms}

    # Apply per-user overrides
    overrides = db.query(UserPermissionOverride).filter(
        UserPermissionOverride.user_id == user.id
    ).all()
    for override in overrides:
        if override.granted:
            perms.add(override.permission_key)
        else:
            perms.discard(override.permission_key)

    return perms


def check_permission(user: User, permission: str, db: Session) -> bool:
    """Return True if user has the given permission."""
    return permission in get_user_permissions(user, db)


# ---------------------------------------------------------------------------
# Role guards
# ---------------------------------------------------------------------------

def _require_role(*roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {[r.value for r in roles]}",
            )
        return current_user
    return dependency


def require_any_role(*roles: UserRole):
    """Alias for _require_role for clearer call sites."""
    return _require_role(*roles)


# ---------------------------------------------------------------------------
# Permission guards
# ---------------------------------------------------------------------------

def require_permission(permission_key: str):
    """Dependency that checks a specific permission key."""
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not check_permission(current_user, permission_key, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission_key}' required",
            )
        return current_user
    return dependency


def require_any_permission(*permission_keys: str):
    """Dependency that passes if the user has at least one of the given permissions."""
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        perms = get_user_permissions(current_user, db)
        if any(key in perms for key in permission_keys):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )
    return dependency


# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------

from collections import defaultdict
import time

def get_rate_limiter(requests: int, window: int):
    cache = defaultdict(list)

    def limiter(
        request: Request,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme_optional)
    ):
        key = "anonymous"
        if credentials:
            try:
                payload = decode_access_token(credentials.credentials)
                key = payload.get("sub", "anonymous")
            except:
                pass
        
        if key == "anonymous":
            key = request.client.host if request.client else "unknown"

        now = time.time()
        # Clean up old requests
        cache[key] = [t for t in cache[key] if t > now - window]
        
        if len(cache[key]) >= requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        
        cache[key].append(now)
    
    return limiter

# Pre-defined limiters
limit_resend_invite = get_rate_limiter(requests=3, window=300)  # 3 per 5 mins
limit_activation = get_rate_limiter(requests=5, window=600)      # 5 per 10 mins


# ---------------------------------------------------------------------------
# Convenience role deps (backward-compatible + new roles)
# ---------------------------------------------------------------------------

require_admin = _require_role(UserRole.ADMIN)
require_manager = _require_role(UserRole.MANAGER)
require_admin_or_manager = _require_role(UserRole.ADMIN, UserRole.MANAGER)
require_admin_hr = _require_role(UserRole.ADMIN, UserRole.HR_OPERATIONS)
require_admin_manager_hr = _require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR_OPERATIONS)
require_leadership = _require_role(
    UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER, UserRole.TEAM_LEAD
)
