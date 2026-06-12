from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, computed_field
from app.models.enums import NotificationType


def _notification_route(
    notification_type: NotificationType,
    related_entity_type: str | None,
    related_entity_id: UUID | None,
) -> str | None:
    nt = notification_type.value if hasattr(notification_type, "value") else str(notification_type)
    if nt.startswith("meeting") or related_entity_type == "meeting":
        return "/calendar"
    if nt in ("message", "mention") or related_entity_type == "conversation":
        return "/messages"
    if nt in ("support_ticket", "support_reply") or related_entity_type == "support_ticket":
        return "/help-support"
    if related_entity_type == "task" or nt in ("task_comment",):
        return "/admin/tasks"
    if related_entity_type == "announcement":
        return "/admin/announcements"
    if nt == "eod_feedback":
        return "/manager/eod-reviews"
    return None


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: NotificationType
    related_entity_type: str | None = None
    related_entity_id: UUID | None = None
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def route(self) -> str | None:
        return _notification_route(
            self.notification_type, self.related_entity_type, self.related_entity_id
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def entity_type(self) -> str | None:
        return self.related_entity_type

    @computed_field  # type: ignore[prop-decorator]
    @property
    def entity_id(self) -> UUID | None:
        return self.related_entity_id
