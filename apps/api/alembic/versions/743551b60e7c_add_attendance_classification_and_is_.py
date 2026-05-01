"""Add attendance_classification and is_corrected, approval_timeline, daily_stats

Revision ID: 743551b60e7c
Revises: 523783759c79
Create Date: 2026-04-30 04:56:11.678163

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '743551b60e7c'
down_revision: Union[str, None] = '523783759c79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add attendance_classification and is_corrected to attendance_sessions
    with op.batch_alter_table('attendance_sessions', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'attendance_classification',
                sa.Enum(
                    'active', 'full_day', 'half_day', 'insufficient', 'leave',
                    name='attendance_classification'
                ),
                nullable=False,
                server_default='active'
            )
        )
        batch_op.add_column(
            sa.Column('is_corrected', sa.Boolean(), nullable=False, server_default='0')
        )

    # Create approval_timeline table
    op.create_table(
        'approval_timeline',
        sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            'entity_type',
            sa.Enum(
                'project', 'timesheet', 'task', 'leave_request', 'attendance_correction',
                name='approval_entity_type'
            ),
            nullable=False
        ),
        sa.Column('entity_id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('actor_id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            'action',
            sa.Enum(
                'created', 'clarified', 'approved', 'rejected', 'escalated', 'cancelled',
                name='approval_action'
            ),
            nullable=False
        ),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name='fk_approval_timeline_actor_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_approval_timeline'),
    )
    op.create_index(
        'ix_approval_timeline_entity_type_entity_id',
        'approval_timeline',
        ['entity_type', 'entity_id']
    )

    # Create daily_stats table
    op.create_table(
        'daily_stats',
        sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('total_hours', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_late_login', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_early_logout', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_absent', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('leave_type', sa.String(length=32), nullable=True),
        sa.Column('is_wfh', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('primary_session_id', sa.Uuid(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_daily_stats_user_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_daily_stats'),
        sa.UniqueConstraint('user_id', 'date', name='uq_user_daily_stats'),
    )
    op.create_index('ix_daily_stats_user_id_date', 'daily_stats', ['user_id', 'date'])


def downgrade() -> None:
    op.drop_index('ix_daily_stats_user_id_date', table_name='daily_stats')
    op.drop_table('daily_stats')
    op.drop_index('ix_approval_timeline_entity_type_entity_id', table_name='approval_timeline')
    op.drop_table('approval_timeline')

    with op.batch_alter_table('attendance_sessions', schema=None) as batch_op:
        batch_op.drop_column('is_corrected')
        batch_op.drop_column('attendance_classification')
