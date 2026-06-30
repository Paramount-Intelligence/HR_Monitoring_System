from __future__ import annotations

"""Shared EOD review status normalization for Approval Center and EOD Reviews."""

REVIEWABLE_EOD_STATUSES = frozenset({"Pending Approval"})
EOD_REVIEW_VISIBLE_STATUSES = frozenset(
    {"Pending Approval", "Approved", "Rejected", "Needs Revision"},
)


def normalize_approval_center_eod_status(value: str | None) -> str:
    """Map raw EOD status to Approval Center filter buckets."""
    v = (value or "").strip().lower()
    if v in ("draft", "generated"):
        return "draft"
    if "pending" in v:
        return "pending"
    if "reject" in v:
        return "rejected"
    if "revision" in v or "clarification" in v:
        return "needs_revision"
    if "approve" in v:
        return "approved"
    return v or "draft"


def is_eod_reviewable(value: str | None) -> bool:
    return (value or "").strip() in REVIEWABLE_EOD_STATUSES
