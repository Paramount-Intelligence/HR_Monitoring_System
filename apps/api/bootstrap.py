"""
Bootstrap script — initializes the production admin account.
Run from apps/api/:
    python bootstrap.py
"""
import sys
import os

# Ensure app package is importable
sys.path.insert(0, os.getcwd())

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import UserRole, UserStatus
from app.core.config import settings

def bootstrap():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == settings.bootstrap_admin_email).first()
        if admin:
            print(f"Admin {settings.bootstrap_admin_email} already exists.")
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
        print(f"[SUCCESS] Production admin created: {settings.bootstrap_admin_email}")
        print("IMPORTANT: Change the bootstrap password after first login.")
        
    except Exception as e:
        print(f"[ERROR] Failed to bootstrap admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    bootstrap()
