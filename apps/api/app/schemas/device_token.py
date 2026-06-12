from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeviceTokenRegister(BaseModel):
    expo_push_token: str = Field(..., min_length=10, max_length=512)
    platform: str = Field(default="unknown", max_length=32)
    device_name: str | None = Field(default=None, max_length=255)
    device_id: str | None = Field(default=None, max_length=255)
    app_version: str | None = Field(default=None, max_length=64)
    build_version: str | None = Field(default=None, max_length=64)
    environment: str = Field(default="development", max_length=32)


class DeviceTokenUnregister(BaseModel):
    expo_push_token: str | None = Field(default=None, max_length=512)


class DeviceTokenRead(BaseModel):
    id: UUID
    platform: str
    device_name: str | None = None
    environment: str
    is_active: bool
    last_seen_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
