import logging
from datetime import datetime, timezone, timedelta

from app.db.session import SessionLocal
from app.models.performance_metric import PerformanceMetricDaily
from app.models.time_log import TimeLog
from app.models.enums import TimeLogStatus
from app.models.user import User
from apps.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task
def compute_daily_metrics() -> str:
    """Computes daily performance metrics for all active users for the previous day."""
    db = SessionLocal()
    try:
        # We compute for yesterday
        now = datetime.now(timezone.utc)
        target_date = (now - timedelta(days=1)).date()
        start_of_day = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
        end_of_day = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc)
        
        users = db.query(User).filter(User.status == 'active').all()
        count = 0
        
        for user in users:
            # Check if metric already exists
            existing = (
                db.query(PerformanceMetricDaily)
                .filter(
                    PerformanceMetricDaily.user_id == user.id,
                    PerformanceMetricDaily.metric_date == target_date
                )
                .first()
            )
            if existing:
                continue
                
            # Aggregate time logs for yesterday
            logs = (
                db.query(TimeLog)
                .filter(
                    TimeLog.user_id == user.id,
                    TimeLog.status == TimeLogStatus.COMPLETED,
                    TimeLog.started_at >= start_of_day,
                    TimeLog.started_at <= end_of_day
                )
                .all()
            )
            
            productive_minutes = sum(log.duration_minutes for log in logs if log.duration_minutes)
            
            # Simple dummy scoring for MVP
            output_score = min(5.0, productive_minutes / 60.0) if productive_minutes > 0 else 0.0
            
            metric = PerformanceMetricDaily(
                user_id=user.id,
                metric_date=target_date,
                total_session_minutes=480, # Assume 8 hours for MVP
                productive_minutes=productive_minutes,
                output_score=output_score,
                efficiency_score=output_score,
                utilization_score=output_score,
                consistency_score=5.0,
                composite_score=output_score
            )
            db.add(metric)
            count += 1
            
        db.commit()
        return f"Computed metrics for {count} users for {target_date}."
    finally:
        db.close()
