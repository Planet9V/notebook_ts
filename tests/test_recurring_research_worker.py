import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone

@pytest.fixture
def client():
    """Create test client using standard setup."""
    from api.main import app
    return TestClient(app)

class TestRecurringResearchWorker:
    """Test suite for recurring research worker loops and endpoints."""

    @pytest.mark.asyncio
    @patch("open_notebook.domain.research_item.repo_query")
    async def test_get_due_items(self, mock_repo_query):
        """Test that ResearchItem.get_due_items queries the repository correctly."""
        from open_notebook.domain.research_item import ResearchItem

        # Seed mock database results
        mock_repo_query.return_value = [
            {
                "id": "research_item:1",
                "name": "Due Recurring Task 1",
                "query": "due query 1",
                "is_recurring": True,
                "status": "active",
                "stage": "queued",
                "engine": "perplexity",
                "engines": ["perplexity"],
            },
            {
                "id": "research_item:2",
                "name": "Due Recurring Task 2",
                "query": "due query 2",
                "is_recurring": True,
                "status": "active",
                "stage": "queued",
                "engine": "perplexity",
                "engines": ["perplexity"],
            }
        ]

        due_items = await ResearchItem.get_due_items()

        assert len(due_items) == 2
        assert due_items[0].id == "research_item:1"
        assert due_items[0].name == "Due Recurring Task 1"
        assert due_items[1].id == "research_item:2"
        assert due_items[1].name == "Due Recurring Task 2"
        mock_repo_query.assert_called_once()

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("api.routers.research_items.background_run_research")
    async def test_run_due_endpoint(self, mock_background_run, mock_ri_cls, client):
        """Test that calling the POST /api/research-items/run-due endpoint triggers due research items."""
        mock_item1 = AsyncMock()
        mock_item1.id = "research_item:1"
        mock_item2 = AsyncMock()
        mock_item2.id = "research_item:2"

        mock_ri_cls.get_due_items = AsyncMock(return_value=[mock_item1, mock_item2])

        response = client.post("/api/research-items/run-due")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["count"] == 2
        assert "Triggered execution of 2 due research items" in data["message"]

        # BackgroundTasks runs tasks after the response returns, so we can assert they were scheduled
        # in the mock_background_run call.
        mock_background_run.assert_any_call("research_item:1")
        mock_background_run.assert_any_call("research_item:2")

    @pytest.mark.asyncio
    @patch("api.main.asyncio.sleep", new_callable=AsyncMock)
    @patch("open_notebook.domain.research_item.ResearchItem.get_due_items")
    @patch("api.routers.research_items.background_run_research")
    async def test_periodic_research_items_check(self, mock_background_run, mock_get_due_items, mock_sleep):
        """Test that _periodic_research_items_check triggers due items and sleeps."""
        from api.main import _periodic_research_items_check

        mock_item = AsyncMock()
        mock_item.id = "research_item:99"
        mock_get_due_items.return_value = [mock_item]

        # Prevent infinite loop by raising CancelledError after first iteration
        mock_sleep.side_effect = [None, KeyboardInterrupt]

        try:
            await _periodic_research_items_check()
        except KeyboardInterrupt:
            pass

        mock_get_due_items.assert_called()
        mock_background_run.assert_called_with("research_item:99")
