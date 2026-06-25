"""Add EOD work summary fields and work_mode column."""
from alembic import op
import sqlalchemy as sa

revision = "i4j5k6l7m8n9"
down_revision = "h3i4j5k6l7m8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("eod_reports", sa.Column("work_mode", sa.String(length=20), nullable=True))
    op.add_column("eod_reports", sa.Column("work_summary", sa.Text(), nullable=True))
    op.add_column("eod_reports", sa.Column("blockers", sa.Text(), nullable=True))
    op.add_column("eod_reports", sa.Column("next_day_plan", sa.Text(), nullable=True))
    op.add_column("eod_reports", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        """
        UPDATE eod_reports
        SET work_mode = highlights_summary
        WHERE highlights_summary IN ('office', 'wfh')
        """
    )
    op.execute(
        """
        UPDATE eod_reports
        SET work_mode = 'office'
        WHERE work_mode IS NULL
        """
    )

    op.execute(
        """
        DELETE FROM eod_reports a
        USING eod_reports b
        WHERE a.user_id = b.user_id
          AND a.report_date = b.report_date
          AND a.created_at < b.created_at
        """
    )

    op.create_unique_constraint(
        "uq_eod_reports_user_date",
        "eod_reports",
        ["user_id", "report_date"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_eod_reports_user_date", "eod_reports", type_="unique")
    op.drop_column("eod_reports", "submitted_at")
    op.drop_column("eod_reports", "next_day_plan")
    op.drop_column("eod_reports", "blockers")
    op.drop_column("eod_reports", "work_summary")
    op.drop_column("eod_reports", "work_mode")
