"""
Tests for multi-source search engine configuration in credentials_service.

Validates that NewsAPI and Brave Search are properly
registered as providers with correct keys, modalities, and test URLs.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestSearchEngineProviderRegistration:
    """Verify search providers are correctly registered in credentials_service."""

    def test_newsapi_in_provider_env_config(self):
        """Test NewsAPI is registered with correct required keys."""
        from api.credentials_service import PROVIDER_ENV_CONFIG

        assert "newsapi" in PROVIDER_ENV_CONFIG
        assert "required" in PROVIDER_ENV_CONFIG["newsapi"]
        assert "NEWSAPI_KEY" in PROVIDER_ENV_CONFIG["newsapi"]["required"]


    def test_brave_in_provider_env_config(self):
        """Test Brave Search is registered with correct required keys."""
        from api.credentials_service import PROVIDER_ENV_CONFIG

        assert "brave" in PROVIDER_ENV_CONFIG
        assert "required" in PROVIDER_ENV_CONFIG["brave"]
        assert "BRAVE_API_KEY" in PROVIDER_ENV_CONFIG["brave"]["required"]

    def test_newsapi_modality(self):
        """Test NewsAPI has 'language' modality."""
        from api.credentials_service import PROVIDER_MODALITIES

        assert "newsapi" in PROVIDER_MODALITIES
        assert "language" in PROVIDER_MODALITIES["newsapi"]


    def test_brave_modality(self):
        """Test Brave Search has 'language' modality."""
        from api.credentials_service import PROVIDER_MODALITIES

        assert "brave" in PROVIDER_MODALITIES
        assert "language" in PROVIDER_MODALITIES["brave"]

    @pytest.mark.anyio
    async def test_newsapi_model_discovery(self):
        """Test NewsAPI returns static models via discover_with_config."""
        from api.credentials_service import discover_with_config

        models = await discover_with_config("newsapi", {"api_key": "fake-key"})
        assert len(models) >= 1
        assert any(m["name"] == "newsapi-search" for m in models)


    @pytest.mark.anyio
    async def test_brave_model_discovery(self):
        """Test Brave Search returns static models via discover_with_config."""
        from api.credentials_service import discover_with_config

        models = await discover_with_config("brave", {"api_key": "fake-key"})
        assert len(models) >= 1
        assert any(m["name"] == "brave-search" for m in models)

    @pytest.mark.anyio
    async def test_model_discovery_no_key_returns_empty(self):
        """Test that discovery with no API key returns empty list."""
        from api.credentials_service import discover_with_config

        for provider in ["newsapi", "brave"]:
            models = await discover_with_config(provider, {})
            assert models == [], f"{provider} should return empty list without API key"


class TestSearchEngineModels:
    """Verify Pydantic models include multi-source search engine types."""

    def test_research_request_engine_field(self):
        """Test ResearchRequest model accepts all engine values."""
        from api.models import ResearchRequest

        for engine in ["local", "perplexity", "hybrid"]:
            req = ResearchRequest(query="test query", engine=engine)
            assert req.engine == engine

    def test_scheduled_search_create_fields(self):
        """Test ScheduledSearchCreate has all required fields."""
        from api.models import ScheduledSearchCreate

        req = ScheduledSearchCreate(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="newsapi",
            interval="daily",
        )
        assert req.name == "Test"
        assert req.engine == "newsapi"
        assert req.interval == "daily"
        assert req.save_as_source is True  # default

    def test_scheduled_search_create_defaults(self):
        """Test ScheduledSearchCreate default values."""
        from api.models import ScheduledSearchCreate

        req = ScheduledSearchCreate(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
        )
        assert req.engine == "hybrid"
        assert req.interval == "daily"
        assert req.save_as_source is True
        assert req.transformation_id is None

    def test_scheduled_search_update_partial(self):
        """Test ScheduledSearchUpdate allows partial updates."""
        from api.models import ScheduledSearchUpdate

        update = ScheduledSearchUpdate(name="New Name")
        data = update.model_dump(exclude_unset=True)
        assert data == {"name": "New Name"}

    def test_scheduled_search_response_model(self):
        """Test ScheduledSearchResponse has all expected fields."""
        from api.models import ScheduledSearchResponse

        resp = ScheduledSearchResponse(
            id="scheduled_search:ss1",
            name="Test",
            notebook_id="notebook:nb1",
            query="test",
            engine="brave",
            interval="weekly",
            is_active=True,
            last_run=None,
            next_run=None,
            run_count=0,
            last_error=None,
            transformation_id=None,
            save_as_source=True,
            created="2026-01-01T00:00:00Z",
            updated="2026-01-01T00:00:00Z",
        )
        assert resp.id == "scheduled_search:ss1"
        assert resp.engine == "brave"
        assert resp.run_count == 0


class TestMainRouterRegistration:
    """Test that scheduled_search router is properly registered in the FastAPI app."""

    def test_scheduled_search_routes_registered(self):
        """Verify scheduled search API routes exist in the app."""
        from api.main import app

        route_paths = [route.path for route in app.routes]
        assert "/api/scheduled-searches" in route_paths or any(
            "/api/scheduled-searches" in str(p) for p in route_paths
        )
