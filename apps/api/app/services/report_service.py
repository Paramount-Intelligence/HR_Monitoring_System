"""Report service — live shift-aware team performance reports."""
from __future__ import annotations

import calendar
import uuid
from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session

from app.core.config import settings
from app.core.time_utils import pk_today
from app.models.daily_stats import DailyStats
from app.models.eod_report import EODReport
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas.report import (
    ReportPeriod,
    TeamPerformanceResponse,
    TeamPerformanceRow,
    TeamPerformanceSummary,
    WeeklyReportRead,
)
from app.services.report_metrics_service import live_user_metrics

MAX_CUSTOM_RANGE_DAYS = 90
SUBMITTED_EOD_STATUSES = ("Pending Approval", "Approved", "Rejected", "Needs Revision")

WORKFORCE_REPORT_ROLES = (
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.EMPLOYEE,
    UserRole.INTERN,
    UserRole.JUNIOR_EMPLOYEE,
    UserRole.HR_OPERATIONS,
)

DEFAULT_PAGE_SIZE_MANAGER = 100
DEFAULT_PAGE_SIZE_ORG = 50
MAX_PAGE_SIZE = 200
MAX_EXPORT_ROWS = 500


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def resolve_period_dates(
        period: ReportPeriod,
        *,
        target_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[date, date]:
        from datetime import timedelta

        today = pk_today()
        if period == "daily":
            selected = target_date or today
            return selected, selected
        if period == "weekly":
            anchor = target_date or today
            week_start = anchor - timedelta(days=anchor.weekday())
            week_end = week_start + timedelta(days=6)
            return week_start, week_end
        if period == "monthly":
            anchor = target_date or today
            month_start = anchor.replace(day=1)
            last_day = calendar.monthrange(anchor.year, anchor.month)[1]
            month_end = anchor.replace(day=last_day)
            return month_start, month_end
        if period == "custom":
            if not start_date or not end_date:
                raise ValueError("start_date and end_date are required for custom period")
            if end_date < start_date:
                raise ValueError("end_date must be on or after start_date")
            if (end_date - start_date).days > MAX_CUSTOM_RANGE_DAYS:
                raise ValueError(f"Custom range cannot exceed {MAX_CUSTOM_RANGE_DAYS} days")
            return start_date, end_date
        raise ValueError(f"Unsupported period: {period}")

    def _scoped_team_members_query(
        self,
        actor: User,
        *,
        search: str | None = None,
        department_id: uuid.UUID | None = None,
        role: str | None = None,
    ) -> Query:
        if actor.role == UserRole.MANAGER:
            query = self.db.query(User).filter(User.manager_id == actor.id)
        elif actor.role in (UserRole.HR_OPERATIONS, UserRole.ADMIN):
            query = self.db.query(User).filter(
                User.status == UserStatus.ACTIVE,
                User.role.in_(WORKFORCE_REPORT_ROLES),
            )
        else:
            query = self.db.query(User).filter(User.manager_id == actor.id)

        if department_id:
            query = query.filter(User.department_id == department_id)
        if role:
            try:
                query = query.filter(User.role == UserRole(role))
            except ValueError:
                from sqlalchemy import String, cast

                query = query.filter(cast(User.role, String).ilike(f"%{role}%"))
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                    User.role.ilike(term),
                    User.department.ilike(term),
                    User.designation.ilike(term),
                )
            )
        return query.order_by(User.full_name.asc())

    def get_scoped_team_members(
        self,
        actor: User,
        *,
        search: str | None = None,
        department_id: uuid.UUID | None = None,
        role: str | None = None,
    ) -> list[User]:
        return self._scoped_team_members_query(
            actor,
            search=search,
            department_id=department_id,
            role=role,
        ).all()

    def get_aggregation(self, user_id: uuid.UUID, start_date: date, end_date: date) -> WeeklyReportRead:
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        metrics = live_user_metrics(self.db, user, start_date, end_date)
        return WeeklyReportRead(
            user_id=user_id,
            user_name=user.full_name,
            start_date=start_date,
            end_date=end_date,
            total_hours=float(metrics["hours"]),
            late_logins=int(metrics["late"]),
            early_logouts=int(metrics["early"]),
            absences=int(metrics["absences"]),
            wfh_days=int(metrics["wfh"]),
        )

    def get_org_aggregation(self, start_date: date, end_date: date) -> list[WeeklyReportRead]:
        users = self.db.query(User).filter(User.status == UserStatus.ACTIVE).all()
        return [self.get_aggregation(user.id, start_date, end_date) for user in users]

    def _eod_fields(
        self,
        user_id: uuid.UUID,
        start_date: date,
        end_date: date,
        period: ReportPeriod,
    ) -> tuple[str, int | None]:
        reports = (
            self.db.query(EODReport)
            .filter(
                EODReport.user_id == user_id,
                EODReport.report_date >= start_date,
                EODReport.report_date <= end_date,
            )
            .all()
        )
        submitted = [r for r in reports if r.status in SUBMITTED_EOD_STATUSES]
        if period == "daily":
            report = next((r for r in reports if r.report_date == start_date), None)
            if not report or report.status in ("Draft", "Generated"):
                return "not_submitted", None
            if report.status == "Pending Approval":
                return "submitted", None
            return report.status.lower().replace(" ", "_"), None

        total_days = (end_date - start_date).days + 1
        submitted_days = len({r.report_date for r in submitted})
        if submitted_days == 0:
            return "none", 0
        return f"{submitted_days}/{total_days} submitted", submitted_days

    def build_team_performance_row(
        self,
        user: User,
        start_date: date,
        end_date: date,
        period: ReportPeriod,
    ) -> TeamPerformanceRow:
        metrics = live_user_metrics(self.db, user, start_date, end_date)
        eod_status, eod_submitted_days = self._eod_fields(user.id, start_date, end_date, period)
        return TeamPerformanceRow(
            user_id=user.id,
            name=user.full_name,
            email=user.email,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            department=user.department_name or user.department,
            designation=user.designation,
            avatar_url=user.avatar_url,
            presence_status=user.presence_status,
            hours=float(metrics["hours"]),
            late_count=int(metrics["late"]),
            early_count=int(metrics["early"]),
            wfh_count=int(metrics["wfh"]),
            absence_count=int(metrics["absences"]),
            completed_tasks=int(metrics["completed_tasks"]),
            tasks_worked_on=int(metrics["tasks_worked_on"]),
            eod_status=eod_status,
            eod_submitted_days=eod_submitted_days,
        )

    @staticmethod
    def _normalize_pagination(
        actor: User,
        *,
        page: int | None,
        page_size: int | None,
    ) -> tuple[int, int]:
        is_org_scope = actor.role in (UserRole.HR_OPERATIONS, UserRole.ADMIN)
        default_size = DEFAULT_PAGE_SIZE_ORG if is_org_scope else DEFAULT_PAGE_SIZE_MANAGER
        resolved_page = max(1, page or 1)
        resolved_size = page_size or default_size
        resolved_size = max(1, min(resolved_size, MAX_PAGE_SIZE))
        return resolved_page, resolved_size

    def get_team_performance(
        self,
        actor: User,
        *,
        period: ReportPeriod,
        target_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        search: str | None = None,
        department_id: uuid.UUID | None = None,
        role: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
        export_all: bool = False,
    ) -> TeamPerformanceResponse:
        resolved_start, resolved_end = self.resolve_period_dates(
            period,
            target_date=target_date,
            start_date=start_date,
            end_date=end_date,
        )
        resolved_page, resolved_size = self._normalize_pagination(
            actor,
            page=page,
            page_size=page_size,
        )

        query = self._scoped_team_members_query(
            actor,
            search=search,
            department_id=department_id,
            role=role,
        )
        if actor.role == UserRole.MANAGER:
            query = query.filter(User.id != actor.id)

        total_count = query.count()

        if export_all:
            export_limit = MAX_EXPORT_ROWS
            members = query.limit(export_limit).all()
            resolved_page = 1
            resolved_size = len(members) if members else resolved_size
        else:
            offset = (resolved_page - 1) * resolved_size
            members = query.offset(offset).limit(resolved_size).all()

        rows = [
            self.build_team_performance_row(member, resolved_start, resolved_end, period)
            for member in members
        ]
        summary = TeamPerformanceSummary(
            team_hours=round(sum(row.hours for row in rows), 2),
            late_count=sum(row.late_count for row in rows),
            early_count=sum(row.early_count for row in rows),
            wfh_count=sum(row.wfh_count for row in rows),
            team_absences=sum(row.absence_count for row in rows),
            total_exceptions=sum(row.late_count + row.early_count + row.absence_count for row in rows),
        )
        return TeamPerformanceResponse(
            period=period,
            start_date=resolved_start,
            end_date=resolved_end,
            timezone=settings.business_timezone,
            summary=summary,
            rows=rows,
            total_count=total_count,
            page=resolved_page,
            page_size=resolved_size,
        )
