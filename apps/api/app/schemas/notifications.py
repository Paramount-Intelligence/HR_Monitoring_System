from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import NotificationType


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
