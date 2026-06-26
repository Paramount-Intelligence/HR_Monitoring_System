"""Redis-backed WebSocket event fanout for multi-worker deployments."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

CHANNEL = "pims:realtime:user"

_main_loop: asyncio.AbstractEventLoop | None = None
_redis = None
_pubsub_task: asyncio.Task | None = None
_use_redis = False


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop


def schedule_on_main_loop(coro) -> None:
    """Schedule a coroutine on the uvicorn main event loop from sync HTTP handlers."""
    if _main_loop and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, _main_loop)
        return
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        if _main_loop:
            asyncio.run_coroutine_threadsafe(coro, _main_loop)
        else:
            asyncio.run(coro)


async def start_bridge() -> None:
    global _redis, _pubsub_task, _use_redis
    from app.core.config import settings

    try:
        from redis.asyncio import Redis

        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await _redis.ping()
        _use_redis = True
        _pubsub_task = asyncio.create_task(_listen_pubsub())
        logger.info("[Realtime] Redis pub/sub bridge started channel=%s", CHANNEL)
    except Exception as exc:
        logger.warning(
            "[Realtime] Redis unavailable (%s); in-process WebSocket delivery only",
            exc,
        )
        _use_redis = False


async def stop_bridge() -> None:
    global _pubsub_task, _redis
    if _pubsub_task:
        _pubsub_task.cancel()
        try:
            await _pubsub_task
        except asyncio.CancelledError:
            pass
        _pubsub_task = None
    if _redis:
        await _redis.aclose()
        _redis = None


async def _listen_pubsub() -> None:
    from app.services.websocket_manager import ws_manager

    assert _redis is not None
    pubsub = _redis.pubsub()
    await pubsub.subscribe(CHANNEL)
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                user_id = str(data.get("user_id", ""))
                event = data.get("event")
                if not user_id or not event:
                    continue
                connected = ws_manager.connection_count(user_id) > 0
                await ws_manager.send_to_user(user_id, event)
                event_type = event.get("type", "unknown")
                if event_type.startswith("call"):
                    logger.info(
                        "[CALL] delivered event=%s user_id=%s connected=%s",
                        event_type,
                        user_id,
                        connected,
                    )
            except Exception as exc:
                logger.exception("[Realtime] pub/sub message error: %s", exc)
    finally:
        await pubsub.unsubscribe(CHANNEL)
        await pubsub.aclose()


async def emit_to_user(user_id: str, event: dict[str, Any]) -> None:
    from app.services.websocket_manager import ws_manager

    uid = str(user_id)
    event_type = event.get("type", "unknown")

    if _use_redis and _redis is not None:
        payload = json.dumps({"user_id": uid, "event": event})
        await _redis.publish(CHANNEL, payload)
        return

    connected = ws_manager.connection_count(uid) > 0
    await ws_manager.send_to_user(uid, event)
    if event_type.startswith("call"):
        logger.info(
            "[CALL] delivered event=%s user_id=%s connected=%s (local)",
            event_type,
            uid,
            connected,
        )


async def emit_to_users(user_ids: set[str] | list[str], event: dict[str, Any]) -> None:
    for uid in {str(u) for u in user_ids}:
        await emit_to_user(uid, event)


def schedule_emit_to_user(user_id: str, event: dict[str, Any]) -> None:
    schedule_on_main_loop(emit_to_user(str(user_id), event))


def schedule_emit_to_users(user_ids: set[str] | list[str], event: dict[str, Any]) -> None:
    schedule_on_main_loop(emit_to_users({str(u) for u in user_ids}, event))


async def broadcast_to_all_authenticated(event: dict[str, Any]) -> None:
    from app.services.websocket_manager import ws_manager

    await ws_manager.broadcast_to_all_authenticated(event)


def schedule_broadcast_to_all_authenticated(event: dict[str, Any]) -> None:
    schedule_on_main_loop(broadcast_to_all_authenticated(event))
