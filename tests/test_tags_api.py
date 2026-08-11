from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from api.models import NodeLayoutCreate, NodeLayoutResponse, TagCreate, TagResponse
from open_notebook.database.repository import RecordID


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


class TestTagsAndNodeLayouts:
    @patch("open_notebook.database.repository.repo_query")
    def test_create_tag(self, mock_query, client):
        """Test tag creation endpoint."""
        mock_query.side_effect = [
            [],  # First call: check if exists (returns empty)
            [{"id": RecordID("tag", "tag1"), "name": "sales-service", "category_type": "sales"}]  # Second call: create returns tag
        ]
        
        response = client.post("/api/tags", json={"name": "sales-service", "category_type": "sales"})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "sales-service"
        assert data["category_type"] == "sales"
        assert "tag:" in data["id"]

    @patch("open_notebook.database.repository.repo_query")
    def test_list_tags(self, mock_query, client):
        """Test listing tags."""
        mock_query.return_value = [
            {"id": RecordID("tag", "tag1"), "name": "sales-service", "category_type": "sales"},
            {"id": RecordID("tag", "tag2"), "name": "delivery-scope", "category_type": "delivery"}
        ]
        
        response = client.get("/api/tags")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "sales-service"
        assert data[1]["name"] == "delivery-scope"

    @patch("open_notebook.database.repository.repo_query")
    def test_link_tag_to_note(self, mock_query, client):
        """Test linking a tag to a note."""
        # Note exists, Tag exists, Relate succeeds
        mock_query.side_effect = [
            [{"id": RecordID("note", "n1")}],  # note check
            [{"id": RecordID("tag", "t1")}],   # tag check
            []                                  # relate
        ]
        
        response = client.post("/api/notes/note:n1/tags/tag:t1")
        assert response.status_code == 200
        assert response.json() == {"success": True}

    @patch("open_notebook.database.repository.repo_query")
    def test_get_note_tags(self, mock_query, client):
        """Test fetching tags for a note."""
        mock_query.return_value = [
            {"id": RecordID("tag", "t1"), "name": "sales-service", "category_type": "sales"}
        ]
        
        response = client.get("/api/notes/note:n1/tags")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "sales-service"

    @patch("open_notebook.database.repository.repo_query")
    def test_save_node_layout(self, mock_query, client):
        """Test saving node layout coordinates."""
        mock_query.return_value = [
            {
                "id": RecordID("node_layout", "note_n1_sales"),
                "node_id": "note:n1",
                "x": 100.0,
                "y": 200.0,
                "view_type": "sales"
            }
        ]
        
        response = client.post(
            "/api/node-layout",
            json={"node_id": "note:n1", "x": 100.0, "y": 200.0, "view_type": "sales"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["node_id"] == "note:n1"
        assert data["x"] == 100.0
        assert data["y"] == 200.0
        assert data["view_type"] == "sales"

    @patch("open_notebook.database.repository.repo_query")
    def test_get_node_layouts(self, mock_query, client):
        """Test fetching node layouts for a view."""
        mock_query.return_value = [
            {
                "id": RecordID("node_layout", "note_n1_sales"),
                "node_id": "note:n1",
                "x": 100.0,
                "y": 200.0,
                "view_type": "sales"
            }
        ]
        
        response = client.get("/api/node-layout/sales")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["node_id"] == "note:n1"
        assert data[0]["x"] == 100.0
