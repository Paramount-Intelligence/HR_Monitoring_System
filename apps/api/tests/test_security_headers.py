"""Security headers and production docs exposure tests."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


def _build_app(app_env: str) -> FastAPI:
    cfg = Settings(app_env=app_env)
    return FastAPI(
        docs_url=None if cfg.is_production() else "/docs",
        redoc_url=None if cfg.is_production() else "/redoc",
        openapi_url=None if cfg.is_production() else "/api/v1/openapi.json",
    )


def test_openapi_available_in_development():
    client = TestClient(_build_app("development"))
    assert client.get("/api/v1/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_openapi_disabled_in_production():
    client = TestClient(_build_app("production"))
    assert client.get("/api/v1/openapi.json").status_code == 404
    assert client.get("/docs").status_code == 404


def test_main_app_security_headers_present():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert response.headers.get("X-Frame-Options") == "DENY"
