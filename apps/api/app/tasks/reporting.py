"""Reporting and Aggregation background tasks."""
from __future__ import annotations

from datetime import date, timedelta, datetime, timezone
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import UserStatus
from app.services.aggregation_service import AggregationService


@celery_app.task(name="app.tasks.reporting.nightly_aggregation")
def nightly_aggregation():
    """Run every night to compute stats for the previous day."""
    db = SessionLocal()
    try:
        yesterday = date.today() - timedelta(days=1)
        active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).all()
        
        service = AggregationService(db)
        processed_count = 0
        for user in active_users:
            service.compute_daily_snapshot(user.id, yesterday)
            processed_count += 1
            
        return f"Processed nightly aggregation for {processed_count} users for {yesterday}"
    finally:
        db.close()

@celery_app.task(name="app.tasks.reporting.sync_user_history")
def sync_user_history(user_id: str, days: int = 30):
    """Backfill stats for a user."""
    db = SessionLocal()
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        import uuid
        uid = uuid.UUID(user_id)
        
        service = AggregationService(db)
        service.sync_range(uid, start_date, end_date)
        
        return f"Synced history for user {user_id} for last {days} days"
    finally:
        db.close()
