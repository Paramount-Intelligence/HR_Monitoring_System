"""Helpers for organization detail employee lists."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.shift import Shift
from app.models.user import User
from app.schemas.organization_member import OrganizationMemberRead


def _member_from_user(user: User, db: Session) -> OrganizationMemberRead:
    dept_name = None
    if user.department_id:
        dept = db.get(Department, user.department_id)
        dept_name = dept.name if dept else None
    shift_name = None
    if user.shift_id:
        shift = db.get(Shift, user.shift_id)
        shift_name = shift.name if shift else None
    manager_name = None
    if user.manager_id:
        manager = db.get(User, user.manager_id)
        manager_name = manager.full_name if manager else None
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    status_val = user.status.value if hasattr(user.status, "value") else str(user.status)
    return OrganizationMemberRead(
        id=user.id,
        full_name=user.full_name,
        role=role_val,
        designation=user.designation,
        department_name=dept_name,
        shift_name=shift_name,
        manager_name=manager_name,
        status=status_val,
    )


def list_department_members(db: Session, department_id: uuid.UUID) -> list[OrganizationMemberRead]:
    users = db.query(User).filter(User.department_id == department_id).order_by(User.full_name.asc()).all()
    return [_member_from_user(u, db) for u in users]


def list_shift_members(db: Session, shift_id: uuid.UUID) -> list[OrganizationMemberRead]:
    users = db.query(User).filter(User.shift_id == shift_id).order_by(User.full_name.asc()).all()
    return [_member_from_user(u, db) for u in users]


def count_department_members(db: Session, department_id: uuid.UUID) -> int:
    return db.query(User).filter(User.department_id == department_id).count()


def count_shift_members(db: Session, shift_id: uuid.UUID) -> int:
    return db.query(User).filter(User.shift_id == shift_id).count()
