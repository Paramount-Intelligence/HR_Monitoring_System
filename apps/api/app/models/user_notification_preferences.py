import uuid
from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base


class UserNotificationPreferences(Base):
    """Per-user notification delivery preferences for web and in-app alerts."""

    __tablename__ = "user_notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    banner_mode: Mapped[str] = mapped_column(
        Enum("always", "app_open", "never", name="notification_banner_mode", native_enum=False),
        nullable=False,
        default="always",
    )
    taskbar_badge_mode: Mapped[str] = mapped_column(
        Enum("always", "app_open", "never", name="notification_taskbar_badge_mode", native_enum=False),
        nullable=False,
        default="always",
    )
    show_previews: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    outgoing_sound_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    incoming_sound_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    message_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    group_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    call_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    task_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    approval_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    attendance_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    leave_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    announcement_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    mention_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    desktop_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiet_hours_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    quiet_hours_end: Mapped[time | None] = mapped_column(Time, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id])
