"""ensure call_recordings table exists (defensive for production)

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-06-11

Creates call_recordings if missing (e.g. alembic head stamped without base table).
Adds storage_driver and indexes only when absent — safe to re-run logic via upgrade.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEX_DEFINITIONS: list[tuple[str, list[str]]] = [
    ("ix_call_recordings_call_session_id", ["call_session_id"]),
    ("ix_call_recordings_conversation_id", ["conversation_id"]),
    ("ix_call_recordings_recorded_by_user_id", ["recorded_by_user_id"]),
    ("ix_call_recordings_status", ["status"]),
    ("ix_call_recordings_recording_type", ["recording_type"]),
    ("ix_call_recordings_call_type", ["call_type"]),
    ("ix_call_recordings_created_at", ["created_at"]),
    ("ix_call_recordings_deleted_at", ["deleted_at"]),
]


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {col["name"] for col in inspector.get_columns(table_name)}


def _index_exists(connection: sa.Connection, index_name: str) -> bool:
    row = connection.execute(
        sa.text("SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = :name LIMIT 1"),
        {"name": index_name},
    ).scalar()
    return row is not None


def _create_indexes_if_missing(connection: sa.Connection, inspector: sa.Inspector) -> None:
    if not _table_exists(inspector, "call_recordings"):
        return
    for index_name, columns in INDEX_DEFINITIONS:
        if not _index_exists(connection, index_name):
            op.create_index(index_name, "call_recordings", columns, unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not _table_exists(inspector, "call_recordings"):
        op.create_table(
            "call_recordings",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("call_session_id", sa.Uuid(), nullable=False),
            sa.Column("conversation_id", sa.Uuid(), nullable=True),
            sa.Column("recorded_by_user_id", sa.Uuid(), nullable=False),
            sa.Column("caller_id", sa.Uuid(), nullable=True),
            sa.Column("receiver_id", sa.Uuid(), nullable=True),
            sa.Column("storage_key", sa.String(length=512), nullable=False),
            sa.Column("storage_driver", sa.String(length=32), nullable=False, server_default="local"),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=128), nullable=False),
            sa.Column("file_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("duration_seconds", sa.Integer(), nullable=True),
            sa.Column("recording_type", sa.String(length=20), nullable=False, server_default="audio"),
            sa.Column("call_type", sa.String(length=50), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="available"),
            sa.Column("participants_snapshot", sa.Text(), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["call_session_id"],
                ["call_sessions.id"],
                name="fk_call_recordings_call_session_id_call_sessions",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["conversation_id"],
                ["conversations.id"],
                name="fk_call_recordings_conversation_id_conversations",
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["recorded_by_user_id"],
                ["users.id"],
                name="fk_call_recordings_recorded_by_user_id_users",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["caller_id"],
                ["users.id"],
                name="fk_call_recordings_caller_id_users",
            ),
            sa.ForeignKeyConstraint(
                ["receiver_id"],
                ["users.id"],
                name="fk_call_recordings_receiver_id_users",
            ),
            sa.PrimaryKeyConstraint("id", name="pk_call_recordings"),
        )
        inspector = inspect(bind)
        _create_indexes_if_missing(bind, inspector)
        return

    columns = _column_names(inspector, "call_recordings")

    if "storage_driver" not in columns:
        op.add_column(
            "call_recordings",
            sa.Column("storage_driver", sa.String(length=32), nullable=False, server_default="local"),
        )

    if "caller_id" not in columns:
        op.add_column("call_recordings", sa.Column("caller_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            "fk_call_recordings_caller_id_users",
            "call_recordings",
            "users",
            ["caller_id"],
            ["id"],
        )

    if "receiver_id" not in columns:
        op.add_column("call_recordings", sa.Column("receiver_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            "fk_call_recordings_receiver_id_users",
            "call_recordings",
            "users",
            ["receiver_id"],
            ["id"],
        )

    if "participants_snapshot" not in columns:
        op.add_column("call_recordings", sa.Column("participants_snapshot", sa.Text(), nullable=True))

    _create_indexes_if_missing(bind, inspector)


def downgrade() -> None:
    # Non-destructive: do not drop production recordings table on downgrade.
    pass
