"""Database encoding helpers."""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine


def assert_utf8_database(engine: Engine) -> None:
    """Ensure PostgreSQL database uses UTF-8 so emoji/unicode messages can be stored."""
    with engine.connect() as conn:
        encoding = conn.execute(
            text("SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()")
        ).scalar_one()

    if encoding.upper() != "UTF8":
        raise RuntimeError(
            f"Database encoding is {encoding}, but UTF8 is required for unicode messages. "
            "Create a UTF-8 database and point DATABASE_URL to it, e.g. "
            "CREATE DATABASE your_db WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE='C' LC_CTYPE='C';"
        )
