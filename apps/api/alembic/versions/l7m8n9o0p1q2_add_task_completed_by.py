"""add task completed_by

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2026-06-09 14:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l7m8n9o0p1q2"
down_revision: Union[str, None] = "k6l7m8n9o0p1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("completed_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tasks", "completed_by")
