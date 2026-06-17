"""API docs exposure tests."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings


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
