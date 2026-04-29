from sqlalchemy import create_engine, inspect
import os

db_url = "sqlite:///d:/HR Monitoring System/apps/api/workforce_intelligence.db"
engine = create_engine(db_url)
inspector = inspect(engine)

tables = ["daily_stats", "attendance_sessions", "leave_requests", "shifts", "approval_timeline"]
for table in tables:
    if table in inspector.get_table_names():
        print(f"Table '{table}' EXISTS")
        cols = [c["name"] for c in inspector.get_columns(table)]
        print(f"Columns: {cols}")
    else:
        print(f"Table '{table}' MISSING")
    print("-" * 20)
