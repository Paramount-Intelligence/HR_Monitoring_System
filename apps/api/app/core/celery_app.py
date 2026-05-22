from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.task_routes = {
    "app.worker.test_celery": "main-queue",
}

celery_app.conf.beat_schedule = {
    "send-meeting-reminders-every-minute": {
        "task": "app.tasks.meetings.send_meeting_reminders",
        "schedule": 60.0, # Every minute
    }
}

celery_app.conf.update(task_track_started=True)
