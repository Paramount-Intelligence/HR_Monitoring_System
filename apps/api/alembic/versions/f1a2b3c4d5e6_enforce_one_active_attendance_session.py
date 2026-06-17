"""Enforce one active attendance session per user."""
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE attendance_sessions AS s
        SET session_status = 'completed',
            check_out_at = COALESCE(s.check_out_at, NOW()),
            checkout_after_shift_reason = COALESCE(s.checkout_after_shift_reason, 'auto_checkout'),
            checkout_after_shift_note = COALESCE(
                s.checkout_after_shift_note,
                'Closed during migration to enforce one active session per user.'
            )
        WHERE s.id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id
                           ORDER BY check_in_at DESC
                       ) AS rn
                FROM attendance_sessions
                WHERE session_status = 'active'
            ) ranked
            WHERE ranked.rn > 1
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_one_active_session_per_user
        ON attendance_sessions (user_id)
        WHERE session_status = 'active'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_attendance_one_active_session_per_user")
