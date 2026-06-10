"""WebSocket realtime endpoint."""
from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.enums import UserStatus
from app.models.user import User
from app.services.realtime_service import RealtimeService
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

PING_INTERVAL_SECONDS = 30


def _authenticate_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.get(User, uuid.UUID(user_id))
    if not user or user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
        return None
    return user


@router.websocket("")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> None:
    db = SessionLocal()
    user: User | None = None
    try:
        user = _authenticate_token(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await ws_manager.connect(
            websocket,
            user_id=str(user.id),
            role=user.role.value,
        )

        connected = RealtimeService.event(
            "connected",
            {"user_id": str(user.id), "role": user.role.value},
        )
        await ws_manager.send_to_user(str(user.id), connected)

        async def heartbeat() -> None:
            from datetime import datetime, timezone

            while True:
                await asyncio.sleep(PING_INTERVAL_SECONDS)
                try:
                    await websocket.send_json(
                        RealtimeService.event(
                            "ping",
                            {"ts": datetime.now(timezone.utc).isoformat()},
                        )
                    )
                except Exception:
                    break

        ping_task = asyncio.create_task(heartbeat())

        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type")
                if msg_type == "pong":
                    continue
                if msg_type == "ping":
                    await websocket.send_json(RealtimeService.event("pong", {}))
        except WebSocketDisconnect:
            pass
        finally:
            ping_task.cancel()
            await ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.exception("WebSocket error: %s", exc)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        db.close()
