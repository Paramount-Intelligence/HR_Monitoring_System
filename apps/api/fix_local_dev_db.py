"""
fix_local_dev_db.py
===================
Local/dev-only repair script. Does two things:

1. Creates the 'approval_timeline' table if it doesn't exist
   (the local SQLite DB is missing this table because it was never migrated
    through the correct revision chain).

2. Marks any leave_request rows that have no approval_timeline entry as
   CANCELLED (orphaned by the pre-fix double-commit bug).

Safety: Aborts immediately if the DB is NOT a SQLite file.
Usage:
    # Dry-run (inspect only, no changes):
    python fix_local_dev_db.py

    # Apply changes:
    python fix_local_dev_db.py --confirm
"""

from __future__ import annotations

import sys
import argparse
import sqlite3
from pathlib import Path

# ── Determine DB path from app settings ──────────────────────────────────────
try:
    from app.core.config import settings
    db_url = settings.database_url or ""
except Exception as e:
    print(f"[ERROR] Could not load app settings: {e}")
    sys.exit(1)

if not db_url.startswith("sqlite"):
    print(f"\n[ABORTED] database_url is: {db_url}")
    print("  This script only runs against local SQLite databases.")
    print("  To protect production, no changes were made.\n")
    sys.exit(1)

# Extract file path from sqlite:///./path.db  or  sqlite:////abs/path.db
db_file = db_url.replace("sqlite:///", "").lstrip("/").lstrip("./")
if not db_file:
    db_file = "workforce_intelligence.db"

print(f"\n[OK] Local SQLite confirmed: {db_url}")
print(f"     File: {db_file}\n")

# ── Parse args ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--confirm", action="store_true",
                    help="Apply changes. Without this the script is a dry-run.")
args = parser.parse_args()
dry_run = not args.confirm
print(f"[MODE] {'DRY-RUN (no changes)' if dry_run else 'APPLY MODE'}\n")

# ── Connect ───────────────────────────────────────────────────────────────────
conn = sqlite3.connect(db_file)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── Step 1: Create approval_timeline table if missing ─────────────────────────
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_timeline'")
table_exists = cur.fetchone() is not None

if table_exists:
    print("[OK] approval_timeline table already exists. Skipping creation.\n")
else:
    print("[INFO] approval_timeline table is MISSING from local DB.")
    if dry_run:
        print("[DRY-RUN] Would create approval_timeline table.\n")
    else:
        print("[ACTION] Creating approval_timeline table...")
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS approval_timeline (
                id          CHAR(32)     NOT NULL PRIMARY KEY,
                entity_type VARCHAR(21)  NOT NULL,
                entity_id   CHAR(32)     NOT NULL,
                actor_id    CHAR(32)     NOT NULL REFERENCES users(id),
                action      VARCHAR(9)   NOT NULL,
                comment     TEXT,
                created_at  DATETIME     NOT NULL,
                updated_at  DATETIME     NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_approval_timeline_entity_type_entity_id
                ON approval_timeline (entity_type, entity_id);
        """)
        conn.commit()
        print("[DONE] approval_timeline table created.\n")

# ── Step 2: Find orphaned leave_request rows ──────────────────────────────────
cur.execute("""
    SELECT
        lr.id,
        lr.user_id,
        lr.leave_type,
        lr.status,
        lr.is_half_day,
        lr.half_day_period,
        lr.start_date,
        lr.end_date,
        lr.created_at
    FROM leave_requests lr
    WHERE NOT EXISTS (
        SELECT 1 FROM approval_timeline at2
        WHERE at2.entity_type = 'leave_request'
          AND at2.entity_id   = lr.id
    )
    ORDER BY lr.created_at DESC
""")
orphans = cur.fetchall()

if not orphans:
    print("[OK] No orphaned leave_request rows found. Nothing to clean up.\n")
    conn.close()
    sys.exit(0)

print(f"[WARNING] Found {len(orphans)} orphaned leave_request row(s):\n")
print(f"  {'ID (short)':<12}  {'type':<10}  {'status':<12}  {'half':<5}  {'period':<12}  {'start':<12}  {'created_at'}")
print("  " + "-" * 100)
for r in orphans:
    print(
        f"  {r['id'][:12]:<12}  "
        f"{r['leave_type']:<10}  "
        f"{r['status']:<12}  "
        f"{'yes' if r['is_half_day'] else 'no':<5}  "
        f"{(r['half_day_period'] or 'N/A'):<12}  "
        f"{r['start_date']:<12}  "
        f"{r['created_at']}"
    )
print()

MUTABLE_STATUSES = ('pending', 'escalated', 'needs_clarification')

if dry_run:
    cancellable = [r for r in orphans if r['status'] in MUTABLE_STATUSES]
    already_terminal = [r for r in orphans if r['status'] not in MUTABLE_STATUSES]
    print(f"[DRY-RUN] Would mark {len(cancellable)} row(s) as CANCELLED.")
    if already_terminal:
        print(f"[DRY-RUN] Would skip {len(already_terminal)} row(s) already in terminal state.")
    print("\n  Run with --confirm to apply.\n")
else:
    cancelled = 0
    skipped = 0
    for r in orphans:
        if r['status'] in MUTABLE_STATUSES:
            cur.execute(
                """UPDATE leave_requests
                   SET status = 'cancelled',
                       manager_comment = '[auto-cleanup] Orphaned by pre-fix transaction bug — no approval_timeline entry.',
                       updated_at = datetime('now')
                   WHERE id = ?""",
                (r['id'],)
            )
            print(f"  -> Cancelled: {r['id'][:16]}... ({r['leave_type']}, {r['start_date']})")
            cancelled += 1
        else:
            print(f"  [SKIP] Already {r['status']}: {r['id'][:16]}...")
            skipped += 1

    conn.commit()
    print(f"\n[DONE] {cancelled} row(s) marked CANCELLED. {skipped} row(s) skipped (already terminal).\n")

conn.close()
