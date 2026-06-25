from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.models.enums import NotificationType
from app.services.notification_service import notification_category, notification_deep_link


def _notification_route(
    notification_type: NotificationType,
    related_entity_type: str | None,
    related_entity_id: UUID | None,
) -> str | None:
    return notification_deep_link(notification_type, related_entity_type, related_entity_id)


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
    def deep_link(self) -> str | None:
        return self.route

    @computed_field  # type: ignore[prop-decorator]
    @property
    def category(self) -> str:
        return notification_category(self.notification_type, self.related_entity_type)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def entity_type(self) -> str | None:
        return self.related_entity_type

    @computed_field  # type: ignore[prop-decorator]
    @property
    def entity_id(self) -> UUID | None:
        return self.related_entity_id
