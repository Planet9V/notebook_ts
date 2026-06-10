import json
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from open_notebook.exceptions import NotFoundError, InvalidInputError

@pytest.fixture
def client():
    """Create test client using api.main app."""
    from api.main import app
    return TestClient(app)


def create_mock_research_item(
    id="research_item:123",
    name="Test Research",
    query="What is NIST CSF?",
    stage="review_enhance",
    results_content="",
    results_summary="",
    notebook_id=None,
    customer_id=None,
    is_recurring=False,
    interval=None
):
    """Helper to create a fully-mocked ResearchItem with string properties to pass Pydantic validation."""
    mock_ri = AsyncMock()
    mock_ri.id = id
    mock_ri.name = name
    mock_ri.query = query
    mock_ri.description = ""
    mock_ri.customer_id = customer_id
    mock_ri.project_id = None
    mock_ri.notebook_id = notebook_id
    mock_ri.transformation_id = None
    mock_ri.stage = stage
    mock_ri.status = "active"
    mock_ri.engine = "perplexity"
    mock_ri.engines = ["perplexity"]
    mock_ri.formatting_instructions = ""
    mock_ri.model_id = "test-model"
    mock_ri.interval = interval
    mock_ri.is_recurring = is_recurring
    mock_ri.last_run = None
    mock_ri.next_run = None
    mock_ri.run_count = 0
    mock_ri.last_error = None
    mock_ri.results_summary = results_summary
    mock_ri.results_content = results_content
    mock_ri.save_as_source = True
    mock_ri.tags = []
    mock_ri.created = None
    mock_ri.updated = None
    mock_ri.is_deep_research = False
    mock_ri.deep_research_state = ""
    mock_ri.deep_research_events = []
    mock_ri.location_id = None
    mock_ri.category = None
    return mock_ri


class TestReviewEnhanceAPI:
    """Test suite for the Review & Enhance endpoints and functionality."""

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("open_notebook.ai.provision.provision_langchain_model")
    @patch("open_notebook.utils.text_utils.extract_text_content")
    async def test_enhance_endpoint_success(self, mock_extract, mock_provision, mock_ri_cls, client):
        """Test that the enhance endpoint successfully calls LLM and updates results_content."""
        mock_ri = create_mock_research_item(
            results_content="Original report content",
            results_summary="Original summary",
            stage="review_enhance"
        )
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Mock LLM and extract_text_content
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value="Enhanced report content")
        mock_provision.return_value = mock_llm
        mock_extract.return_value = "Enhanced report content"

        # Execute POST /api/research-items/{id}/enhance
        response = client.post(
            "/api/research-items/research_item:123/enhance",
            json={"directions": "Add details", "model_id": "test-model"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["results_content"] == "Enhanced report content"
        assert data["stage"] == "review_enhance"

        # Verify LLM was called with correct payload
        mock_provision.assert_called_once()
        mock_llm.ainvoke.assert_called_once()
        mock_ri.save.assert_called_once()

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    async def test_enhance_endpoint_missing_content(self, mock_ri_cls, client):
        """Test that enhance endpoint returns 422 if results_content is empty."""
        mock_ri = create_mock_research_item(results_content="")
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        response = client.post(
            "/api/research-items/research_item:123/enhance",
            json={"directions": "Enhance it"}
        )

        assert response.status_code == 422
        assert "No research content found" in response.json()["detail"]

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("open_notebook.domain.notebook.Note")
    @patch("api.routers.activity_emitter.emit_activity")
    async def test_approve_endpoint_success(self, mock_emit, mock_note_cls, mock_ri_cls, client):
        """Test that approve endpoint creates a Note, links it, emits activity, and sets stage to completed."""
        mock_ri = create_mock_research_item(
            results_content="Final completed research content",
            stage="review_enhance",
            notebook_id="notebook:456",
            customer_id="customer:789"
        )
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Mock Note instantiation
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note_cls.return_value = mock_note

        # Call POST /api/research-items/{id}/approve
        response = client.post("/api/research-items/research_item:123/approve")

        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "completed"

        # Verify Note was created with correct fields
        mock_note_cls.assert_called_once_with(
            title="[Research] Test Research",
            content="Final completed research content",
            note_type="ai"
        )
        mock_note.save.assert_called_once()
        mock_note.add_to_notebook.assert_called_once_with("notebook:456")

        # Verify activity log event emitted
        mock_emit.assert_called_once_with(
            customer_id="customer:789",
            activity_type="note_added",
            description="AI Research note '[Research] Test Research' added",
            metadata={"note_id": "note:abc123", "research_item_id": "research_item:123", "notebook_id": "notebook:456"}
        )

        # Verify research item saved
        mock_ri.save.assert_called_once()

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("api.routers.research_items.approve_research_item")
    async def test_update_endpoint_triggers_approval_on_completed(self, mock_approve, mock_ri_cls, client):
        """Test that transitioning stage to completed via PUT triggers the approval note creation flow."""
        mock_ri = create_mock_research_item(stage="review_enhance")
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Mock approve_research_item
        async def mock_approve_impl(ri):
            ri.stage = "completed"
            return ri
        mock_approve.side_effect = mock_approve_impl

        # Call PUT /api/research-items/{id}
        response = client.put(
            "/api/research-items/research_item:123",
            json={"stage": "completed"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "completed"

        # Verify approve_research_item was called
        mock_approve.assert_called_once_with(mock_ri)

    @pytest.mark.asyncio
    @patch("api.routers.research_items.ResearchItem")
    @patch("open_notebook.domain.notebook.Note")
    @patch("open_notebook.domain.notebook.Notebook")
    @patch("open_notebook.database.repository.repo_query")
    @patch("api.routers.activity_emitter.emit_activity")
    async def test_approve_endpoint_creates_notebook_if_missing(self, mock_emit, mock_repo_query, mock_notebook_cls, mock_note_cls, mock_ri_cls, client):
        """Test that approve endpoint creates a new Notebook if notebook_id is missing and no notebook exists."""
        mock_ri = create_mock_research_item(
            results_content="Completed research content",
            stage="review_enhance",
            notebook_id=None,
            customer_id="customer:789"
        )
        mock_ri_cls.get = AsyncMock(return_value=mock_ri)

        # Mock repo_query
        # First query for notebooks returns empty
        # Second query for customer returns name
        mock_repo_query.side_effect = [
            [], # no notebooks found
            [{"name": "Acme Corp"}] # customer name
        ]

        # Mock Notebook instantiation
        mock_notebook = AsyncMock()
        mock_notebook.id = "notebook:new123"
        mock_notebook_cls.return_value = mock_notebook

        # Mock Note instantiation
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note_cls.return_value = mock_note

        # Call POST /api/research-items/{id}/approve
        response = client.post("/api/research-items/research_item:123/approve")

        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "completed"
        assert data["notebook_id"] == "notebook:new123"

        # Verify Notebook was created with customer details
        mock_notebook_cls.assert_called_once_with(
            name="Acme Corp Workspace",
            description="Workspace for customer Acme Corp.",
            customer_id="customer:789",
            pipeline_type="sales",
            stage="lead"
        )
        mock_notebook.save.assert_called_once()

        # Verify Note was created and linked to the new notebook
        mock_note.add_to_notebook.assert_called_once_with("notebook:new123")

