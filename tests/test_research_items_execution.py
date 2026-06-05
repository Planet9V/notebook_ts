import json
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from fastapi import BackgroundTasks


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


class TestResearchItemsExecution:
    """Test suite for Research Items Execution and Note creation."""

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("api.routers.research_items.background_run_research")
    async def test_execute_research_endpoint(self, mock_background_run, mock_ri_cls, client):
        """Test that calling execute_research endpoint updates stage and spawns background task."""
        mock_ri = AsyncMock()
        mock_ri.id = "research_item:123"
        mock_ri.name = "Test Research"
        mock_ri.query = "What is NIST CSF?"
        mock_ri.engine = "perplexity"
        mock_ri.engines = ["perplexity"]
        mock_ri.stage = "queued"
        mock_ri.notebook_id = "notebook:456"
        mock_ri.customer_id = "customer:789"
        mock_ri.formatting_instructions = ""
        mock_ri.model_id = None
        mock_ri.transformation_id = None
        mock_ri.save_as_source = True
        
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Execute endpoint call
        response = client.post("/api/research-items/research_item:123/execute")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "executing"
        
        # Verify background task was scheduled and research item stage updated
        assert mock_ri.stage == "researching"
        mock_ri.save.assert_called()
        mock_background_run.assert_called_once_with("research_item:123")

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("api.routers.search.stream_research_response")
    async def test_background_run_research_saves_to_review_enhance(self, mock_stream, mock_ri_cls):
        """Test that the background task fetches data, updates content, and sets stage to review_enhance."""
        from api.routers.research_items import background_run_research

        # Setup research item mock
        mock_ri = AsyncMock()
        mock_ri.id = "research_item:123"
        mock_ri.name = "Test Research"
        mock_ri.query = "What is NIST CSF?"
        mock_ri.engine = "perplexity"
        mock_ri.engines = ["perplexity"]
        mock_ri.notebook_id = "notebook:456"
        mock_ri.customer_id = "customer:789"
        mock_ri.formatting_instructions = ""
        mock_ri.model_id = None
        mock_ri.transformation_id = None
        mock_ri.save_as_source = True
        
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Mock stream_research_response generator
        async def mock_generator(*args, **kwargs):
            yield 'data: {"type": "answer", "content": "NIST CSF provides guidelines "}\n\n'
            yield 'data: {"type": "answer", "content": "for cybersecurity risk management."}\n\n'
            yield 'data: {"type": "final_answer", "content": "NIST CSF provides guidelines for cybersecurity risk management."}\n\n'

        mock_stream.return_value = mock_generator()

        # Call the background task directly
        await background_run_research("research_item:123")

        # Verify stream was consumed
        mock_stream.assert_called_once()

        # Verify results_content was saved
        assert mock_ri.results_content == "NIST CSF provides guidelines for cybersecurity risk management."
        assert mock_ri.stage == "review_enhance"
        assert mock_ri.results_summary == "NIST CSF provides guidelines for cybersecurity risk management."
        mock_ri.save.assert_called_once()
