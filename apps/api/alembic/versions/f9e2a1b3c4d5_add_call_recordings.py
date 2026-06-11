"""add call recordings

Revision ID: f9e2a1b3c4d5
Revises: 04dcb0ac44b7
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "f9e2a1b3c4d5"
down_revision: Union[str, None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "call_recordings" in inspector.get_table_names():
        return

    op.create_table(
        "call_recordings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("call_session_id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=True),
        sa.Column("recorded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("caller_id", sa.Uuid(), nullable=True),
        sa.Column("receiver_id", sa.Uuid(), nullable=True),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("recording_type", sa.String(length=20), nullable=False),
        sa.Column("call_type", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("participants_snapshot", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["call_session_id"], ["call_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["caller_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_call_recordings_call_session_id", "call_recordings", ["call_session_id"])
    op.create_index("ix_call_recordings_conversation_id", "call_recordings", ["conversation_id"])
    op.create_index("ix_call_recordings_recorded_by_user_id", "call_recordings", ["recorded_by_user_id"])
    op.create_index("ix_call_recordings_status", "call_recordings", ["status"])
    op.create_index("ix_call_recordings_created_at", "call_recordings", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_call_recordings_created_at", table_name="call_recordings")
    op.drop_index("ix_call_recordings_status", table_name="call_recordings")
    op.drop_index("ix_call_recordings_recorded_by_user_id", table_name="call_recordings")
    op.drop_index("ix_call_recordings_conversation_id", table_name="call_recordings")
    op.drop_index("ix_call_recordings_call_session_id", table_name="call_recordings")
    op.drop_table("call_recordings")
