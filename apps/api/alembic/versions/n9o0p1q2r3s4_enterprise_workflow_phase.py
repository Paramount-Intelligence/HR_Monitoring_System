"""Enterprise workflow phase tables."""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "n9o0p1q2r3s4"
down_revision = "m8n9o0p1q2r3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attendance_exceptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=True),
        sa.Column("correction_id", sa.Uuid(), nullable=True),
        sa.Column("business_date", sa.Date(), nullable=False),
        sa.Column("exception_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_by", sa.Uuid(), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["correction_id"], ["attendance_corrections.id"]),
        sa.ForeignKeyConstraint(["dismissed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["attendance_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "business_date", "exception_type", name="uq_attendance_exception_user_date_type"),
    )
    op.create_index(
        "ix_attendance_exceptions_status_type_date",
        "attendance_exceptions",
        ["status", "exception_type", "business_date"],
    )
    op.add_column("task_comments", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "task_activity_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_activity_events_task_created", "task_activity_events", ["task_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_task_activity_events_task_created", table_name="task_activity_events")
    op.drop_table("task_activity_events")
    op.drop_column("task_comments", "deleted_at")
    op.drop_index("ix_attendance_exceptions_status_type_date", table_name="attendance_exceptions")
    op.drop_table("attendance_exceptions")
