"""
Seed script — creates initial data for development.
Run from apps/api/:
    python seed.py

Seed users (from docs/09_IMPLEMENTATION_ROADMAP.md §8):
  - 1 admin
  - 2 managers
  - 8 employees
"""
from __future__ import annotations

import sys
import os

# Ensure app package is importable when running from apps/api/
sys.path.insert(0, os.path.dirname(__file__))

from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models import Base
from app.models.user import User
from app.models.enums import UserRole, UserStatus

# Create tables if not already present (idempotent)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Skip if already seeded
    if db.query(User).count() > 0:
        print("Database already has users — skipping seed.")
        sys.exit(0)

    admin = User(
        full_name="System Admin",
        email="admin@company.com",
        password_hash=hash_password("Admin1234!"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        department="IT",
        designation="Administrator",
    )
    db.add(admin)
    db.flush()

    manager1 = User(
        full_name="Sarah Manager",
        email="sarah@company.com",
        password_hash=hash_password("Manager1234!"),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Engineering",
        designation="Engineering Manager",
        created_by=admin.id,
    )
    manager2 = User(
        full_name="James Manager",
        email="james@company.com",
        password_hash=hash_password("Manager1234!"),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE,
        department="Product",
        designation="Product Manager",
        created_by=admin.id,
    )
    db.add_all([manager1, manager2])
    db.flush()

    employees = [
        ("Alice Employee", "alice@company.com", "Engineering", manager1.id),
        ("Bob Employee", "bob@company.com", "Engineering", manager1.id),
        ("Carol Employee", "carol@company.com", "Engineering", manager1.id),
        ("Dave Employee", "dave@company.com", "Engineering", manager1.id),
        ("Eve Employee", "eve@company.com", "Product", manager2.id),
        ("Frank Employee", "frank@company.com", "Product", manager2.id),
        ("Grace Employee", "grace@company.com", "Product", manager2.id),
        ("Hank Employee", "hank@company.com", "Product", manager2.id),
    ]

    for name, email, dept, mgr_id in employees:
        db.add(User(
            full_name=name,
            email=email,
            password_hash=hash_password("Employee1234!"),
            role=UserRole.EMPLOYEE,
            status=UserStatus.ACTIVE,
            department=dept,
            manager_id=mgr_id,
            created_by=admin.id,
        ))

    db.commit()
    print("[OK] Seed complete.")
    print("   admin@company.com    / Admin1234!")
    print("   sarah@company.com    / Manager1234!")
    print("   james@company.com    / Manager1234!")
    print("   alice@company.com    / Employee1234!  (+ 7 more employees)")

finally:
    db.close()
