from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for activities API."""
    from api.main import app

    return TestClient(app)


class TestActivitiesAPI:
    """Test suite for Activity API endpoints."""

    def test_get_activity_types(self, client):
        """Test GET /api/activities/types returns valid types list."""
        response = client.get("/api/activities/types")
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert "notebook_created" in data["types"]
        assert "contact_added" in data["types"]

    @patch("api.routers.activities.repo_query")
    def test_get_activities_success(self, mock_repo_query, client):
        """Test GET /api/activities lists customer activities successfully."""
        mock_activities = [
            {
                "id": "activity:1",
                "customer_id": "customer:1",
                "activity_type": "notebook_created",
                "description": "Notebook 'Secops' created",
                "metadata": {"notebook_id": "notebook:1"},
                "actor": "system",
                "created": "2026-06-04T12:00:00Z",
                "updated": "2026-06-04T12:00:00Z",
            }
        ]
        mock_repo_query.return_value = mock_activities

        response = client.get("/api/activities?customer_id=customer:1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "activity:1"
        assert data[0]["activity_type"] == "notebook_created"
        assert data[0]["metadata"]["notebook_id"] == "notebook:1"

    @patch("api.routers.activities.repo_create")
    def test_create_activity_success(self, mock_repo_create, client):
        """Test POST /api/activities creates a new activity."""
        mock_repo_create.return_value = {
            "id": "activity:new123",
            "customer_id": "customer:1",
            "activity_type": "custom",
            "description": "Manual outreach logged",
            "metadata": {"channel": "phone"},
            "actor": "user:admin",
            "created": "2026-06-04T12:30:00Z",
            "updated": "2026-06-04T12:30:00Z",
        }

        response = client.post(
            "/api/activities",
            json={
                "customer_id": "customer:1",
                "activity_type": "custom",
                "description": "Manual outreach logged",
                "metadata": {"channel": "phone"},
                "actor": "user:admin"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "activity:new123"
        assert data["activity_type"] == "custom"
        assert data["actor"] == "user:admin"
        assert data["metadata"]["channel"] == "phone"
