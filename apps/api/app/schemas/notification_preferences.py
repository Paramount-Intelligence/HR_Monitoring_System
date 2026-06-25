from datetime import time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

BannerMode = Literal["always", "app_open", "never"]
TaskbarBadgeMode = Literal["always", "app_open", "never"]

BANNER_MODES = frozenset({"always", "app_open", "never"})
TASKBAR_BADGE_MODES = frozenset({"always", "app_open", "never"})


class NotificationPreferencesRead(BaseModel):
    """Safe notification preferences DTO — no internal user or row identifiers."""

    banner_mode: BannerMode = "always"
    taskbar_badge_mode: TaskbarBadgeMode = "always"
    show_previews: bool = True
    outgoing_sound_enabled: bool = False
    incoming_sound_enabled: bool = True
    message_notifications_enabled: bool = True
    group_notifications_enabled: bool = True
    call_notifications_enabled: bool = True
    task_notifications_enabled: bool = True
    approval_notifications_enabled: bool = True
    attendance_notifications_enabled: bool = True
    leave_notifications_enabled: bool = True
    announcement_notifications_enabled: bool = True
    mention_notifications_enabled: bool = True
    desktop_notifications_enabled: bool = False
    quiet_hours_enabled: bool = False
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferencesUpdate(BaseModel):
    banner_mode: BannerMode | None = None
    taskbar_badge_mode: TaskbarBadgeMode | None = None
    show_previews: bool | None = None
    outgoing_sound_enabled: bool | None = None
    incoming_sound_enabled: bool | None = None
    message_notifications_enabled: bool | None = None
    group_notifications_enabled: bool | None = None
    call_notifications_enabled: bool | None = None
    task_notifications_enabled: bool | None = None
    approval_notifications_enabled: bool | None = None
    attendance_notifications_enabled: bool | None = None
    leave_notifications_enabled: bool | None = None
    announcement_notifications_enabled: bool | None = None
    mention_notifications_enabled: bool | None = None
    desktop_notifications_enabled: bool | None = None
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None

    @field_validator("banner_mode")
    @classmethod
    def validate_banner_mode(cls, value: str | None) -> str | None:
        if value is not None and value not in BANNER_MODES:
            raise ValueError(f"banner_mode must be one of: {', '.join(sorted(BANNER_MODES))}")
        return value

    @field_validator("taskbar_badge_mode")
    @classmethod
    def validate_taskbar_badge_mode(cls, value: str | None) -> str | None:
        if value is not None and value not in TASKBAR_BADGE_MODES:
            raise ValueError(
                f"taskbar_badge_mode must be one of: {', '.join(sorted(TASKBAR_BADGE_MODES))}"
            )
        return value


class WebPushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., min_length=10)
    p256dh: str = Field(..., min_length=10)
    auth: str = Field(..., min_length=10)
    user_agent: str | None = Field(None, max_length=512)


class WebPushPublicKeyRead(BaseModel):
    public_key: str | None
    configured: bool


class WebPushTestResult(BaseModel):
    configured: bool
    message: str | None = None
    subscriptions: int = 0
    attempted: int = 0
    sent: int = 0
    failed: int = 0
