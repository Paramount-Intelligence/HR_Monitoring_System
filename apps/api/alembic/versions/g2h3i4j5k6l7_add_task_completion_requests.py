"""Add task_completion_requests table for intern completion approval workflow."""
from alembic import op
import sqlalchemy as sa

revision = "g2h3i4j5k6l7"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_completion_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("manager_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "approved",
                "rejected",
                "cancelled",
                "superseded",
                name="task_completion_request_status",
                native_enum=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("request_note", sa.Text(), nullable=True),
        sa.Column("manager_comment", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_completion_requests_task_id", "task_completion_requests", ["task_id"])
    op.create_index(
        "ix_task_completion_requests_requested_by",
        "task_completion_requests",
        ["requested_by_user_id"],
    )
    op.create_index(
        "ix_task_completion_requests_manager_id",
        "task_completion_requests",
        ["manager_id"],
    )
    op.create_index("ix_task_completion_requests_status", "task_completion_requests", ["status"])
    op.create_index(
        "ix_task_completion_requests_requested_at",
        "task_completion_requests",
        ["requested_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_completion_requests_requested_at", table_name="task_completion_requests")
    op.drop_index("ix_task_completion_requests_status", table_name="task_completion_requests")
    op.drop_index("ix_task_completion_requests_manager_id", table_name="task_completion_requests")
    op.drop_index("ix_task_completion_requests_requested_by", table_name="task_completion_requests")
    op.drop_index("ix_task_completion_requests_task_id", table_name="task_completion_requests")
    op.drop_table("task_completion_requests")
    op.execute("DROP TYPE IF EXISTS task_completion_request_status")
