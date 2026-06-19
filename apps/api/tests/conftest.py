"""Shared pytest fixtures for API integration tests."""
from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def clear_auth_rate_limits():
    """Prevent cross-test pollution from DB-backed auth rate limits."""
    from app.db.session import SessionLocal
    from app.models.auth_rate_limit import AuthRateLimit

    session = SessionLocal()
    try:
        session.query(AuthRateLimit).delete()
        session.commit()
    finally:
        session.close()
    yield
    session = SessionLocal()
    try:
        session.query(AuthRateLimit).delete()
        session.commit()
    finally:
        session.close()
