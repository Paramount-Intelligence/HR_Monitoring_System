"""add storage_driver to call_recordings

Revision ID: a1b2c3d4e5f6
Revises: f9e2a1b3c4d5
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f9e2a1b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "call_recordings",
        sa.Column("storage_driver", sa.String(length=32), nullable=False, server_default="local"),
    )
    op.create_index("ix_call_recordings_call_type", "call_recordings", ["call_type"])
    op.create_index("ix_call_recordings_recording_type", "call_recordings", ["recording_type"])
    op.create_index("ix_call_recordings_deleted_at", "call_recordings", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_call_recordings_deleted_at", table_name="call_recordings")
    op.drop_index("ix_call_recordings_recording_type", table_name="call_recordings")
    op.drop_index("ix_call_recordings_call_type", table_name="call_recordings")
    op.drop_column("call_recordings", "storage_driver")
