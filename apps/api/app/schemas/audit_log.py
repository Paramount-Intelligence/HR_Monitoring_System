from uuid import UUID
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import AuditAction, RelatedEntityType

class AuditLogRead(BaseModel):
    id: UUID
    actor_user_id: UUID = Field(alias="actor_user_id")
    action_type: AuditAction = Field(alias="action_type")
    entity_type: str 
    entity_id: UUID
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None
    extra_metadata: dict[str, Any] | None = Field(None, alias="extra_metadata")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
