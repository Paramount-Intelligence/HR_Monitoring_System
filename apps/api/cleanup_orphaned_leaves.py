"""
cleanup_orphaned_leaves.py
==========================
Local/dev-only script. Finds leave_request rows that have no matching
approval_timeline entry (orphaned by the pre-fix double-commit bug) and
marks them CANCELLED.

Safety guards:
  1. Aborts if the resolved DB URL is NOT a SQLite file — refuses to run on Postgres/production.
  2. Prints every affected row before modifying anything.
  3. Uses soft-delete (status = 'cancelled') — no hard deletes.
  4. Requires explicit --confirm flag to apply changes; defaults to dry-run.

Usage:
    # Dry-run — just show orphans, touch nothing:
    python cleanup_orphaned_leaves.py

    # Apply — mark orphans as cancelled:
    python cleanup_orphaned_leaves.py --confirm
"""

from __future__ import annotations

import sys
import argparse
from datetime import datetime, timezone

# ── Bootstrap the app settings so we use the same DB as the server ──────────
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.leave_request import LeaveRequest
from app.models.approval_timeline import ApprovalTimeline
from app.models.enums import ApprovalEntityType, LeaveStatus

# ── Safety guard ─────────────────────────────────────────────────────────────
db_url = settings.database_url or ""
if not db_url.startswith("sqlite"):
    print(
        f"\n[ABORTED] database_url resolves to:\n    {db_url}\n"
        "    This script only runs against local SQLite databases.\n"
        "    To protect production, no changes were made.\n"
    )
    sys.exit(1)

print(f"\n[OK] Local SQLite confirmed: {db_url}")

# ── Parse args ───────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Clean up orphaned leave_request rows (dev only).")
parser.add_argument(
    "--confirm",
    action="store_true",
    help="Apply changes (mark orphans cancelled). Without this flag the script is a dry-run.",
)
args = parser.parse_args()

dry_run = not args.confirm
mode_label = "DRY-RUN (no changes)" if dry_run else "APPLY MODE"
print(f"[MODE] {mode_label}\n")

# ── Query ─────────────────────────────────────────────────────────────────────
db = SessionLocal()
try:
    # All leave_request ids that have at least one timeline entry
    ids_with_timeline = {
        row[0]
        for row in db.query(ApprovalTimeline.entity_id).filter(
            ApprovalTimeline.entity_type == ApprovalEntityType.LEAVE_REQUEST
        ).all()
    }

    # All leave_requests whose id is NOT in that set
    all_requests = db.query(LeaveRequest).all()
    orphans = [r for r in all_requests if r.id not in ids_with_timeline]

    if not orphans:
        print("[OK] No orphaned leave_request rows found. Nothing to clean up.\n")
        sys.exit(0)

    print(f"[WARNING] Found {len(orphans)} orphaned leave_request row(s):\n")
    print(f"  {'ID':<38}  {'user_id':<38}  {'type':<10}  {'start':<12}  {'end':<12}  {'status':<12}  {'created_at'}")
    print("  " + "-" * 140)

    for r in orphans:
        print(
            f"  {str(r.id):<38}  "
            f"{str(r.user_id):<38}  "
            f"{r.leave_type.value:<10}  "
            f"{str(r.start_date):<12}  "
            f"{str(r.end_date):<12}  "
            f"{r.status.value:<12}  "
            f"{r.created_at}"
        )

    print()

    if dry_run:
        print("[DRY-RUN] Complete. Run with --confirm to mark these rows as CANCELLED.\n")
    else:
        cancelled_count = 0
        for r in orphans:
            # Only touch rows that are still in a mutable state
            if r.status in (LeaveStatus.PENDING, LeaveStatus.ESCALATED, LeaveStatus.NEEDS_CLARIFICATION):
                r.status = LeaveStatus.CANCELLED
                r.manager_comment = "[auto-cleanup] Orphaned by pre-fix transaction bug — no timeline entry existed."
                cancelled_count += 1
                print(f"  -> Cancelled: {r.id}  ({r.leave_type.value}, {r.start_date})")
            else:
                print(f"  [SKIP] Already {r.status.value}: {r.id}")

        db.commit()
        print(f"\n[DONE] {cancelled_count} row(s) marked CANCELLED. {len(orphans) - cancelled_count} skipped (already terminal state).\n")

finally:
    db.close()
