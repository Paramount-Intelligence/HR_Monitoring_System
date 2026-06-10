"""add user avatar fields

Revision ID: b3a7c1d9e2f4
Revises: 04dcb0ac44b7
Create Date: 2026-06-09 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3a7c1d9e2f4"
down_revision: Union[str, None] = "04dcb0ac44b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=2048), nullable=True))
    op.add_column("users", sa.Column("avatar_file_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("avatar_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_updated_at")
    op.drop_column("users", "avatar_file_name")
    op.drop_column("users", "avatar_url")
