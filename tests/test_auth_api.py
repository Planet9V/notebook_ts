"""
TDD tests for auth.py router.

Tests:
- GET /auth/status returns auth_enabled based on env var
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for auth API."""
    from api.main import app
    return TestClient(app)


class TestAuthAPI:
    """Test suite for Authentication status endpoint."""

    @patch("api.routers.auth.get_secret_from_env")
    def test_auth_status_when_disabled(self, mock_get_secret, client):
        """GET /auth/status returns auth_enabled=false when no password set."""
        mock_get_secret.return_value = None

        response = client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["auth_enabled"] is False
        assert "disabled" in data["message"].lower()

    @patch("api.routers.auth.get_secret_from_env")
    def test_auth_status_when_enabled(self, mock_get_secret, client):
        """GET /auth/status returns auth_enabled=true when password is set."""
        mock_get_secret.return_value = "my_secret_password"

        response = client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["auth_enabled"] is True
        assert "required" in data["message"].lower()

    @patch("api.routers.auth.get_secret_from_env")
    def test_auth_status_with_empty_string(self, mock_get_secret, client):
        """GET /auth/status treats empty string as auth disabled."""
        mock_get_secret.return_value = ""

        response = client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["auth_enabled"] is False
