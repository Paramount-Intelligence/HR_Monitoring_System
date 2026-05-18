"""attendance updates

Revision ID: 63e4ef16
Revises: 818032c93b4f
Create Date: 2026-05-07 14:48:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63e4ef16'
down_revision: Union[str, None] = '818032c93b4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Add columns to attendance_sessions
    with op.batch_alter_table('attendance_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('worked_minutes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('late_minutes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('early_checkout_minutes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_overtime', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('checkout_after_shift_reason', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('checkout_after_shift_note', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('expected_shift_start_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('expected_shift_end_at', sa.DateTime(timezone=True), nullable=True))

    # Add column to daily_stats
    if 'daily_stats' in inspector.get_table_names():
        daily_stats_columns = {column['name'] for column in inspector.get_columns('daily_stats')}
        if 'is_overtime' not in daily_stats_columns:
            with op.batch_alter_table('daily_stats', schema=None) as batch_op:
                batch_op.add_column(sa.Column('is_overtime', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Remove column from daily_stats
    if 'daily_stats' in inspector.get_table_names():
        daily_stats_columns = {column['name'] for column in inspector.get_columns('daily_stats')}
        if 'is_overtime' in daily_stats_columns:
            with op.batch_alter_table('daily_stats', schema=None) as batch_op:
                batch_op.drop_column('is_overtime')

    # Remove columns from attendance_sessions
    with op.batch_alter_table('attendance_sessions', schema=None) as batch_op:
        batch_op.drop_column('expected_shift_end_at')
        batch_op.drop_column('expected_shift_start_at')
        batch_op.drop_column('checkout_after_shift_note')
        batch_op.drop_column('checkout_after_shift_reason')
        batch_op.drop_column('is_overtime')
        batch_op.drop_column('early_checkout_minutes')
        batch_op.drop_column('late_minutes')
        batch_op.drop_column('worked_minutes')
