"""Add nullable body_html for rich message formatting."""
from alembic import op
import sqlalchemy as sa

revision = "e2f3a4b5c6d7"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("body_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "body_html")
