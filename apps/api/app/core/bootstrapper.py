"""Automatic bootstrapper to ensure a system admin exists on startup."""
from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.models.enums import UserRole, UserStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

def bootstrap_admin(db: Session) -> None:
    """Idempotently create the production admin user from settings."""
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == settings.bootstrap_admin_email).first()
        if admin:
            logger.info(f"Admin user {settings.bootstrap_admin_email} already exists.")
            return

        # Create production admin
        new_admin = User(
            full_name=settings.bootstrap_admin_name,
            email=settings.bootstrap_admin_email,
            password_hash=hash_password(settings.bootstrap_admin_password),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            department="Operations",
            designation="System Administrator",
        )
        db.add(new_admin)
        db.commit()
        logger.info(f"Successfully bootstrapped admin user: {settings.bootstrap_admin_email}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to bootstrap admin user: {e}")
