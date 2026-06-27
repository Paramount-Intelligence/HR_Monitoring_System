"""Live online presence heartbeat and lookup routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.presence import (
    BatchOnlinePresenceResponse,
    OnlinePresenceRead,
    PresenceHeartbeatRequest,
    PresenceHeartbeatResponse,
    PresenceOfflineRequest,
)
from app.services.online_presence_service import OnlinePresenceService

router = APIRouter()


@router.post("/heartbeat", response_model=PresenceHeartbeatResponse)
def presence_heartbeat(
    payload: PresenceHeartbeatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PresenceHeartbeatResponse:
    service = OnlinePresenceService(db)
    result = service.heartbeat(
        current_user,
        device_id=payload.device_id,
        platform=payload.platform,
        app_state=payload.app_state,
        user_agent=request.headers.get("User-Agent"),
    )
    return PresenceHeartbeatResponse(**result)


@router.post("/offline", response_model=OnlinePresenceRead)
def presence_offline(
    payload: PresenceOfflineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnlinePresenceRead:
    service = OnlinePresenceService(db)
    state = service.go_offline(
        current_user,
        device_id=payload.device_id,
        platform=payload.platform,
    )
    return OnlinePresenceRead(**state)


@router.get("/users", response_model=BatchOnlinePresenceResponse)
def get_users_online_presence(
    ids: str = Query(..., description="Comma-separated user UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BatchOnlinePresenceResponse:
    del current_user
    user_ids: list[uuid.UUID] = []
    for part in ids.split(","):
        part = part.strip()
        if part:
            user_ids.append(uuid.UUID(part))
    states = OnlinePresenceService(db).get_users_online_state(user_ids)
    return BatchOnlinePresenceResponse(
        users={
            str(uid): OnlinePresenceRead(**state)
            for uid, state in states.items()
        }
    )
