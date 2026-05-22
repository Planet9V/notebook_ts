"""Tests for the QA Hardening and Production Readiness fixes."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.models import SourceCreate
from open_notebook.podcasts.models import PodcastEpisode


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


class TestSourceModelValidation:
    """Tests for validate_notebook_fields behavior in SourceCreate."""

    def test_merge_notebook_id_into_notebooks(self):
        """SourceCreate merges notebook_id into notebooks list if both are provided."""
        model = SourceCreate(
            type="text",
            content="test content",
            notebook_id="notebook:123",
            notebooks=["notebook:456"]
        )
        # notebook_id should be merged, resulting in both notebooks in the list
        assert "notebook:123" in model.notebooks
        assert "notebook:456" in model.notebooks
        assert len(model.notebooks) == 2

    def test_merge_notebook_id_when_notebooks_none(self):
        """SourceCreate converts single notebook_id to notebooks list if notebooks is None."""
        model = SourceCreate(
            type="text",
            content="test content",
            notebook_id="notebook:123",
            notebooks=None
        )
        assert model.notebooks == ["notebook:123"]

    def test_empty_notebooks_when_both_none(self):
        """SourceCreate initializes notebooks to an empty list when both fields are omitted."""
        model = SourceCreate(
            type="text",
            content="test content",
            notebook_id=None,
            notebooks=None
        )
        assert model.notebooks == []

    def test_duplicate_notebook_id_is_deduplicated(self):
        """SourceCreate does not duplicate notebook_id if it is already in notebooks."""
        model = SourceCreate(
            type="text",
            content="test content",
            notebook_id="notebook:123",
            notebooks=["notebook:123", "notebook:456"]
        )
        assert model.notebooks == ["notebook:123", "notebook:456"]


class TestNotebookSourceIdempotency:
    """Tests for add_source_to_notebook idempotency check."""

    @pytest.mark.asyncio
    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    @patch("api.routers.notebooks.Source.get", new_callable=AsyncMock)
    @patch("api.routers.notebooks.Notebook.get", new_callable=AsyncMock)
    async def test_add_source_idempotency_swapped_variables(
        self, mock_notebook_get, mock_source_get, mock_repo_query, client
    ):
        """add_source_to_notebook queries the database with the correct in/out edge direction."""
        from api.routers.notebooks import add_source_to_notebook

        mock_notebook_get.return_value = MagicMock()
        mock_source_get.return_value = MagicMock()
        
        # Mock repo_query returning an existing reference to trigger idempotency short-circuit
        mock_repo_query.return_value = [{"id": "reference:123"}]

        # Invoke the endpoint handler
        response = await add_source_to_notebook("notebook:1", "source:1")

        assert response == {"message": "Source linked to notebook successfully"}

        # Verify that repo_query was called with: in = $source_id and out = $notebook_id
        # and that the RELATE statement was NOT called because of the short-circuit.
        mock_repo_query.assert_called_once()
        query_arg = mock_repo_query.call_args[0][0]
        assert "in = $source_id" in query_arg
        assert "out = $notebook_id" in query_arg
        assert "out = $source_id" not in query_arg


class TestPodcastRouterHandling:
    """Tests for podcast API router exception mapping and error propagation."""

    @pytest.mark.asyncio
    @patch("api.routers.podcasts.PodcastService.get_episode", new_callable=AsyncMock)
    async def test_delete_podcast_404_not_masked(self, mock_get_episode, client):
        """delete_podcast_episode propagates 404 HTTPException instead of masking it as 500."""
        from api.routers.podcasts import delete_podcast_episode
        
        # mock_get_episode raises 404 HTTPException
        mock_get_episode.side_effect = HTTPException(status_code=404, detail="Episode not found")

        with pytest.raises(HTTPException) as excinfo:
            await delete_podcast_episode("episode:nonexistent")
            
        assert excinfo.value.status_code == 404
        assert excinfo.value.detail == "Episode not found"
