from app.core.celery_app import celery_app
from app.tasks.approvals import check_stale_leaves, send_pending_reminders
from app.tasks.reporting import nightly_aggregation, sync_user_history
from app.tasks.meetings import send_meeting_reminders

@celery_app.task(name="app.worker.test_celery")
def test_celery(word: str) -> str:
    return f"test task return {word}"
