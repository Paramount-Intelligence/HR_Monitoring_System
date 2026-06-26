"""Pydantic schemas for auth endpoints."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenUser(BaseModel):
    id: str
    full_name: str
    role: str
    department: str | None = None
    designation: str | None = None
    avatar_url: str | None = None
    profile_picture_url: str | None = None
    presence_status: str = "active"
    presence_updated_at: str | None = None
    last_seen_at: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: TokenUser


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class WsTicketResponse(BaseModel):
    ticket: str
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    debug_token: str | None = None  # Remove in production


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ActivateAccountRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
