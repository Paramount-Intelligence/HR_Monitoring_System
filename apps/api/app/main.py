import asyncio
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path

from app.core.config import is_unresolved_template, settings, resolve_cors_origins, validate_production_settings
from app.core.validation_errors import sanitize_validation_errors
from app.core.security_headers import SecurityHeadersMiddleware
from app.api.router import api_router
from app.db.session import SessionLocal, engine
from app.db.encoding import assert_utf8_database
from app.core.permission_seeder import seed_permissions
from app.core.bootstrapper import bootstrap_admin
from app.services.call_recording_storage import log_call_recordings_storage_config
from app.services.profile_image_storage import log_profile_image_storage_config

import subprocess
import os
import logging

logger = logging.getLogger("uvicorn.error")


def _log_vapid_config_status() -> None:
    from app.services.web_push_service import WebPushService

    values = [
        settings.vapid_public_key,
        settings.vapid_private_key,
        settings.vapid_subject,
    ]
    set_count = sum(1 for value in values if value and not is_unresolved_template(value))
    if 0 < set_count < 3:
        logger.warning(
            "[WEB_PUSH] Partial VAPID configuration — set VAPID_PUBLIC_KEY, "
            "VAPID_PRIVATE_KEY, and VAPID_SUBJECT to enable Web Push."
        )
    elif WebPushService.is_configured():
        logger.info("[WEB_PUSH] VAPID configured — Web Push delivery enabled.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed permissions and bootstrap admin on startup."""
    from app.services.realtime_bridge import set_main_event_loop, start_bridge, stop_bridge

    loop = asyncio.get_running_loop()
    set_main_event_loop(loop)
    await start_bridge()

    assert_utf8_database(engine)
    validate_production_settings(settings)
    db = SessionLocal()
    try:
        seed_permissions(db)
        bootstrap_admin(db)
    finally:
        db.close()
    
    if settings.app_env == "development":
        logger.info(
            "SMTP Config: Host=%s Port=%s configured=%s",
            settings.smtp_host,
            settings.smtp_port,
            bool(settings.smtp_user),
        )

    # Start Celery worker as a background process (Local development only)
    celery_worker = None
    if settings.app_env == "development":
        try:
            celery_worker = subprocess.Popen(
                ["python", "-m", "celery", "-A", "app.worker", "worker", "--loglevel=info", "--pool=solo"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            logger.info(f"Started Celery worker (PID: {celery_worker.pid})")
        except Exception as e:
            logger.error(f"Failed to start Celery worker: {e}")
    else:
        logger.info("Production env detected. Background Celery worker subprocess skipped.")

    cors_allowed = resolve_cors_origins(settings)
    logger.info("[CORS] allowed_origins=%s", cors_allowed)

    log_call_recordings_storage_config()
    log_profile_image_storage_config()
    _log_vapid_config_status()

    yield

    await stop_bridge()

    # Shutdown Celery worker
    if celery_worker:
        logger.info(f"Shutting down Celery worker (PID: {celery_worker.pid})...")
        celery_worker.terminate()
        try:
            celery_worker.wait(timeout=5)
        except subprocess.TimeoutExpired:
            celery_worker.kill()


app = FastAPI(
    title="Workforce Intelligence API",
    version="0.1.0",
    docs_url=None if settings.is_production() else "/docs",
    redoc_url=None if settings.is_production() else "/redoc",
    openapi_url=None if settings.is_production() else f"{settings.api_v1_prefix}/openapi.json",
    lifespan=lifespan,
)

# Standardized Error Response Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": sanitize_validation_errors(exc.errors()),
            }
        }),
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = "API_ERROR"
    if exc.status_code == 401: code = "AUTH_ERROR"
    elif exc.status_code == 403: code = "PERMISSION_ERROR"
    elif exc.status_code == 404: code = "NOT_FOUND"
    elif exc.status_code == 409: code = "CONFLICT"
    elif exc.status_code == 429: code = "RATE_LIMIT_ERROR"

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({
            "error": {
                "code": code,
                "message": str(exc.detail),
                "details": []
            }
        }),
        headers=exc.headers or {},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=jsonable_encoder({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": []
            }
        }),
    )


_cors_allowed_origins = resolve_cors_origins(settings)
logger.info("[CORS] configured allow_origins=%s", _cors_allowed_origins)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allowed_origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "Range",
        "X-Requested-With",
    ],
    expose_headers=[
        "Content-Disposition",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
    ],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to Workforce Intelligence API"}


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)

# Profile pictures are served only via profile_media router (path-validated), not raw StaticFiles.
profile_pictures_dir = Path(settings.profile_image_upload_dir)
profile_pictures_dir.mkdir(parents=True, exist_ok=True)
