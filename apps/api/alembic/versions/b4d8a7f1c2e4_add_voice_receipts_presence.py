"""add voice notes, message receipts, and presence status

Revision ID: b4d8a7f1c2e4
Revises: l7m8n9o0p1q2
Create Date: 2026-06-28 20:10:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "b4d8a7f1c2e4"
down_revision: Union[str, None] = "l7m8n9o0p1q2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    attachment_columns = {column["name"] for column in inspector.get_columns("message_attachments")}
    if "attachment_type" not in attachment_columns:
        op.add_column(
            "message_attachments",
            sa.Column("attachment_type", sa.String(length=50), nullable=False, server_default="file"),
        )
    if "duration_seconds" not in attachment_columns:
        op.add_column(
            "message_attachments",
            sa.Column("duration_seconds", sa.Integer(), nullable=True),
        )

    if "message_receipts" not in table_names:
        op.create_table(
            "message_receipts",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("message_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("seen_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("message_id", "user_id", name="uq_message_receipts_message_user"),
        )
    else:
        receipt_columns = {column["name"] for column in inspector.get_columns("message_receipts")}
        if "user_id" not in receipt_columns and "recipient_id" in receipt_columns:
            op.alter_column("message_receipts", "recipient_id", new_column_name="user_id")
        if "seen_at" not in receipt_columns and "read_at" in receipt_columns:
            op.alter_column("message_receipts", "read_at", new_column_name="seen_at")

    inspector = inspect(bind)
    indexes = _index_names(inspector, "message_receipts")
    if "ix_message_receipts_message_id" not in indexes:
        op.create_index("ix_message_receipts_message_id", "message_receipts", ["message_id"], unique=False)
    if "ix_message_receipts_user_id" not in indexes:
        op.create_index("ix_message_receipts_user_id", "message_receipts", ["user_id"], unique=False)
    if "ix_message_receipts_delivered_at" not in indexes:
        op.create_index("ix_message_receipts_delivered_at", "message_receipts", ["delivered_at"], unique=False)
    if "ix_message_receipts_seen_at" not in indexes:
        op.create_index("ix_message_receipts_seen_at", "message_receipts", ["seen_at"], unique=False)

    message_columns = {column["name"] for column in inspector.get_columns("messages")}
    if "message_type" in message_columns:
        op.alter_column(
            "messages",
            "message_type",
            existing_type=sa.String(length=50),
            type_=sa.Enum("text", "voice", "system", "link", "status_update", name="message_type", native_enum=False),
            existing_nullable=False,
        )

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

    op.alter_column("message_attachments", "attachment_type", server_default=None)
    if "presence_status" not in user_columns:
        op.alter_column("users", "presence_status", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    op.alter_column(
        "messages",
        "message_type",
        existing_type=sa.String(length=50),
        type_=sa.Enum("text", "system", "link", "status_update", name="message_type", native_enum=False),
        existing_nullable=False,
    )

    indexes = _index_names(inspector, "message_receipts")
    if "ix_message_receipts_seen_at" in indexes:
        op.drop_index("ix_message_receipts_seen_at", table_name="message_receipts")
    if "ix_message_receipts_delivered_at" in indexes:
        op.drop_index("ix_message_receipts_delivered_at", table_name="message_receipts")

    attachment_columns = {column["name"] for column in inspector.get_columns("message_attachments")}
    if "duration_seconds" in attachment_columns:
        op.drop_column("message_attachments", "duration_seconds")
    if "attachment_type" in attachment_columns:
        op.drop_column("message_attachments", "attachment_type")
