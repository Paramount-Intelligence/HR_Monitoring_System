"""add avatar content type and size

Revision ID: c4d8e2f1a6b3
Revises: b3a7c1d9e2f4
Create Date: 2026-06-09 18:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d8e2f1a6b3"
down_revision: Union[str, None] = "b3a7c1d9e2f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_content_type", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("avatar_size", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_size")
    op.drop_column("users", "avatar_content_type")
