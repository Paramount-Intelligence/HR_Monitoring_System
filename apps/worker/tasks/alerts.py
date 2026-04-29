import logging
from datetime import datetime, timezone, timedelta

from app.db.session import SessionLocal
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceSessionStatus, AlertType, AlertSeverity, RelatedEntityType, AlertStatus
from app.models.task import Task
from app.models.enums import TaskStatus
from app.models.user import User
from app.models.alert import Alert
from app.services.email_service import EmailService
from apps.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task
def check_missing_checkouts() -> str:
    """Finds users who haven't checked out by EOD and sends a reminder."""
    db = SessionLocal()
    try:
        # Define "end of day" logic: active sessions started before today's 12 PM (assuming they worked a full day)
        # For simplicity, we just look for any active session that's been running for > 10 hours
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=10)
        
        stale_sessions = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE,
                AttendanceSession.check_in_at < threshold
            )
            .all()
        )
        
        count = 0
        for session in stale_sessions:
            user = db.get(User, session.user_id)
            if not user:
                continue
                
            # Create Alert record
            alert = Alert(
                recipient_user_id=user.id,
                alert_type=AlertType.MISSING_CHECKOUT,
                severity=AlertSeverity.MEDIUM,
                related_entity_type=RelatedEntityType.ATTENDANCE,
                related_entity_id=session.id,
                title="Missing Checkout Reminder",
                message="You have an attendance session that has been active for over 10 hours.",
            )
            db.add(alert)
            
            # Send Email
            try:
                EmailService.send_missing_checkout_alert(user, str(session.id))
                count += 1
            except Exception as e:
                logger.error(f"Failed to send email for session {session.id}: {e}")
                
        db.commit()
        return f"Sent {count} missing checkout alerts."
    finally:
        db.close()

@celery_app.task
def check_overdue_tasks() -> str:
    """Finds overdue tasks and notifies the assigned user's manager."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # Find in-progress tasks where due_date is in the past
        overdue_tasks = (
            db.query(Task)
            .filter(
                Task.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.CREATED]),
                Task.due_date < today
            )
            .all()
        )
        
        count = 0
        for task in overdue_tasks:
            assignee = db.get(User, task.assigned_to)
            if not assignee or not assignee.manager_id:
                continue
                
            manager = db.get(User, assignee.manager_id)
            if not manager:
                continue

            # Deduplication: Check if we already alerted the manager about this specific task being overdue today
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.recipient_user_id == manager.id,
                    Alert.alert_type == AlertType.OVERDUE_TASK,
                    Alert.related_entity_id == task.id,
                    Alert.created_at >= datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
                )
                .first()
            )
            
            if existing_alert:
                continue # Already alerted today
                
            # Create Alert record
            alert = Alert(
                recipient_user_id=manager.id,
                alert_type=AlertType.OVERDUE_TASK,
                severity=AlertSeverity.HIGH,
                related_entity_type=RelatedEntityType.TASK,
                related_entity_id=task.id,
                title="Task Overdue",
                message=f"Task '{task.title}' assigned to {assignee.full_name} is overdue.",
            )
            db.add(alert)
            
            # Send Email
            try:
                EmailService.send_overdue_task_alert(manager, task, assignee)
                count += 1
            except Exception as e:
                logger.error(f"Failed to send email for task {task.id}: {e}")
                
        db.commit()
        return f"Sent {count} overdue task alerts."
    finally:
        db.close()
