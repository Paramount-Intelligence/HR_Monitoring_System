"""Auth routes: login, refresh, logout."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user, get_db, get_user_permissions,
    limit_activation
)
from app.models.user import User
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest, LoginResponse, RefreshRequest, RefreshResponse,
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest,
    ActivateAccountRequest, WsTicketResponse, LogoutRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/activate-account",
    summary="Activate account using invitation token",
    dependencies=[Depends(limit_activation)]
)
def activate_account(
    payload: ActivateAccountRequest,
    db: Session = Depends(get_db)
) -> dict[str, str]:
    success = AuthService(db).activate_account(payload.token, payload.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token"
        )
    return {"message": "Account activated successfully. You can now log in."}


@router.post("/login", response_model=LoginResponse, summary="Authenticate and get tokens")
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    return AuthService(db).login(payload, request=request)


@router.post("/refresh", response_model=RefreshResponse, summary="Rotate access and refresh tokens")
def refresh(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> RefreshResponse:
    return AuthService(db).refresh(payload.refresh_token, request=request)


@router.post("/logout", summary="Logout and revoke refresh token")
def logout(
    payload: LogoutRequest | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict[str, str]:
    refresh_token = payload.refresh_token if payload else None
    AuthService(db).logout(str(actor.id), refresh_token=refresh_token)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse, summary="Request password reset")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    token = AuthService(db).request_password_reset(payload.email, request=request)
    return ForgotPasswordResponse(
        message="If an account with this email exists, a reset link has been sent.",
        debug_token=token if settings.app_env == "development" else None
    )


@router.post("/reset-password", summary="Reset password using token")
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    success = AuthService(db).reset_password(payload.token, payload.new_password, request=request)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    return {"message": "Password reset successful"}


@router.post("/ws-ticket", response_model=WsTicketResponse, summary="Issue a short-lived WebSocket connection ticket")
def issue_ws_ticket(actor: User = Depends(get_current_user)) -> WsTicketResponse:
    from app.services.ws_ticket_service import issue_ws_ticket as create_ticket

    ticket, expires_in = create_ticket(actor.id)
    return WsTicketResponse(ticket=ticket, expires_in=expires_in)


@router.get("/me/permissions", summary="Get current user's resolved permissions")
def get_my_permissions(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user)
) -> dict:
    perms = get_user_permissions(actor, db)
    return {
        "user_id": str(actor.id),
        "role": actor.role.value,
        "permissions": sorted(list(perms))
    }
