"""Add conversation avatar fields."""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "m8n9o0p1q2r3"
down_revision = "b4d8a7f1c2e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("avatar_url", sa.String(length=512), nullable=True))
    op.add_column("conversations", sa.Column("avatar_storage_key", sa.String(length=512), nullable=True))
    op.add_column(
        "conversations",
        sa.Column("avatar_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("conversations", sa.Column("avatar_updated_by", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_conversations_avatar_updated_by_users",
        "conversations",
        "users",
        ["avatar_updated_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_conversations_avatar_updated_by_users", "conversations", type_="foreignkey")
    op.drop_column("conversations", "avatar_updated_by")
    op.drop_column("conversations", "avatar_updated_at")
    op.drop_column("conversations", "avatar_storage_key")
    op.drop_column("conversations", "avatar_url")
