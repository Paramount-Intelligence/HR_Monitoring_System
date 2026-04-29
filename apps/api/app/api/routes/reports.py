from __future__ import annotations
import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.report import WeeklyReportRead, MonthlyReportRead
from app.services.report_service import ReportService

router = APIRouter()

@router.get("/employee", response_model=WeeklyReportRead, summary="Get my personal report")
def get_employee_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> WeeklyReportRead:
    return ReportService(db).get_aggregation(actor.id, start_date, end_date)

@router.get("/manager", response_model=list[WeeklyReportRead], summary="Get team reports for manager")
def get_manager_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[WeeklyReportRead]:
    if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can access team reports")
    
    # Get all direct reports
    team_members = db.query(User).filter(User.manager_id == actor.id).all()
    results = []
    service = ReportService(db)
    for member in team_members:
        results.append(service.get_aggregation(member.id, start_date, end_date))
    return results

@router.get("/hr", response_model=list[WeeklyReportRead], summary="Get org reports for HR")
def get_hr_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[WeeklyReportRead]:
    if actor.role not in (UserRole.HR_OPERATIONS, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Org level aggregation
    return ReportService(db).get_org_aggregation(start_date, end_date)

@router.get("/admin", response_model=list[WeeklyReportRead], summary="Get org reports for Admin")
def get_admin_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db), 
    actor: User = Depends(get_current_user)
) -> list[WeeklyReportRead]:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    return ReportService(db).get_org_aggregation(start_date, end_date)
