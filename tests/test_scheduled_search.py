"""
Tests for Scheduled Search API endpoints.

Tests CRUD operations, validation, trigger execution, and due-search listing.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after conftest disables auth."""
    from api.main import app
    return TestClient(app)


class TestScheduledSearchApi:
    """Test suite for Scheduled Search CRUD API endpoints."""

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_list_scheduled_searches(self, mock_cls, client):
        """Test listing all scheduled searches."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_search.name = "Daily News Check"
        mock_search.notebook_id = "notebook:nb1"
        mock_search.query = "cybersecurity news"
        mock_search.engine = "newsapi"
        mock_search.interval = "daily"
        mock_search.is_active = True
        mock_search.last_run = None
        mock_search.next_run = None
        mock_search.run_count = 0
        mock_search.last_error = None
        mock_search.transformation_id = None
        mock_search.save_as_source = True
        mock_search.created = "2026-01-01T00:00:00Z"
        mock_search.updated = "2026-01-01T00:00:00Z"

        mock_cls.get_all = AsyncMock(return_value=[mock_search])

        response = client.get("/api/scheduled-searches")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "scheduled_search:ss1"
        assert data[0]["name"] == "Daily News Check"
        assert data[0]["engine"] == "newsapi"
        assert data[0]["interval"] == "daily"

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_list_scheduled_searches_by_notebook(self, mock_cls, client):
        """Test listing scheduled searches filtered by notebook_id."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss2"
        mock_search.name = "Weekly Scholar Check"
        mock_search.notebook_id = "notebook:nb2"
        mock_search.query = "quantum computing"
        mock_search.engine = "google_scholar"
        mock_search.interval = "weekly"
        mock_search.is_active = True
        mock_search.last_run = None
        mock_search.next_run = None
        mock_search.run_count = 0
        mock_search.last_error = None
        mock_search.transformation_id = None
        mock_search.save_as_source = True
        mock_search.created = "2026-01-01T00:00:00Z"
        mock_search.updated = "2026-01-01T00:00:00Z"

        mock_cls.get_by_notebook = AsyncMock(return_value=[mock_search])

        response = client.get("/api/scheduled-searches?notebook_id=notebook:nb2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["notebook_id"] == "notebook:nb2"
        mock_cls.get_by_notebook.assert_called_once_with("notebook:nb2")

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_create_scheduled_search(self, mock_cls, client):
        """Test creating a new scheduled search."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss3"
        mock_search.name = "Hourly Brave Monitor"
        mock_search.notebook_id = "notebook:nb1"
        mock_search.query = "Acme Corp security breach"
        mock_search.engine = "brave"
        mock_search.interval = "hourly"
        mock_search.is_active = True
        mock_search.last_run = None
        mock_search.next_run = datetime.now(timezone.utc)
        mock_search.run_count = 0
        mock_search.last_error = None
        mock_search.transformation_id = None
        mock_search.save_as_source = True
        mock_search.created = "2026-01-01T00:00:00Z"
        mock_search.updated = "2026-01-01T00:00:00Z"
        mock_search.save = AsyncMock()

        mock_cls.return_value = mock_search

        response = client.post(
            "/api/scheduled-searches",
            json={
                "name": "Hourly Brave Monitor",
                "notebook_id": "notebook:nb1",
                "query": "Acme Corp security breach",
                "engine": "brave",
                "interval": "hourly",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "scheduled_search:ss3"
        assert data["name"] == "Hourly Brave Monitor"
        assert data["engine"] == "brave"
        assert data["interval"] == "hourly"
        mock_search.save.assert_called_once()

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_create_scheduled_search_invalid_interval(self, mock_cls, client):
        """Test that creating with invalid interval returns 400."""
        response = client.post(
            "/api/scheduled-searches",
            json={
                "name": "Bad Interval",
                "notebook_id": "notebook:nb1",
                "query": "test query",
                "engine": "brave",
                "interval": "every_5_minutes",
            },
        )
        assert response.status_code == 400
        assert "Invalid interval" in response.json()["detail"]

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_create_scheduled_search_invalid_engine(self, mock_cls, client):
        """Test that creating with invalid engine returns 400."""
        response = client.post(
            "/api/scheduled-searches",
            json={
                "name": "Bad Engine",
                "notebook_id": "notebook:nb1",
                "query": "test query",
                "engine": "bing",
                "interval": "daily",
            },
        )
        assert response.status_code == 400
        assert "Invalid engine" in response.json()["detail"]

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_create_scheduled_search_all_valid_engines(self, mock_cls, client):
        """Test that all supported engines are accepted."""
        valid_engines = ["valyu", "perplexity", "tavily", "newsapi", "google_scholar", "brave", "hybrid"]
        for engine in valid_engines:
            mock_search = MagicMock()
            mock_search.id = f"scheduled_search:ss_{engine}"
            mock_search.name = f"{engine} search"
            mock_search.notebook_id = "notebook:nb1"
            mock_search.query = "test"
            mock_search.engine = engine
            mock_search.interval = "daily"
            mock_search.is_active = True
            mock_search.last_run = None
            mock_search.next_run = None
            mock_search.run_count = 0
            mock_search.last_error = None
            mock_search.transformation_id = None
            mock_search.save_as_source = True
            mock_search.created = "2026-01-01T00:00:00Z"
            mock_search.updated = "2026-01-01T00:00:00Z"
            mock_search.save = AsyncMock()
            mock_cls.return_value = mock_search

            response = client.post(
                "/api/scheduled-searches",
                json={
                    "name": f"{engine} search",
                    "notebook_id": "notebook:nb1",
                    "query": "test",
                    "engine": engine,
                    "interval": "daily",
                },
            )
            assert response.status_code == 201, f"Engine '{engine}' should be accepted but got {response.status_code}"

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_get_scheduled_search(self, mock_cls, client):
        """Test fetching a specific scheduled search by ID."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_search.name = "My Search"
        mock_search.notebook_id = "notebook:nb1"
        mock_search.query = "test query"
        mock_search.engine = "tavily"
        mock_search.interval = "monthly"
        mock_search.is_active = True
        mock_search.last_run = None
        mock_search.next_run = None
        mock_search.run_count = 0
        mock_search.last_error = None
        mock_search.transformation_id = None
        mock_search.save_as_source = True
        mock_search.created = "2026-01-01T00:00:00Z"
        mock_search.updated = "2026-01-01T00:00:00Z"

        mock_cls.get = AsyncMock(return_value=mock_search)

        response = client.get("/api/scheduled-searches/scheduled_search:ss1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "scheduled_search:ss1"
        assert data["interval"] == "monthly"

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_get_scheduled_search_not_found(self, mock_cls, client):
        """Test 404 when scheduled search doesn't exist."""
        mock_cls.get = AsyncMock(return_value=None)

        response = client.get("/api/scheduled-searches/scheduled_search:nonexistent")
        assert response.status_code == 404

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_update_scheduled_search(self, mock_cls, client):
        """Test updating a scheduled search."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_search.name = "Old Name"
        mock_search.notebook_id = "notebook:nb1"
        mock_search.query = "old query"
        mock_search.engine = "tavily"
        mock_search.interval = "daily"
        mock_search.is_active = True
        mock_search.last_run = None
        mock_search.next_run = None
        mock_search.run_count = 0
        mock_search.last_error = None
        mock_search.transformation_id = None
        mock_search.save_as_source = True
        mock_search.created = "2026-01-01T00:00:00Z"
        mock_search.updated = "2026-01-01T00:00:00Z"
        mock_search.save = AsyncMock()
        mock_search.compute_next_run = MagicMock(return_value=datetime.now(timezone.utc))

        mock_cls.get = AsyncMock(return_value=mock_search)

        response = client.put(
            "/api/scheduled-searches/scheduled_search:ss1",
            json={
                "name": "Updated Name",
                "query": "updated query",
                "interval": "weekly",
            },
        )
        assert response.status_code == 200
        assert mock_search.name == "Updated Name"
        assert mock_search.query == "updated query"
        assert mock_search.interval == "weekly"
        mock_search.save.assert_called_once()

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_update_scheduled_search_invalid_interval(self, mock_cls, client):
        """Test that updating with invalid interval returns 400."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_cls.get = AsyncMock(return_value=mock_search)

        response = client.put(
            "/api/scheduled-searches/scheduled_search:ss1",
            json={"interval": "biweekly"},
        )
        assert response.status_code == 400

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_update_scheduled_search_invalid_engine(self, mock_cls, client):
        """Test that updating with invalid engine returns 400."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_cls.get = AsyncMock(return_value=mock_search)

        response = client.put(
            "/api/scheduled-searches/scheduled_search:ss1",
            json={"engine": "yahoo"},
        )
        assert response.status_code == 400

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_delete_scheduled_search(self, mock_cls, client):
        """Test deleting a scheduled search."""
        mock_search = MagicMock()
        mock_search.id = "scheduled_search:ss1"
        mock_search.name = "To Delete"
        mock_search.delete = AsyncMock()

        mock_cls.get = AsyncMock(return_value=mock_search)

        response = client.delete("/api/scheduled-searches/scheduled_search:ss1")
        assert response.status_code == 200
        assert "deleted" in response.json()["message"]
        mock_search.delete.assert_called_once()

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_delete_scheduled_search_not_found(self, mock_cls, client):
        """Test 404 when deleting nonexistent search."""
        mock_cls.get = AsyncMock(return_value=None)

        response = client.delete("/api/scheduled-searches/scheduled_search:nonexistent")
        assert response.status_code == 404


class TestScheduledSearchTriggerApi:
    """Test suite for manual trigger and batch execution endpoints."""

    @patch("api.routers.scheduled_search.ScheduledSearch")
    def test_trigger_not_found(self, mock_cls, client):
        """Test 404 when triggering nonexistent search."""
        mock_cls.get = AsyncMock(return_value=None)

        response = client.post("/api/scheduled-searches/scheduled_search:nonexistent/run")
        assert response.status_code == 404


class TestScheduledSearchDomainModel:
    """Test suite for the ScheduledSearch domain model logic."""

    def test_compute_next_run_daily(self):
        """Test next run computation for daily interval."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="brave",
            interval="daily",
        )
        # Without last_run, should be ~now + 1 day
        next_run = search.compute_next_run()
        assert next_run > datetime.now(timezone.utc)

    def test_compute_next_run_hourly(self):
        """Test next run computation for hourly interval."""
        from open_notebook.domain.scheduled_search import ScheduledSearch
        from datetime import timedelta

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="newsapi",
            interval="hourly",
        )
        now = datetime.now(timezone.utc)
        search.last_run = now - timedelta(hours=2)
        next_run = search.compute_next_run()
        # Should be last_run + 1 hour, which is 1 hour ago
        assert next_run < now

    def test_compute_next_run_weekly(self):
        """Test next run computation for weekly interval."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="google_scholar",
            interval="weekly",
        )
        now = datetime.now(timezone.utc)
        search.last_run = now
        next_run = search.compute_next_run()
        expected_delta = (next_run - now).days
        assert expected_delta == 7

    def test_compute_next_run_monthly(self):
        """Test next run computation for monthly interval."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="valyu",
            interval="monthly",
        )
        now = datetime.now(timezone.utc)
        search.last_run = now
        next_run = search.compute_next_run()
        expected_delta = (next_run - now).days
        assert expected_delta == 30

    def test_interval_deltas_all_present(self):
        """Verify all supported intervals have delta mappings."""
        from open_notebook.domain.scheduled_search import INTERVAL_DELTAS

        expected_intervals = {"hourly", "daily", "weekly", "monthly"}
        assert set(INTERVAL_DELTAS.keys()) == expected_intervals

    @pytest.mark.anyio
    @patch("open_notebook.domain.base.ObjectModel.save", new_callable=AsyncMock)
    async def test_mark_success(self, mock_save):
        """Test mark_success updates fields correctly."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="brave",
            interval="daily",
            run_count=3,
        )

        await search.mark_success()

        assert search.run_count == 4
        assert search.last_run is not None
        assert search.next_run is not None
        assert search.last_error is None
        mock_save.assert_called_once()

    @pytest.mark.anyio
    @patch("open_notebook.domain.base.ObjectModel.save", new_callable=AsyncMock)
    async def test_mark_failure(self, mock_save):
        """Test mark_failure records error and increments count."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="brave",
            interval="daily",
            run_count=5,
        )

        await search.mark_failure("API rate limit exceeded")

        assert search.run_count == 6
        assert search.last_error == "API rate limit exceeded"
        assert search.last_run is not None
        assert search.next_run is not None
        mock_save.assert_called_once()

    @pytest.mark.anyio
    @patch("open_notebook.domain.base.ObjectModel.save", new_callable=AsyncMock)
    async def test_mark_failure_truncates_long_errors(self, mock_save):
        """Test that long error messages are truncated to 500 chars."""
        from open_notebook.domain.scheduled_search import ScheduledSearch

        search = ScheduledSearch(
            name="Test",
            notebook_id="notebook:nb1",
            query="test query",
            engine="brave",
            interval="daily",
        )

        long_error = "x" * 1000
        await search.mark_failure(long_error)

        assert len(search.last_error) == 500


