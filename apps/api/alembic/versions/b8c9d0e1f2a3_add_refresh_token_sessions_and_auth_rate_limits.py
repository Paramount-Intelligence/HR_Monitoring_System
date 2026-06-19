"""add refresh token sessions and auth rate limits

Revision ID: b8c9d0e1f2a3
Revises: a7e8f9b0c1d2
Create Date: 2026-06-19 14:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7e8f9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_token_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_jti", sa.String(length=64), nullable=True),
        sa.Column("reuse_detected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_refresh_token_sessions_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_token_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_token_sessions_token_hash")),
        sa.UniqueConstraint("token_jti", name=op.f("uq_refresh_token_sessions_token_jti")),
    )
    op.create_index(op.f("ix_refresh_token_sessions_family_id"), "refresh_token_sessions", ["family_id"], unique=False)
    op.create_index(op.f("ix_refresh_token_sessions_user_id"), "refresh_token_sessions", ["user_id"], unique=False)

    op.create_table(
        "auth_rate_limits",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key_hash", sa.String(length=128), nullable=False),
        sa.Column("scope", sa.String(length=64), nullable=False),
        sa.Column("counter", sa.Integer(), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_rate_limits")),
    )
    op.create_index(op.f("ix_auth_rate_limits_key_hash"), "auth_rate_limits", ["key_hash"], unique=False)
    op.create_index(op.f("ix_auth_rate_limits_scope"), "auth_rate_limits", ["scope"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_rate_limits_scope"), table_name="auth_rate_limits")
    op.drop_index(op.f("ix_auth_rate_limits_key_hash"), table_name="auth_rate_limits")
    op.drop_table("auth_rate_limits")
    op.drop_index(op.f("ix_refresh_token_sessions_user_id"), table_name="refresh_token_sessions")
    op.drop_index(op.f("ix_refresh_token_sessions_family_id"), table_name="refresh_token_sessions")
    op.drop_table("refresh_token_sessions")
