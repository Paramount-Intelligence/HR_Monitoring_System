"""Report service — aggregate metrics from DailyStats."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.daily_stats import DailyStats
from app.models.user import User
from app.schemas.report import WeeklyReportRead


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_aggregation(self, user_id: uuid.UUID, start_date: date, end_date: date) -> WeeklyReportRead:
        """Aggregate stats for a user over a period."""
        from sqlalchemy import case, cast, Float

        stats = self.db.query(
            func.sum(DailyStats.total_hours).label("total_hours"),
            func.sum(case((DailyStats.is_late_login == True, 1), else_=0)).label("late_logins"),
            func.sum(case((DailyStats.is_early_logout == True, 1), else_=0)).label("early_logouts"),
            func.sum(case((DailyStats.is_absent == True, 1), else_=0)).label("absences"),
            func.sum(case((DailyStats.is_wfh == True, 1), else_=0)).label("wfh_days")
        ).filter(
            DailyStats.user_id == user_id,
            DailyStats.date >= start_date,
            DailyStats.date <= end_date
        ).first()

        user = self.db.get(User, user_id)

        return WeeklyReportRead(
            user_id=user_id,
            user_name=user.full_name if user else "Unknown",
            start_date=start_date,
            end_date=end_date,
            total_hours=float(stats.total_hours) if stats and stats.total_hours else 0.0,
            late_logins=int(stats.late_logins) if stats and stats.late_logins else 0,
            early_logouts=int(stats.early_logouts) if stats and stats.early_logouts else 0,
            absences=int(stats.absences) if stats and stats.absences else 0,
            wfh_days=int(stats.wfh_days) if stats and stats.wfh_days else 0
        )

    def get_org_aggregation(self, start_date: date, end_date: date) -> list[WeeklyReportRead]:
        """Aggregate stats for the whole org, grouped by user."""
        users = self.db.query(User).all()
        results = []
        for user in users:
            results.append(self.get_aggregation(user.id, start_date, end_date))
        return results
