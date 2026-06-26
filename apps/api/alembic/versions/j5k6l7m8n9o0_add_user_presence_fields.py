"""add user presence fields

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
Create Date: 2026-06-26 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j5k6l7m8n9o0"
down_revision: Union[str, None] = "i4j5k6l7m8n9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "presence_status" not in user_columns:
        op.add_column(
            "users",
            sa.Column("presence_status", sa.String(length=20), nullable=False, server_default="active"),
        )
    if "presence_updated_at" not in user_columns:
        op.add_column(
            "users",
            sa.Column("presence_updated_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "last_seen_at" not in user_columns:
        op.add_column(
            "users",
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "last_seen_at" in user_columns:
        op.drop_column("users", "last_seen_at")
    if "presence_updated_at" in user_columns:
        op.drop_column("users", "presence_updated_at")
    if "presence_status" in user_columns:
        op.drop_column("users", "presence_status")
