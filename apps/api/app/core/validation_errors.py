"""Sanitized validation error formatting for API responses."""
from __future__ import annotations

from typing import Any


SENSITIVE_FIELD_NAMES = frozenset(
    {
        "password",
        "current_password",
        "new_password",
        "confirm_password",
        "token",
        "access_token",
        "refresh_token",
        "secret",
        "authorization",
    }
)


def sanitize_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Return field-level validation errors without echoing submitted input."""
    sanitized: list[dict[str, str]] = []
    for err in errors:
        loc = err.get("loc") or ()
        field_parts = [str(part) for part in loc if part not in ("body", "query", "path", "header")]
        field = ".".join(field_parts) if field_parts else "request"
        message = str(err.get("msg") or "Invalid value.")
        if any(part.lower() in SENSITIVE_FIELD_NAMES for part in field_parts):
            message = "Invalid value."
        sanitized.append({"field": field, "message": message})
    return sanitized
