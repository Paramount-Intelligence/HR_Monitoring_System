"""CORS and production configuration tests."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core.config import (
    INSECURE_SECRET_DEFAULTS,
    Settings,
    normalize_origin,
    resolve_cors_origins,
    validate_production_settings,
)


def _settings(**overrides):
    base = {
        "app_env": "production",
        "app_secret_key": "a-very-long-random-production-secret-key",
        "bootstrap_admin_password": "StrongBootstrapPw!123",
        "frontend_base_url": "https://pimsmonitoringsystem.up.railway.app",
        "cors_origins": ["https://pimsmonitoringsystem.up.railway.app"],
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_parse_cors_origins_comma_separated():
    settings = Settings.model_validate(
        {
            "database_url": "postgresql://postgres:postgres@localhost:5432/test_db",
            "cors_origins": "https://a.example.com, https://b.example.com/,https://c.example.com",
        }
    )
    assert settings.cors_origins == [
        "https://a.example.com",
        "https://b.example.com",
        "https://c.example.com",
    ]


def test_resolve_cors_origins_uses_env_only_in_production():
    origins = resolve_cors_origins(
        _settings(
            cors_origins=[
                "https://pimsmonitoringsystem.up.railway.app",
                "https://diligent-elegance-production-52de.up.railway.app",
            ]
        )
    )
    assert "https://pimsmonitoringsystem.up.railway.app" in origins
    assert "https://diligent-elegance-production-52de.up.railway.app" in origins
    assert "https://pims-os.up.railway.app" not in origins
    assert "http://localhost:3000" not in origins


def test_resolve_cors_origins_includes_localhost_in_development():
    origins = resolve_cors_origins(
        SimpleNamespace(
            app_env="development",
            frontend_base_url="http://localhost:3002",
            cors_origins=[],
        )
    )
    assert "http://localhost:3000" in origins
    assert "http://localhost:3002" in origins


def test_validate_production_rejects_placeholder_secret():
    with pytest.raises(RuntimeError, match="APP_SECRET_KEY"):
        validate_production_settings(
            _settings(app_secret_key=next(iter(INSECURE_SECRET_DEFAULTS)))
        )


def test_validate_production_requires_frontend_and_cors():
    with pytest.raises(RuntimeError, match="FRONTEND_BASE_URL"):
        validate_production_settings(_settings(frontend_base_url="http://localhost:3000"))

    with pytest.raises(RuntimeError, match="CORS_ORIGINS must include FRONTEND_BASE_URL"):
        validate_production_settings(
            _settings(cors_origins=["https://other-frontend.example.com"])
        )


def test_cors_middleware_allows_configured_origin():
    allowed = ["https://pimsmonitoringsystem.up.railway.app"]
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed,
        allow_credentials=True,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    client = TestClient(app)
    origin = "https://pimsmonitoringsystem.up.railway.app"

    preflight = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == origin

    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_cors_middleware_rejects_unconfigured_origin():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://pimsmonitoringsystem.up.railway.app"],
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["Authorization"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    client = TestClient(app)
    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example.com"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != "https://evil.example.com"


def test_error_response_includes_cors_for_allowed_origin():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://pimsmonitoringsystem.up.railway.app"],
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["Authorization"],
    )

    @app.get("/missing")
    def missing():
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")

    client = TestClient(app)
    origin = "https://pimsmonitoringsystem.up.railway.app"
    response = client.get("/missing", headers={"Origin": origin})
    assert response.status_code == 404
    assert response.headers.get("access-control-allow-origin") == origin
