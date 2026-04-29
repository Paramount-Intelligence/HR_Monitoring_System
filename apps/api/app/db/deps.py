# Backwards-compat re-export so any existing code importing from app.db.deps still works.
from app.core.deps import get_db as get_db  # noqa: PLC0414

__all__ = ["get_db"]
