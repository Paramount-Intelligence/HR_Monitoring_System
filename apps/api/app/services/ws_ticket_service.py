"""Short-lived single-use WebSocket connection tickets."""
from __future__ import annotations

import secrets
import threading
import time
import uuid
from dataclasses import dataclass

TICKET_TTL_SECONDS = 60


@dataclass
class _WsTicket:
    user_id: uuid.UUID
    expires_at: float
    used: bool = False


_lock = threading.Lock()
_tickets: dict[str, _WsTicket] = {}


def issue_ws_ticket(user_id: uuid.UUID) -> tuple[str, int]:
    ticket = secrets.token_urlsafe(32)
    expires_at = time.time() + TICKET_TTL_SECONDS
    with _lock:
        _purge_expired_locked()
        _tickets[ticket] = _WsTicket(user_id=user_id, expires_at=expires_at)
    return ticket, TICKET_TTL_SECONDS


def consume_ws_ticket(ticket: str | None) -> uuid.UUID | None:
    if not ticket:
        return None
    now = time.time()
    with _lock:
        _purge_expired_locked()
        record = _tickets.get(ticket)
        if not record or record.used or record.expires_at <= now:
            if ticket in _tickets:
                del _tickets[ticket]
            return None
        record.used = True
        user_id = record.user_id
        del _tickets[ticket]
        return user_id


def _purge_expired_locked() -> None:
    now = time.time()
    expired = [key for key, value in _tickets.items() if value.expires_at <= now or value.used]
    for key in expired:
        del _tickets[key]
