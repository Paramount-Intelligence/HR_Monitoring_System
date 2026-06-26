from __future__ import annotations

import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.report import (
    MonthlyReportRead,
    ReportPeriod,
    TeamPerformanceResponse,
    WeeklyReportRead,
)
from app.services.report_service import ReportService

router = APIRouter()


@router.get("/employee", response_model=WeeklyReportRead, summary="Get my personal report")
def get_employee_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> WeeklyReportRead:
    return ReportService(db).get_aggregation(actor.id, start_date, end_date)


@router.get("/manager", response_model=list[WeeklyReportRead], summary="Get team reports for manager")
def get_manager_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[WeeklyReportRead]:
    if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can access team reports")

    service = ReportService(db)
    team_members = service.get_scoped_team_members(actor)
    return [service.get_aggregation(member.id, start_date, end_date) for member in team_members]


@router.get("/team-performance", response_model=TeamPerformanceResponse, summary="Team performance report")
def get_team_performance(
    period: ReportPeriod = Query("weekly"),
    date: date | None = Query(None, description="Anchor date for daily/weekly/monthly periods"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    role: str | None = Query(None),
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=200),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> TeamPerformanceResponse:
    if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    service = ReportService(db)
    try:
        return service.get_team_performance(
            actor,
            period=period,
            target_date=date,
            start_date=start_date,
            end_date=end_date,
            search=search,
            department_id=department_id,
            role=role,
            page=page,
            page_size=page_size,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/team-performance/export", summary="Export team performance report as CSV")
def export_team_performance(
    period: ReportPeriod = Query("weekly"),
    date: date | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    role: str | None = Query(None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> StreamingResponse:
    if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR_OPERATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    service = ReportService(db)
    try:
        report = service.get_team_performance(
            actor,
            period=period,
            target_date=date,
            start_date=start_date,
            end_date=end_date,
            search=search,
            department_id=department_id,
            role=role,
            export_all=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Employee Name",
            "Email",
            "Role",
            "Department",
            "Designation",
            "Hours",
            "Tasks Worked On",
            "Completed Tasks",
            "Late",
            "Early",
            "WFH",
            "Absences",
            "EOD Status",
            "Date Range",
        ]
    )
    date_range = f"{report.start_date.isoformat()} to {report.end_date.isoformat()}"
    for row in report.rows:
        writer.writerow(
            [
                row.name,
                row.email,
                row.role,
                row.department or "",
                row.designation or "",
                f"{row.hours:.2f}",
                row.tasks_worked_on,
                row.completed_tasks,
                row.late_count,
                row.early_count,
                row.wfh_count,
                row.absence_count,
                row.eod_status,
                date_range,
            ]
        )

    buffer.seek(0)
    filename = f"team-performance-{report.start_date.isoformat()}-{report.end_date.isoformat()}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/hr", response_model=list[WeeklyReportRead], summary="Get org reports for HR")
def get_hr_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[WeeklyReportRead]:
    if actor.role not in (UserRole.HR_OPERATIONS, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return ReportService(db).get_org_aggregation(start_date, end_date)


@router.get("/admin", response_model=list[WeeklyReportRead], summary="Get org reports for Admin")
def get_admin_reports(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[WeeklyReportRead]:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return ReportService(db).get_org_aggregation(start_date, end_date)
