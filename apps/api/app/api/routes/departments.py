from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.models.department import Department
from app.schemas.department import DepartmentRead, DepartmentCreate, DepartmentUpdate

router = APIRouter()

@router.post("", response_model=DepartmentRead, summary="Create a department (Admin only)")
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> DepartmentRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    admin_id = payload.head_id if payload.head_id is not None else payload.admin_id
        
    if admin_id is not None:
        head_user = db.get(User, admin_id)
        if not head_user or head_user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Selected department head is not eligible."
            )
        eligible_roles = {UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER, UserRole.TEAM_LEAD}
        if head_user.role not in eligible_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Department head must be Admin, HR, Manager, or Team Lead."
            )

    dept = Department(
        name=payload.name, 
        description=payload.description,
        admin_id=admin_id,
        is_active=payload.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    
    if dept.admin_id:
        admin = db.get(User, dept.admin_id)
        dept.admin_name = admin.full_name if admin else None
    else:
        dept.admin_name = None
        
    return dept

@router.get("", response_model=list[DepartmentRead], summary="List departments")
def list_departments(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[DepartmentRead]:
    departments = db.query(Department).all()
    for d in departments:
        if d.admin_id:
            admin = db.get(User, d.admin_id)
            d.admin_name = admin.full_name if admin else None
    return departments

@router.get("/active", response_model=list[DepartmentRead], summary="List active departments")
def list_active_departments(db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[DepartmentRead]:
    departments = db.query(Department).filter(Department.is_active == True).all()
    for d in departments:
        if d.admin_id:
            admin = db.get(User, d.admin_id)
            d.admin_name = admin.full_name if admin else None
    return departments

@router.patch("/{department_id}", response_model=DepartmentRead, summary="Update a department")
def update_department(
    department_id: uuid.UUID,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user)
) -> DepartmentRead:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Map head_id to admin_id
    if "head_id" in update_data:
        head_id = update_data.pop("head_id")
        update_data["admin_id"] = head_id
        
    # Validate new head if provided
    if "admin_id" in update_data and update_data["admin_id"] is not None:
        head_user = db.get(User, update_data["admin_id"])
        if not head_user or head_user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Selected department head is not eligible."
            )
        eligible_roles = {UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER, UserRole.TEAM_LEAD}
        if head_user.role not in eligible_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Department head must be Admin, HR, Manager, or Team Lead."
            )
            
    for key, value in update_data.items():
        setattr(dept, key, value)
    
    db.commit()
    db.refresh(dept)
    
    if dept.admin_id:
        admin = db.get(User, dept.admin_id)
        dept.admin_name = admin.full_name if admin else None
    else:
        dept.admin_name = None
        
    return dept

@router.delete("/{department_id}", summary="Delete or deactivate a department")
def delete_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user)
) -> dict[str, bool]:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    
    dept.is_active = False
    db.commit()
    return {"success": True}
