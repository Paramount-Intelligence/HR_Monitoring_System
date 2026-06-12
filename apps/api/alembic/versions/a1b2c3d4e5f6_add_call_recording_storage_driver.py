"""add storage_driver to call_recordings

Revision ID: a1b2c3d4e5f6
Revises: f9e2a1b3c4d5
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f9e2a1b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "call_recordings" not in inspector.get_table_names():
        # Table will be created by c7d8e9f0a1b2 if earlier revision was skipped in production.
        return

    columns = {c["name"] for c in inspector.get_columns("call_recordings")}
    if "storage_driver" not in columns:
        op.add_column(
            "call_recordings",
            sa.Column("storage_driver", sa.String(length=32), nullable=False, server_default="local"),
        )

    for index_name, cols in [
        ("ix_call_recordings_call_type", ["call_type"]),
        ("ix_call_recordings_recording_type", ["recording_type"]),
        ("ix_call_recordings_deleted_at", ["deleted_at"]),
    ]:
        exists = bind.execute(
            sa.text(
                "SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() "
                "AND indexname = :name LIMIT 1"
            ),
            {"name": index_name},
        ).scalar()
        if not exists:
            op.create_index(index_name, "call_recordings", cols)


def downgrade() -> None:
    op.drop_index("ix_call_recordings_deleted_at", table_name="call_recordings")
    op.drop_index("ix_call_recordings_recording_type", table_name="call_recordings")
    op.drop_index("ix_call_recordings_call_type", table_name="call_recordings")
    op.drop_column("call_recordings", "storage_driver")