class TestScheduledSearchWorker:
    """Test suite for the scheduled search execution worker."""

    @pytest.mark.anyio
    @patch("open_notebook.ai.key_provider.get_api_key", new_callable=AsyncMock)
    async def test_run_search_valyu(self, mock_get_key):
        """Test _run_search for valyu engine."""
        from open_notebook.domain.scheduled_search_worker import _run_search

        mock_get_key.return_value = "fake-valyu-key"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": True,
            "results": [
                {"title": "Result 1", "url": "https://example.com/1", "content": "Content 1"},
                {"title": "Result 2", "url": "https://example.com/2", "content": "Content 2"},
            ],
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client_instance

            results = await _run_search("valyu", "test query")

        assert len(results) == 2
        assert results[0]["title"] == "Result 1"
        assert results[0]["url"] == "https://example.com/1"

    @pytest.mark.anyio
    @patch("open_notebook.ai.key_provider.get_api_key", new_callable=AsyncMock)
    async def test_run_search_missing_key_raises(self, mock_get_key):
        """Test _run_search raises ValueError when API key is missing."""
        from open_notebook.domain.scheduled_search_worker import _run_search

        mock_get_key.return_value = None

        # Ensure env var is not set either
        import os
        old_val = os.environ.pop("NEWSAPI_KEY", None)
        try:
            with pytest.raises(ValueError, match="not configured"):
                await _run_search("newsapi", "test query")
        finally:
            if old_val is not None:
                os.environ["NEWSAPI_KEY"] = old_val

    @pytest.mark.anyio
    async def test_run_search_unsupported_engine(self):
        """Test _run_search raises for unsupported engine."""
        from open_notebook.domain.scheduled_search_worker import _run_search

        with pytest.raises(ValueError, match="Unsupported search engine"):
            await _run_search("bing", "test query")

    @pytest.mark.anyio
    async def test_execute_scheduled_search_success(self):
        """Test full execution flow with mocked search and save."""
        from open_notebook.domain.scheduled_search_worker import execute_scheduled_search

        mock_scheduled = MagicMock()
        mock_scheduled.name = "Test Search"
        mock_scheduled.engine = "brave"
        mock_scheduled.query = "test"
        mock_scheduled.notebook_id = "notebook:nb1"
        mock_scheduled.save_as_source = True
        mock_scheduled.transformation_id = None
        mock_scheduled.mark_success = AsyncMock()
        mock_scheduled.mark_failure = AsyncMock()

        with patch(
            "open_notebook.domain.scheduled_search_worker._run_search",
            new_callable=AsyncMock,
            return_value=[
                {"title": "R1", "url": "https://r1.com", "content": "Content 1"},
            ],
        ), patch(
            "open_notebook.domain.scheduled_search_worker._save_results_as_source",
            new_callable=AsyncMock,
            return_value="source:s1",
        ):
            result = await execute_scheduled_search(mock_scheduled)

        assert result["status"] == "success"
        assert result["results_count"] == 1
        assert result["source_id"] == "source:s1"
        mock_scheduled.mark_success.assert_called_once()

    @pytest.mark.anyio
    async def test_execute_scheduled_search_failure(self):
        """Test execution flow when search raises an exception."""
        from open_notebook.domain.scheduled_search_worker import execute_scheduled_search

        mock_scheduled = MagicMock()
        mock_scheduled.name = "Failing Search"
        mock_scheduled.engine = "brave"
        mock_scheduled.query = "test"
        mock_scheduled.notebook_id = "notebook:nb1"
        mock_scheduled.save_as_source = True
        mock_scheduled.transformation_id = None
        mock_scheduled.mark_success = AsyncMock()
        mock_scheduled.mark_failure = AsyncMock()

        with patch(
            "open_notebook.domain.scheduled_search_worker._run_search",
            new_callable=AsyncMock,
            side_effect=Exception("API timeout"),
        ):
            result = await execute_scheduled_search(mock_scheduled)

        assert result["status"] == "error"
        assert "API timeout" in result["message"]
        mock_scheduled.mark_failure.assert_called_once()

    @pytest.mark.anyio
    async def test_execute_scheduled_search_no_results(self):
        """Test execution flow when search returns empty results."""
        from open_notebook.domain.scheduled_search_worker import execute_scheduled_search

        mock_scheduled = MagicMock()
        mock_scheduled.name = "Empty Search"
        mock_scheduled.engine = "newsapi"
        mock_scheduled.query = "super obscure query"
        mock_scheduled.notebook_id = "notebook:nb1"
        mock_scheduled.save_as_source = True
        mock_scheduled.transformation_id = None
        mock_scheduled.mark_success = AsyncMock()

        with patch(
            "open_notebook.domain.scheduled_search_worker._run_search",
            new_callable=AsyncMock,
            return_value=[],
        ):
            result = await execute_scheduled_search(mock_scheduled)

        assert result["status"] == "success"
        assert result["results_count"] == 0
        mock_scheduled.mark_success.assert_called_once()
