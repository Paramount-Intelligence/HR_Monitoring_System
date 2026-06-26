"""Shared serializers for active task timer responses."""
from __future__ import annotations

from app.models.task_timer_session import TaskTimerSession
from app.schemas.task_timer import TaskTimerRead

UNAVAILABLE_TASK_TITLE = "Deleted or unavailable task"


def format_task_timer_read(session: TaskTimerSession | None) -> TaskTimerRead | None:
    if session is None:
        return None
    read = TaskTimerRead.model_validate(session)
    if not read.task_title:
        read = read.model_copy(update={"task_title": UNAVAILABLE_TASK_TITLE})
    return read
