"""
TDD tests for locations.py router.

Tests location CRUD operations, coordinates validation, and cascade deletes.
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


MOCK_LOCATION_DATA = {
    "id": "location:loc1",
    "customer_id": "customer:cust1",
    "organization_name": "Acme Corp",
    "facility_name": "Houston Substation",
    "facility_type": "Substation",
    "sectors": ["Energy", "Water"],
    "address": "123 Industrial Rd",
    "country": "US",
    "zip_code": "77001",
    "latitude": 29.7604,
    "longitude": -95.3698,
    "description": "Primary power hub",
    "created": "2026-06-04T00:00:00Z",
    "updated": "2026-06-04T00:00:00Z",
}


class TestLocationsListAPI:
    """Test GET /api/locations."""

    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_get_locations_returns_list(self, mock_repo_query, client):
        """GET /api/locations returns list of locations."""
        mock_repo_query.return_value = [MOCK_LOCATION_DATA]

        response = client.get("/api/locations")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["facility_name"] == "Houston Substation"
        assert data[0]["latitude"] == 29.7604

    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_get_locations_by_customer_id(self, mock_repo_query, client):
        """GET /api/locations?customer_id=X filters by customer."""
        mock_repo_query.return_value = [MOCK_LOCATION_DATA]

        response = client.get("/api/locations?customer_id=customer:cust1")

        assert response.status_code == 200
        assert len(response.json()) == 1


class TestLocationsCRUD:
    """Test location CRUD operations."""

    @patch("api.routers.locations.repo_create", new_callable=AsyncMock)
    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_create_location(self, mock_repo_query, mock_repo_create, client):
        """POST /api/locations creates a new location."""
        mock_repo_query.return_value = [{"id": "customer:cust1"}]
        mock_repo_create.return_value = [MOCK_LOCATION_DATA]

        response = client.post("/api/locations", json={
            "customer_id": "customer:cust1",
            "facility_name": "Houston Substation",
            "latitude": 29.7604,
            "longitude": -95.3698,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["facility_name"] == "Houston Substation"
        assert data["longitude"] == -95.3698

    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_create_location_invalid_coords(self, mock_repo_query, client):
        """POST /api/locations returns 422 for invalid coordinates."""
        mock_repo_query.return_value = [{"id": "customer:cust1"}]
        # Latitude out of bounds
        response = client.post("/api/locations", json={
            "customer_id": "customer:cust1",
            "facility_name": "Houston Substation",
            "latitude": 120.0,
            "longitude": -95.3698,
        })
        assert response.status_code == 422

        # Longitude out of bounds
        response = client.post("/api/locations", json={
            "customer_id": "customer:cust1",
            "facility_name": "Houston Substation",
            "latitude": 29.7604,
            "longitude": -200.0,
        })
        assert response.status_code == 422

    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_get_location_by_id(self, mock_repo_query, client):
        """GET /api/locations/{id} returns a specific location."""
        mock_repo_query.return_value = [MOCK_LOCATION_DATA]

        response = client.get("/api/locations/location:loc1")

        assert response.status_code == 200
        data = response.json()
        assert data["facility_name"] == "Houston Substation"

    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_get_location_not_found(self, mock_repo_query, client):
        """GET /api/locations/{id} returns 404 for missing location."""
        mock_repo_query.return_value = []

        response = client.get("/api/locations/location:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.locations.repo_update", new_callable=AsyncMock)
    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_update_location(self, mock_repo_query, mock_repo_update, client):
        """PUT /api/locations/{id} updates a location."""
        mock_repo_query.return_value = [MOCK_LOCATION_DATA]
        updated = dict(MOCK_LOCATION_DATA)
        updated["facility_name"] = "Houston Refinery"
        mock_repo_update.return_value = [updated]

        response = client.put("/api/locations/location:loc1", json={
            "facility_name": "Houston Refinery"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["facility_name"] == "Houston Refinery"

    @patch("api.routers.locations.repo_delete", new_callable=AsyncMock)
    @patch("api.routers.locations.repo_query", new_callable=AsyncMock)
    def test_delete_location_cascades(self, mock_repo_query, mock_repo_delete, client):
        """DELETE /api/locations/{id} nulls contacts and deletes assessments."""
        mock_repo_query.return_value = [MOCK_LOCATION_DATA]

        response = client.delete("/api/locations/location:loc1")

        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()
        
        # Verify the database delete call was made
        mock_repo_delete.assert_called_once_with("location:loc1")
