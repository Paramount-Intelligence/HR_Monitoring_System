"""Verify call_recordings table exists and has expected columns."""
from sqlalchemy import create_engine, text

from app.core.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as conn:
    tables = conn.execute(
        text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'call_recordings'"
        )
    ).fetchall()
    print("TABLE:", tables)
    cols = conn.execute(
        text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'call_recordings' "
            "ORDER BY ordinal_position"
        )
    ).fetchall()
    for name, dtype in cols:
        print(f"  {name}: {dtype}")
