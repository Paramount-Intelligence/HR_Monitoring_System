"""WebSocket realtime endpoint."""
from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.enums import UserStatus
from app.models.user import User
from app.services.realtime_service import RealtimeService
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

PING_INTERVAL_SECONDS = 30


def _authenticate_websocket_user(ticket: str | None, db: Session) -> tuple[User | None, str | None]:
    """Validate single-use WS ticket and load user. Returns (user, rejection_reason)."""
    from app.services.ws_ticket_service import consume_ws_ticket

    if not ticket:
        return None, "missing_ticket"

    ticket_user_id = consume_ws_ticket(ticket)
    if not ticket_user_id:
        return None, "invalid_or_expired_ticket"

    user = db.get(User, ticket_user_id)
    if not user:
        logger.warning("[WS_AUTH] rejected reason=ticket_user_not_found")
        return None, "user_not_found"
    if user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
        logger.warning("[WS_AUTH] rejected reason=inactive_user")
        return None, "inactive_user"
    logger.info("[WS_AUTH] ticket accepted user_id=%s", user.id)
    return user, None


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket) -> None:
    db = SessionLocal()
    user: User | None = None
    try:
        if websocket.query_params.get("token"):
            logger.warning("[WS_AUTH] rejected reason=jwt_query_not_allowed")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        ticket = websocket.query_params.get("ticket")
        user, reject_reason = _authenticate_websocket_user(ticket, db)
        if not user:
            if reject_reason:
                logger.warning("[WS_AUTH] rejected reason=%s", reject_reason)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await ws_manager.connect(
            websocket,
            user_id=str(user.id),
            role=user.role.value,
        )
        logger.info("[WS] user connected user_id=%s", user.id)

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
