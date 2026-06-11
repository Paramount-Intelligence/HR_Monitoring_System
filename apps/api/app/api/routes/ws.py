"""WebSocket realtime endpoint."""
from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError, ExpiredSignatureError
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


def _authenticate_websocket_user(token: str | None, db: Session) -> tuple[User | None, str | None]:
    """Validate JWT and load user. Returns (user, rejection_reason)."""
    logger.info("[WS_AUTH] token received=%s", bool(token))
    if not token:
        return None, "missing_token"

    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        logger.warning("[WS_AUTH] rejected reason=expired_token")
        return None, "expired_token"
    except JWTError:
        logger.warning("[WS_AUTH] rejected reason=invalid_token")
        return None, "invalid_token"

    token_type = payload.get("type")
    if token_type != "access":
        logger.warning("[WS_AUTH] rejected reason=wrong_token_type type=%s", token_type)
        return None, "wrong_token_type"

    user_id_raw = payload.get("sub")
    logger.info("[WS_AUTH] decoded sub=%s", user_id_raw)
    if not user_id_raw:
        logger.warning("[WS_AUTH] rejected reason=missing_sub")
        return None, "missing_sub"

    try:
        user_uuid = uuid.UUID(str(user_id_raw))
    except ValueError:
        logger.warning("[WS_AUTH] rejected reason=invalid_sub")
        return None, "invalid_sub"

    user = db.get(User, user_uuid)
    logger.info("[WS_AUTH] user found=%s", user is not None)
    if not user:
        logger.warning("[WS_AUTH] rejected reason=user_not_found")
        return None, "user_not_found"

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    logger.info("[WS_AUTH] role=%s", role_value)
    logger.info("[WS_AUTH] user active=%s", user.status == UserStatus.ACTIVE)

    if user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
        logger.warning("[WS_AUTH] rejected reason=inactive_user status=%s", user.status.value)
        return None, "inactive_user"

    return user, None


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket) -> None:
    db = SessionLocal()
    user: User | None = None
    try:
        token = websocket.query_params.get("token")
        user, reject_reason = _authenticate_websocket_user(token, db)
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
