"""Add user notification preferences and web push subscriptions."""
from alembic import op
import sqlalchemy as sa

revision = "h3i4j5k6l7m8"
down_revision = "g2h3i4j5k6l7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_notification_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "banner_mode",
            sa.Enum("always", "app_open", "never", name="notification_banner_mode", native_enum=False),
            nullable=False,
            server_default="always",
        ),
        sa.Column(
            "taskbar_badge_mode",
            sa.Enum("always", "app_open", "never", name="notification_taskbar_badge_mode", native_enum=False),
            nullable=False,
            server_default="always",
        ),
        sa.Column("show_previews", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("outgoing_sound_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("incoming_sound_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("message_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("group_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("call_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("task_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("approval_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("attendance_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("leave_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("announcement_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("mention_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("desktop_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("quiet_hours_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("quiet_hours_start", sa.Time(), nullable=True),
        sa.Column("quiet_hours_end", sa.Time(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_notification_preferences_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_notification_preferences")),
        sa.UniqueConstraint("user_id", name=op.f("uq_user_notification_preferences_user_id")),
    )
    op.create_index(
        "ix_user_notification_preferences_user_id",
        "user_notification_preferences",
        ["user_id"],
        unique=True,
    )

    op.create_table(
        "web_push_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_web_push_subscriptions_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_web_push_subscriptions")),
    )
    op.create_index("ix_web_push_subscriptions_user_id", "web_push_subscriptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_web_push_subscriptions_user_id", table_name="web_push_subscriptions")
    op.drop_table("web_push_subscriptions")
    op.drop_index("ix_user_notification_preferences_user_id", table_name="user_notification_preferences")
    op.drop_table("user_notification_preferences")
