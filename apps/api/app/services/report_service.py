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
        stats = self.db.query(
            func.sum(DailyStats.total_hours).label("total_hours"),
            func.count(DailyStats.id).filter(DailyStats.is_late_login == True).label("late_logins"),
            func.count(DailyStats.id).filter(DailyStats.is_early_logout == True).label("early_logouts"),
            func.count(DailyStats.id).filter(DailyStats.is_absent == True).label("absences"),
            func.count(DailyStats.id).filter(DailyStats.is_wfh == True).label("wfh_days")
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
            total_hours=stats.total_hours or 0.0,
            late_logins=stats.late_logins or 0,
            early_logouts=stats.early_logouts or 0,
            absences=stats.absences or 0,
            wfh_days=stats.wfh_days or 0
        )

    def get_org_aggregation(self, start_date: date, end_date: date) -> list[WeeklyReportRead]:
        """Aggregate stats for the whole org, grouped by user."""
        users = self.db.query(User).all()
        results = []
        for user in users:
            results.append(self.get_aggregation(user.id, start_date, end_date))
        return results
