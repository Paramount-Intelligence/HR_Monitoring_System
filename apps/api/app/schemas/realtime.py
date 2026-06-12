"""WebSocket realtime event schemas."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class RealtimeEvent(BaseModel):
    type: str
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    payload: dict[str, Any] = Field(default_factory=dict)
    actor_id: str | None = None
    conversation_id: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    route: str | None = None

    def to_wire(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
