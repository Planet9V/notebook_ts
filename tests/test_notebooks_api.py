"""
TDD tests for notebooks.py router.

Tests notebook CRUD, source linking, and graph validation.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


MOCK_NOTEBOOK_DATA = {
    "id": "notebook:nb1",
    "name": "Test Notebook",
    "description": "A test notebook",
    "archived": False,
    "created": "2026-05-27T00:00:00Z",
    "updated": "2026-05-27T00:00:00Z",
    "source_count": 2,
    "note_count": 3,
    "stage": "lead",
    "client_name": "Acme Corp",
    "estimated_value": 50000.0,
    "prospect_website": "https://acme.com",
    "contacts": [],
    "crawl_failed": False,
    "suggested_contacts": [],
    "customer_id": None,
}


class TestNotebooksListAPI:
    """Test GET /api/notebooks."""

    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    def test_get_notebooks_returns_list(self, mock_repo_query, client):
        """GET /api/notebooks returns list of notebooks."""
        mock_repo_query.return_value = [MOCK_NOTEBOOK_DATA]

        response = client.get("/api/notebooks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Notebook"
        assert data[0]["source_count"] == 2

    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    def test_get_notebooks_empty(self, mock_repo_query, client):
        """GET /api/notebooks returns empty list when no notebooks."""
        mock_repo_query.return_value = []

        response = client.get("/api/notebooks")

        assert response.status_code == 200
        assert response.json() == []

    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    def test_get_notebooks_with_archived_filter(self, mock_repo_query, client):
        """GET /api/notebooks?archived=true filters by archived status."""
        archived_nb = dict(MOCK_NOTEBOOK_DATA)
        archived_nb["archived"] = True
        mock_repo_query.return_value = [MOCK_NOTEBOOK_DATA, archived_nb]

        response = client.get("/api/notebooks?archived=true")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["archived"] is True

    def test_get_notebooks_invalid_order_by(self, client):
        """GET /api/notebooks rejects invalid order_by field."""
        response = client.get("/api/notebooks?order_by=DROP TABLE")

        assert response.status_code == 400


class TestNotebooksCRUD:
    """Test notebook Create, Read, Update, Delete."""

    @patch("api.routers.notebooks.Notebook", new_callable=MagicMock)
    def test_create_notebook(self, mock_notebook_cls, client):
        """POST /api/notebooks creates a new notebook."""
        mock_nb = MagicMock()
        mock_nb.id = "notebook:new1"
        mock_nb.name = "New Notebook"
        mock_nb.description = "Desc"
        mock_nb.archived = False
        mock_nb.created = "2026-05-27T00:00:00Z"
        mock_nb.updated = "2026-05-27T00:00:00Z"
        mock_nb.stage = "lead"
        mock_nb.client_name = ""
        mock_nb.estimated_value = 0.0
        mock_nb.prospect_website = ""
        mock_nb.contacts = []
        mock_nb.crawl_failed = False
        mock_nb.suggested_contacts = []
        mock_nb.customer_id = None
        mock_nb.save = AsyncMock()
        mock_notebook_cls.return_value = mock_nb

        response = client.post("/api/notebooks", json={
            "name": "New Notebook",
            "description": "Desc"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Notebook"
        mock_nb.save.assert_called_once()

    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    def test_get_notebook_by_id(self, mock_repo_query, client):
        """GET /api/notebooks/{id} returns a single notebook."""
        mock_repo_query.return_value = [MOCK_NOTEBOOK_DATA]

        response = client.get("/api/notebooks/notebook:nb1")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Notebook"

    @patch("api.routers.notebooks.repo_query", new_callable=AsyncMock)
    def test_get_notebook_not_found(self, mock_repo_query, client):
        """GET /api/notebooks/{id} returns 404 for missing notebook."""
        mock_repo_query.return_value = []

        response = client.get("/api/notebooks/notebook:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.notebooks.Notebook", new_callable=MagicMock)
    def test_delete_notebook(self, mock_notebook_cls, client):
        """DELETE /api/notebooks/{id} deletes notebook."""
        mock_nb = MagicMock()
        mock_nb.delete = AsyncMock(return_value={
            "deleted_notes": 3,
            "deleted_sources": 1,
            "unlinked_sources": 2,
        })
        mock_notebook_cls.get = AsyncMock(return_value=mock_nb)

        response = client.delete("/api/notebooks/notebook:nb1")

        assert response.status_code == 200
        data = response.json()
        assert data["deleted_notes"] == 3

    @patch("api.routers.notebooks.Notebook", new_callable=MagicMock)
    def test_delete_notebook_not_found(self, mock_notebook_cls, client):
        """DELETE /api/notebooks/{id} returns 404 for missing notebook."""
        mock_notebook_cls.get = AsyncMock(return_value=None)

        response = client.delete("/api/notebooks/notebook:nonexistent")

        assert response.status_code == 404


class TestGraphValidation:
    """Test POST /api/graph/validate (Purdue Model validation)."""

    def test_validate_empty_graph(self, client):
        """POST /api/graph/validate returns clean result for empty graph."""
        response = client.post("/api/graph/validate", json={
            "nodes": [],
            "edges": []
        })

        assert response.status_code == 200
        data = response.json()
        assert data["violatedNodes"] == []
        assert data["violatedEdges"] == []
        assert data["threatPaths"] == []

    def test_validate_clean_graph(self, client):
        """POST /api/graph/validate returns clean result for valid topology."""
        response = client.post("/api/graph/validate", json={
            "nodes": [
                {"id": "plc1", "type": "plc", "purdueLevel": 1},
                {"id": "fw1", "type": "firewall", "purdueLevel": 3},
                {"id": "ws1", "type": "workstation", "purdueLevel": 4}
            ],
            "edges": [
                {"id": "e1", "source": "plc1", "target": "fw1"},
                {"id": "e2", "source": "fw1", "target": "ws1"}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        # No violations expected — firewall mediates
        assert len(data["threatPaths"]) == 0

    def test_validate_zone_bypass(self, client):
        """POST /api/graph/validate detects direct zone bypass."""
        response = client.post("/api/graph/validate", json={
            "nodes": [
                {"id": "plc1", "type": "plc", "purdueLevel": 1},
                {"id": "ws1", "type": "workstation", "purdueLevel": 4}
            ],
            "edges": [
                {"id": "e1", "source": "plc1", "target": "ws1"}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        # Direct Level 1 → Level 4 without firewall = violation
        assert len(data["violatedNodes"]) > 0
        assert "plc1" in data["violatedNodes"]
        assert "ws1" in data["violatedNodes"]

    def test_validate_ip_conflict(self, client):
        """POST /api/graph/validate detects IP address conflicts."""
        response = client.post("/api/graph/validate", json={
            "nodes": [
                {"id": "dev1", "type": "plc", "purdueLevel": 1, "ip_address": "10.0.1.1"},
                {"id": "dev2", "type": "plc", "purdueLevel": 1, "ip_address": "10.0.1.1"}
            ],
            "edges": []
        })

        assert response.status_code == 200
        data = response.json()
        # Same IP on two devices = conflict
        assert "dev1" in data["violatedNodes"]
        assert "dev2" in data["violatedNodes"]

    def test_validate_invalid_edge_reference(self, client):
        """POST /api/graph/validate rejects edges with non-existent nodes."""
        response = client.post("/api/graph/validate", json={
            "nodes": [
                {"id": "plc1", "type": "plc", "purdueLevel": 1}
            ],
            "edges": [
                {"id": "e1", "source": "plc1", "target": "ghost_node"}
            ]
        })

        assert response.status_code == 400
