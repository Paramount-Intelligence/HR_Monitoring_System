from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserMinimal(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class MeetingParticipantRead(BaseModel):
    id: UUID
    meeting_id: UUID
    user_id: UUID
    response_status: str
    user: UserMinimal

    model_config = ConfigDict(from_attributes=True)


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    start_at: datetime
    end_at: datetime
    meeting_link: str | None = None
    location: str | None = None
    participants: list[UUID] = Field(..., min_items=1)

    @field_validator("end_at")
    @classmethod
    def validate_end_time(cls, v: datetime, info) -> datetime:
        start = info.data.get("start_at")
        if start and v <= start:
            raise ValueError("End time must be after the start time.")
        return v

    @field_validator("meeting_link")
    @classmethod
    def validate_link(cls, v: str | None) -> str | None:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Meeting link must be a valid HTTP or HTTPS URL.")
        return v


class MeetingUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    meeting_link: str | None = None
    location: str | None = None
    participants: list[UUID] | None = None

    @field_validator("meeting_link")
    @classmethod
    def validate_link(cls, v: str | None) -> str | None:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Meeting link must be a valid HTTP or HTTPS URL.")
        return v


class MeetingRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime
    meeting_link: str | None
    location: str | None
    status: str
    organizer_id: UUID
    organizer: UserMinimal
    participants: list[MeetingParticipantRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeetingRespond(BaseModel):
    response_status: str

    @field_validator("response_status")
    @classmethod
    def validate_response_status(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ["accepted", "declined", "pending"]:
            raise ValueError("Response status must be accepted, declined, or pending.")
        return v
