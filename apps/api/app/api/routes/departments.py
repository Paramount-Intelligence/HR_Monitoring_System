from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.department import Department
from app.schemas.department import DepartmentRead, DepartmentCreate

router = APIRouter()

@router.post("", response_model=DepartmentRead, summary="Create a department (Admin only)")
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> DepartmentRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    dept = Department(name=payload.name, admin_id=payload.admin_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.get("", response_model=list[DepartmentRead], summary="List departments")
def list_departments(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[DepartmentRead]:
    return db.query(Department).all()
