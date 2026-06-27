"""Live online presence schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PresenceHeartbeatRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=128)
    platform: str = Field(..., pattern="^(web|mobile)$")
    app_state: str | None = Field(None, max_length=32)


class PresenceOfflineRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=128)
    platform: str = Field(..., pattern="^(web|mobile)$")


class OnlinePresenceRead(BaseModel):
    online_state: str
    is_online: bool
    last_seen_at: datetime | None = None
    platforms: list[str] = Field(default_factory=list)


class PresenceHeartbeatResponse(BaseModel):
    user_id: uuid.UUID
    online_state: str
    is_online: bool
    last_seen_at: datetime | None = None
    platforms: list[str] = Field(default_factory=list)


class BatchOnlinePresenceResponse(BaseModel):
    users: dict[str, OnlinePresenceRead]
