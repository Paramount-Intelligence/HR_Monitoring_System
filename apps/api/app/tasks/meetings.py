"""Meeting-related background tasks."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.meetings import Meeting, MeetingParticipant
from app.models.notifications import Notification
from app.models.enums import NotificationType
from app.services.realtime_service import RealtimeService

@celery_app.task(name="app.tasks.meetings.send_meeting_reminders")
def send_meeting_reminders(db: Session | None = None):
    """Scan scheduled meetings and notify participants 10 minutes prior."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
        
    try:
        now = datetime.now(timezone.utc)
        ten_minutes_from_now = now + timedelta(minutes=10)
        
        # Query active meeting participants of scheduled meetings that:
        # 1. Start within the next 10 minutes (and not too far in the past, e.g. up to 5 minutes ago)
        # 2. Whose meeting is scheduled
        # 3. Who have not received a reminder yet (reminder_sent_at is null)
        participants_to_notify = db.query(MeetingParticipant).join(Meeting).filter(
            Meeting.status == "scheduled",
            Meeting.start_at >= now - timedelta(minutes=5),
            Meeting.start_at <= ten_minutes_from_now,
            MeetingParticipant.reminder_sent_at.is_(None)
        ).all()
        
        if not participants_to_notify:
            return "No meeting reminders to send."
            
        reminders_sent = 0
        created_notifications: list[Notification] = []
        for part in participants_to_notify:
            meeting = part.meeting
            
            # Send in-app notification
            notif = Notification(
                user_id=part.user_id,
                title="Meeting Reminder",
                message=f"The meeting '{meeting.title}' starts in 10 minutes.",
                notification_type=NotificationType.MEETING_REMINDER,
                related_entity_type="meeting",
                related_entity_id=meeting.id,
                is_read=False
            )
            db.add(notif)
            created_notifications.append(notif)
            
            # Mark reminder as sent
            part.reminder_sent_at = now
            reminders_sent += 1
            
        db.commit()
        for notif in created_notifications:
            db.refresh(notif)
            RealtimeService.emit_notification_created(notif)
        return f"Sent meeting reminders to {reminders_sent} participants."
    finally:
        if should_close:
            db.close()
