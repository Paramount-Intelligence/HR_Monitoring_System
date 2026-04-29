from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab

# Celery Configuration
# We use Redis as the broker as per the architecture spec
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "workforce_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["apps.worker.tasks.alerts", "apps.worker.tasks.metrics"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Scheduled Tasks
celery_app.conf.beat_schedule = {
    "missing-checkouts-eod": {
        "task": "apps.worker.tasks.alerts.check_missing_checkouts",
        # Run every day at 18:00 UTC (Modify as needed for local timezones)
        "schedule": crontab(hour=18, minute=0),
    },
    "overdue-tasks-hourly": {
        "task": "apps.worker.tasks.alerts.check_overdue_tasks",
        "schedule": crontab(minute=0), # Every hour
    },
    "daily-metrics-nightly": {
        "task": "apps.worker.tasks.metrics.compute_daily_metrics",
        "schedule": crontab(hour=1, minute=0), # Every day at 1:00 AM UTC
    },
}
