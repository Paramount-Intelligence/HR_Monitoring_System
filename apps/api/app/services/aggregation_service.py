"""Aggregation service — compute daily snapshots from raw data."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.daily_stats import DailyStats
from app.models.attendance_session import AttendanceSession
from app.models.leave_request import LeaveRequest
from app.models.enums import LeaveStatus, AttendanceSessionStatus


class AggregationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def compute_daily_snapshot(self, user_id: uuid.UUID, target_date: date) -> DailyStats:
        """Compute and persist stats for a user on a specific date (Idempotent)."""
        # 1. Fetch Sessions for the date
        sessions = self.db.query(AttendanceSession).filter(
            AttendanceSession.user_id == user_id,
            func.date(AttendanceSession.check_in_at) == target_date
        ).all()

        total_hours = 0.0
        is_late = False
        is_early = False
        primary_session_id = None
        is_wfh = False

        if sessions:
            primary_session_id = sessions[0].id
            for s in sessions:
                if s.total_hours:
                    total_hours += s.total_hours
                if s.is_late_login:
                    is_late = True
                if s.is_early_logout:
                    is_early = True
                if s.work_mode == "wfh":
                    is_wfh = True

        # 2. Fetch Leave Context
        leave = self.db.query(LeaveRequest).filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.start_date <= target_date,
            LeaveRequest.end_date >= target_date,
            LeaveRequest.status == LeaveStatus.APPROVED
        ).first()

        leave_type = leave.leave_type if leave else None
        
        # 3. Determine Absence
        is_absent = not sessions and not leave

        # 4. Upsert into DailyStats
        stats = self.db.query(DailyStats).filter(
            DailyStats.user_id == user_id,
            DailyStats.date == target_date
        ).first()

        if not stats:
            stats = DailyStats(user_id=user_id, date=target_date)
            self.db.add(stats)

        stats.total_hours = total_hours
        stats.is_late_login = is_late
        stats.is_early_logout = is_early
        stats.is_absent = is_absent
        stats.leave_type = leave_type
        stats.is_wfh = is_wfh
        stats.primary_session_id = primary_session_id

        self.db.commit()
        self.db.refresh(stats)
        return stats

    def sync_range(self, user_id: uuid.UUID, start_date: date, end_date: date):
        """Sync stats for a range of dates."""
        from datetime import timedelta
        current = start_date
        while current <= end_date:
            self.compute_daily_snapshot(user_id, current)
            current += timedelta(days=1)
