"""
TDD tests for config.py router.

Tests version checking, database health, and config endpoint.
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


class TestConfigAPI:
    """Test GET /api/config."""

    @patch("api.routers.config.check_database_health", new_callable=AsyncMock)
    @patch("api.routers.config.get_latest_version_cached", new_callable=AsyncMock)
    @patch("api.routers.config.get_version")
    def test_get_config(self, mock_version, mock_latest, mock_db_health, client):
        """GET /api/config returns version and db status."""
        mock_version.return_value = "1.0.0"
        mock_latest.return_value = ("1.1.0", True)
        mock_db_health.return_value = {"status": "online"}

        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "1.0.0"
        assert data["latestVersion"] == "1.1.0"
        assert data["hasUpdate"] is True
        assert data["dbStatus"] == "online"

    @patch("api.routers.config.check_database_health", new_callable=AsyncMock)
    @patch("api.routers.config.get_latest_version_cached", new_callable=AsyncMock)
    @patch("api.routers.config.get_version")
    def test_get_config_db_offline(self, mock_version, mock_latest, mock_db_health, client):
        """GET /api/config reports db offline status."""
        mock_version.return_value = "1.0.0"
        mock_latest.return_value = (None, False)
        mock_db_health.return_value = {"status": "offline", "error": "Connection refused"}

        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        assert data["dbStatus"] == "offline"

    @patch("api.routers.config.check_database_health", new_callable=AsyncMock)
    @patch("api.routers.config.get_latest_version_cached", new_callable=AsyncMock)
    @patch("api.routers.config.get_version")
    def test_get_config_version_check_failure(self, mock_version, mock_latest, mock_db_health, client):
        """GET /api/config still works when version check fails."""
        mock_version.return_value = "1.0.0"
        mock_latest.side_effect = Exception("Network error")
        mock_db_health.return_value = {"status": "online"}

        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        # Version check failure is handled gracefully
        assert data["version"] == "1.0.0"
        assert data["hasUpdate"] is False


class TestVersionUtils:
    """Test version utility functions."""

    def test_get_version_reads_pyproject(self):
        """get_version reads from pyproject.toml."""
        from api.routers.config import get_version
        version = get_version()
        # Should return a valid version string
        assert version != "unknown"
        assert "." in version  # e.g., "1.0.0"
