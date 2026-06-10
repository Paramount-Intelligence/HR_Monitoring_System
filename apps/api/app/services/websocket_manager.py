"""In-memory WebSocket connection manager.

TODO: Add Redis pub/sub for multi-instance Railway deployments.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.models.enums import UserRole

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._meta: dict[WebSocket, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        *,
        user_id: str,
        role: str,
    ) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)
            self._meta[websocket] = {"user_id": user_id, "role": role}
        logger.info("WS connected user_id=%s (total=%s)", user_id, len(self._connections[user_id]))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            meta = self._meta.pop(websocket, None)
            if not meta:
                return
            user_id = meta["user_id"]
            conns = self._connections.get(user_id)
            if conns and websocket in conns:
                conns.discard(websocket)
                if not conns:
                    del self._connections[user_id]
        logger.info("WS disconnected user_id=%s", meta.get("user_id"))

    async def _send_json(self, websocket: WebSocket, event: dict[str, Any]) -> None:
        try:
            await websocket.send_json(event)
        except (WebSocketDisconnect, RuntimeError):
            await self.disconnect(websocket)
        except Exception as exc:
            logger.debug("WS send failed: %s", exc)
            await self.disconnect(websocket)

    async def send_to_user(self, user_id: str, event: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(str(user_id), set()))
        for ws in sockets:
            await self._send_json(ws, event)

    async def send_to_users(self, user_ids: list[str] | set[str], event: dict[str, Any]) -> None:
        unique = {str(uid) for uid in user_ids}
        for uid in unique:
            await self.send_to_user(uid, event)

    async def broadcast_to_admins(self, event: dict[str, Any]) -> None:
        admin_roles = {
            UserRole.ADMIN.value,
            UserRole.HR_OPERATIONS.value,
        }
        async with self._lock:
            targets: list[str] = []
            for ws, meta in list(self._meta.items()):
                if meta.get("role") in admin_roles:
                    targets.append(meta["user_id"])
        await self.send_to_users(set(targets), event)

    async def broadcast_to_role(self, role: str, event: dict[str, Any]) -> None:
        async with self._lock:
            targets = [
                meta["user_id"]
                for meta in self._meta.values()
                if meta.get("role") == role
            ]
        await self.send_to_users(set(targets), event)

    async def broadcast_to_all_authenticated(self, event: dict[str, Any]) -> None:
        async with self._lock:
            targets = [meta["user_id"] for meta in self._meta.values()]
        await self.send_to_users(set(targets), event)

    def connection_count(self, user_id: str | None = None) -> int:
        if user_id:
            return len(self._connections.get(str(user_id), set()))
        return sum(len(s) for s in self._connections.values())


ws_manager = WebSocketManager()


def schedule_coroutine(coro) -> None:
    """Schedule an async coroutine from sync FastAPI route handlers."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)
