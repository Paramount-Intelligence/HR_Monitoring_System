"""Validation error response sanitization tests."""
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)
API = settings.api_v1_prefix


def test_validation_error_does_not_echo_submitted_password():
    response = client.post(
        f"{API}/auth/login",
        json={"email": "not-an-email", "password": "SuperSecret123!"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "SuperSecret123!" not in str(body)
    assert all("input" not in detail for detail in body["error"]["details"])
