from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import app
    return TestClient(app)


class TestEpisodeProfilesJsonValidation:
    """Test suite for structured JSON output validation in episode profiles."""

    @pytest.mark.asyncio
    @patch("open_notebook.domain.base.repo_query")
    async def test_get_models_with_supports_json_filter(self, mock_repo_query, client):
        """Test GET /api/models?supports_json=true filters correctly."""
        # Mock models in DB
        mock_repo_query.return_value = [
            {
                "id": "model:openai_gpt4",
                "name": "gpt-4",
                "provider": "openai",
                "type": "language",
                "supported_parameters": ["response_format", "temperature"],
            },
            {
                "id": "model:unsupported_model",
                "name": "unsupported-model",
                "provider": "custom_provider",
                "type": "language",
                "supported_parameters": ["temperature"],
            },
            {
                "id": "model:openrouter_deepseek",
                "name": "deepseek/deepseek-chat",
                "provider": "openrouter",
                "type": "language",
                "supported_parameters": ["structured_outputs", "temperature"],
            }
        ]

        response = client.get("/api/models?supports_json=true")
        assert response.status_code == 200
        data = response.json()
        
        # Should include gpt-4 and deepseek, but exclude unsupported_model
        model_names = [m["name"] for m in data]
        assert "gpt-4" in model_names
        assert "deepseek/deepseek-chat" in model_names
        assert "unsupported-model" not in model_names
        assert len(data) == 2

    @pytest.mark.asyncio
    @patch("open_notebook.ai.models.Model.get")
    @patch("api.routers.episode_profiles.EpisodeProfile.save", new_callable=AsyncMock)
    async def test_create_profile_with_unsupported_outline_model(
        self, mock_save, mock_model_get, client
    ):
        """Test creating episode profile with unsupported outline model returns 400."""
        # Mock Model.get to return a model that doesn't support json
        class MockModel:
            id = "model:unsupported"
            name = "some-legacy-model"
            provider = "legacy"
            supported_parameters = ["temperature"]  # No response_format or structured_outputs

        mock_model_get.return_value = MockModel()

        response = client.post(
            "/api/episode-profiles",
            json={
                "name": "Legacy Episode Profile",
                "description": "A profile using legacy model",
                "speaker_config": "default",
                "outline_llm": "model:unsupported",
                "transcript_llm": "model:unsupported",
                "default_briefing": "Create a briefing...",
                "num_segments": 5,
            },
        )

        assert response.status_code == 400
        assert "does not support structured JSON output" in response.json()["detail"]
        mock_save.assert_not_called()

    @pytest.mark.asyncio
    @patch("open_notebook.ai.models.Model.get")
    @patch("api.routers.episode_profiles.EpisodeProfile.save", new_callable=AsyncMock)
    async def test_create_profile_with_supported_models(
        self, mock_save, mock_model_get, client
    ):
        """Test creating episode profile with supported models succeeds."""
        # Mock Model.get to return a model that supports json
        class MockModel:
            id = "model:supported"
            name = "gpt-4o"
            provider = "openai"
            supported_parameters = ["response_format"]

        mock_model_get.return_value = MockModel()

        response = client.post(
            "/api/episode-profiles",
            json={
                "name": "Modern Episode Profile",
                "description": "A profile using modern model",
                "speaker_config": "default",
                "outline_llm": "model:supported",
                "transcript_llm": "model:supported",
                "default_briefing": "Create a briefing...",
                "num_segments": 5,
            },
        )

        assert response.status_code == 200
        mock_save.assert_called_once()
