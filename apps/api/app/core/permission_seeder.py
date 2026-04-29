"""Permission seeder — seeds role_permissions and permissions tables on startup."""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS
from app.models.permission import Permission, RolePermission

logger = logging.getLogger(__name__)


def seed_permissions(db: Session) -> None:
    """Idempotently seed permissions and role_permissions tables."""
    try:
        # Seed Permission table
        for key, description in ALL_PERMISSIONS:
            existing = db.query(Permission).filter(Permission.key == key).first()
            if not existing:
                db.add(Permission(key=key, description=description))

        # Seed RolePermission table
        for role, perms in ROLE_PERMISSIONS.items():
            for perm_key in perms:
                existing = db.query(RolePermission).filter(
                    RolePermission.role == role,
                    RolePermission.permission_key == perm_key
                ).first()
                if not existing:
                    db.add(RolePermission(role=role, permission_key=perm_key))

        db.commit()
        logger.info("Permission tables seeded successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed permissions: {e}")
