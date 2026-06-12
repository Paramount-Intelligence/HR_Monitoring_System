"""add user_device_tokens table

Revision ID: e8f9a0b1c2d3
Revises: c7d8e9f0a1b2
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_device_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("expo_push_token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("device_name", sa.String(length=255), nullable=True),
        sa.Column("device_id", sa.String(length=255), nullable=True),
        sa.Column("app_version", sa.String(length=64), nullable=True),
        sa.Column("build_version", sa.String(length=64), nullable=True),
        sa.Column("environment", sa.String(length=32), nullable=False, server_default="development"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_device_tokens_user_id", "user_device_tokens", ["user_id"])
    op.create_index(
        "ix_user_device_tokens_expo_push_token",
        "user_device_tokens",
        ["expo_push_token"],
        unique=True,
    )
    op.create_index(
        "ix_user_device_tokens_user_active",
        "user_device_tokens",
        ["user_id", "is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_device_tokens_user_active", table_name="user_device_tokens")
    op.drop_index("ix_user_device_tokens_expo_push_token", table_name="user_device_tokens")
    op.drop_index("ix_user_device_tokens_user_id", table_name="user_device_tokens")
    op.drop_table("user_device_tokens")
