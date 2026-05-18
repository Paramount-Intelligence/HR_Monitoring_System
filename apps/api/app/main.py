from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.router import api_router
from app.db.session import SessionLocal
from app.core.permission_seeder import seed_permissions
from app.core.bootstrapper import bootstrap_admin

import subprocess
import os
import logging

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed permissions and bootstrap admin on startup."""
    db = SessionLocal()
    try:
        seed_permissions(db)
        bootstrap_admin(db)
    finally:
        db.close()
    
    logger.info(f"SMTP Config: Host={settings.smtp_host}, Port={settings.smtp_port}, User={settings.smtp_user}")

    # Start Celery worker as a background process
    celery_worker = None
    try:
        celery_worker = subprocess.Popen(
            ["python", "-m", "celery", "-A", "app.worker", "worker", "--loglevel=info", "--pool=solo"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        logger.info(f"Started Celery worker (PID: {celery_worker.pid})")
    except Exception as e:
        logger.error(f"Failed to start Celery worker: {e}")

    yield

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
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
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
                "message": "Validation failed for the request data.",
                "details": exc.errors()
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
    
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({
            "error": {
                "code": code,
                "message": str(exc.detail),
                "details": []
            }
        }),
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


default_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "https://aware-harmony-production-b1c1.up.railway.app",
    "https://workforce-intelligence-os.up.railway.app",
    "https://pims-os.up.railway.app",
]
configured_cors_origins = [
    *default_cors_origins,
    settings.frontend_base_url,
    *(origin for origin in settings.cors_origins if origin != "*"),
]

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(origin for origin in configured_cors_origins if origin)),
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to Workforce Intelligence API"}


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
