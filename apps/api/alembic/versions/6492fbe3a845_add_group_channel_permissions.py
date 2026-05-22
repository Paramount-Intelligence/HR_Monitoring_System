"""add_group_channel_permissions

Revision ID: 6492fbe3a845
Revises: f5cbb4ac7b32
Create Date: 2026-05-22 19:02:17.312994

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6492fbe3a845'
down_revision: Union[str, None] = 'f5cbb4ac7b32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column(
        'who_can_send_messages', sa.String(length=50),
        nullable=False, server_default='all_members'
    ))
    op.add_column('conversations', sa.Column(
        'who_can_edit_group_info', sa.String(length=50),
        nullable=False, server_default='admins_only'
    ))
    op.add_column('conversations', sa.Column(
        'who_can_add_members', sa.String(length=50),
        nullable=False, server_default='admins_only'
    ))


def downgrade() -> None:
    op.drop_column('conversations', 'who_can_add_members')
    op.drop_column('conversations', 'who_can_edit_group_info')
    op.drop_column('conversations', 'who_can_send_messages')
