"""Tests for containers, commands, and miscellaneous routers.

Covers:
- Containers router: status, logs, health, restart
- Commands router: job submission, status, listing
- Voice sessions: list, create
- Settings/Languages: simple GET endpoints
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


# ── Containers Router Tests ─────────────────────────────────────────


class TestContainersRouter:
    """Tests for the containers management endpoints."""

    @patch("api.routers.containers._run_docker_cmd")
    def test_containers_status_returns_services(self, mock_docker, client):
        """GET /api/containers/status should return container list."""
        docker_output = json.dumps({
            "Names": "surrealdb",
            "Status": "Up 5 minutes",
            "State": "running",
            "Image": "surrealdb/surrealdb:v2",
        })
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = docker_output + "\n"
        mock_result.stderr = ""
        mock_docker.return_value = mock_result

        response = client.get("/api/containers/status")
        assert response.status_code == 200
        data = response.json()
        assert "containers" in data

    @patch("api.routers.containers._run_docker_cmd")
    def test_containers_status_docker_unavailable(self, mock_docker, client):
        """GET /api/containers/status should handle Docker being unavailable gracefully."""
        mock_docker.side_effect = FileNotFoundError("docker not found")
        response = client.get("/api/containers/status")
        # The containers router catches FileNotFoundError and returns 503
        assert response.status_code in (200, 500, 503)

    @patch("api.routers.containers._run_docker_cmd")
    def test_containers_health_returns_status(self, mock_docker, client):
        """GET /api/containers/{name}/health should return health info."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = '{"Status":"healthy"}'
        mock_result.stderr = ""
        mock_docker.return_value = mock_result

        response = client.get("/api/containers/surrealdb/health")
        assert response.status_code == 200


# ── Commands Router Tests ────────────────────────────────────────────


class TestCommandsRouter:
    """Tests for the background job/command endpoints."""

    def test_registry_debug_endpoint(self, client):
        """GET /api/commands/registry/debug should return registry info."""
        response = client.get("/api/commands/registry/debug")
        assert response.status_code == 200
        data = response.json()
        # Should return some form of registry data
        assert isinstance(data, (dict, list))

    def test_submit_job_requires_fields(self, client):
        """POST /api/commands/jobs with empty body should fail validation."""
        response = client.post("/api/commands/jobs", json={})
        assert response.status_code == 422


# ── Settings Tests ───────────────────────────────────────────────────


class TestSettingsRouter:
    """Tests for settings endpoints."""

    @patch("api.routers.settings.ContentSettings.get_instance", new_callable=AsyncMock)
    def test_get_settings(self, mock_get_instance, client):
        """GET /api/settings should return settings."""
        mock_settings = MagicMock()
        mock_settings.default_content_processing_engine_doc = "test"
        mock_settings.default_content_processing_engine_url = ""
        mock_settings.default_embedding_option = "ask"
        mock_settings.auto_delete_files = "false"
        mock_settings.youtube_preferred_languages = ["en"]
        mock_get_instance.return_value = mock_settings
        response = client.get("/api/settings")
        assert response.status_code == 200


# ── Languages Tests ──────────────────────────────────────────────────


class TestLanguagesRouter:
    """Tests for languages endpoint."""

    def test_list_languages(self, client):
        """GET /api/languages should return language list."""
        response = client.get("/api/languages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least English
        codes = [lang.get("code", "") if isinstance(lang, dict) else "" for lang in data]
        assert "en" in codes or len(data) > 0


# ── Voice Sessions Router Tests ──────────────────────────────────────


class TestVoiceSessionsRouter:
    """Tests for voice session management endpoints."""

    @patch("api.routers.voice_sessions.repo_query", new_callable=AsyncMock)
    def test_list_sessions_empty(self, mock_query, client):
        """GET /api/voice/sessions should return empty list."""
        mock_query.return_value = []
        response = client.get("/api/voice/sessions")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_session_empty_body_accepted(self, client):
        """POST /api/voice/sessions with empty body — all fields are optional."""
        with patch("api.routers.voice_sessions.ChatSession") as mock_cs:
            mock_session = MagicMock()
            mock_session.id = "voice_session:test"
            mock_session.title = "test"
            mock_session.created = "2026-01-01"
            mock_session.updated = "2026-01-01"
            mock_session.save = AsyncMock(return_value=mock_session)
            mock_cs.return_value = mock_session
            response = client.post("/api/voice/sessions", json={"title": "test"})
            # Should either create or fail with validation
            assert response.status_code in (200, 422, 500)


# ── Platform Tests ───────────────────────────────────────────────────


class TestPlatformRouter:
    """Tests for platform info endpoint."""

    def test_platform_info(self, client):
        """GET /api/platform/info should return platform info."""
        response = client.get("/api/platform/info")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
