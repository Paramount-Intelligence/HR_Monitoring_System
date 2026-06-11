from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CallRecordingParticipantRead(BaseModel):
    id: str
    full_name: str
    email: str
    role: str | None = None
    profile_picture_url: str | None = None


class CallRecordingUserRead(BaseModel):
    id: str
    full_name: str
    email: str
    profile_picture_url: str | None = None


class CallRecordingRead(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID = Field(validation_alias="call_session_id")
    conversation_id: uuid.UUID | None = None
    recorded_by: CallRecordingUserRead
    participants: list[CallRecordingParticipantRead] = []
    call_type: str | None = None
    recording_type: str
    duration_seconds: int | None = None
    file_size_bytes: int
    status: str
    mime_type: str
    file_name: str
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class CallRecordingListResponse(BaseModel):
    items: list[CallRecordingRead]
    total: int
    page: int
    page_size: int


class CallRecordingStatsRead(BaseModel):
    total_recordings: int
    today_recordings: int
    voice_recordings: int
    video_recordings: int
    failed_uploads: int
    storage_used_bytes: int


class CallRecordingUploadResponse(BaseModel):
    id: uuid.UUID
    call_session_id: uuid.UUID
    status: str
    message: str = "Recording uploaded successfully."
