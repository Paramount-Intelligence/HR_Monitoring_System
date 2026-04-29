from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from app.models.enums import AlertType, AlertSeverity, AlertStatus, AlertEmailStatus, RelatedEntityType

class AlertRead(BaseModel):
    id: UUID
    alert_type: AlertType
    severity: AlertSeverity
    recipient_user_id: UUID
    related_entity_type: RelatedEntityType
    related_entity_id: UUID
    email_status: AlertEmailStatus
    status: AlertStatus
    title: str
    message: str
    created_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
