"""Analytics service — composite metrics for performance, workload, and burnout."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.task import Task
from app.models.attendance_session import AttendanceSession
from app.models.enums import TaskStatus, UserRole
from app.schemas.analytics import BestPerformer, WorkloadBalance, BurnoutRisk, ProductivityTrend

class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_best_performers(self) -> list[BestPerformer]:
        # fair ranking: tasks completed + attendance
        users = self.db.query(User).filter(User.role == UserRole.EMPLOYEE).all()
        results = []
        for u in users:
            done = self.db.query(Task).filter(Task.assigned_to == u.id, Task.status == TaskStatus.COMPLETED).count()
            # simple score
            results.append(BestPerformer(
                user_id=u.id,
                full_name=u.full_name,
                score=float(done * 10),
                completed_tasks=done,
                attendance_consistency=0.9 # placeholder
            ))
        return sorted(results, key=lambda x: x.score, reverse=True)

    def get_workload_balance(self) -> list[WorkloadBalance]:
        users = self.db.query(User).filter(User.role == UserRole.EMPLOYEE).all()
        results = []
        for u in users:
            active = self.db.query(Task).filter(Task.assigned_to == u.id, Task.status != TaskStatus.COMPLETED).count()
            results.append(WorkloadBalance(
                user_id=u.id,
                full_name=u.full_name,
                active_tasks=active,
                overloaded=active > 5
            ))
        return results

    def get_burnout_risks(self) -> list[BurnoutRisk]:
        # detect repeated excessive hours (consecutive > 10h)
        return [] # logic later

    def get_productivity_trends(self, user_id: uuid.UUID) -> list[ProductivityTrend]:
        # daily scores over last 7 days
        return [] # logic later
