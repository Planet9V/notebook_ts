from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from open_notebook.database.repository import ensure_record_id


@pytest.fixture
def client():
    """Create test client for customers API."""
    from api.main import app

    return TestClient(app)


class TestCustomersAPI:
    """Test suite for Customer API endpoints."""

    @patch("api.routers.customers.repo_query")
    def test_get_customers_with_metrics(self, mock_repo_query, client):
        """Test GET /api/customers correctly calculates notebook metrics and compliance progress."""
        # Setup mock returns: first for customers, second for notebooks
        mock_customers = [
            {
                "id": "customer:1",
                "name": "Acme Corp",
                "website": "acme.com",
                "description": "ACME manufacturer",
                "industry": "Manufacturing",
                "contacts": [{"name": "John Doe", "email": "john@acme.com"}],
                "created": "2026-01-01T00:00:00Z",
                "updated": "2026-01-01T00:00:00Z",
            },
            {
                "id": "customer:2",
                "name": "Stark Industries",
                "website": "stark.com",
                "description": "Defense and tech",
                "industry": "Technology",
                "contacts": [],
                "created": "2026-01-02T00:00:00Z",
                "updated": "2026-01-02T00:00:00Z",
            }
        ]
        
        mock_notebooks = [
            # Associated with customer 1
            {
                "id": "notebook:1",
                "customer_id": "customer:1",
                "estimated_value": 10000.0,
                "stage": "proposal"  # 75.0%
            },
            {
                "id": "notebook:2",
                "customer_id": "customer:1",
                "estimated_value": 5000.0,
                "stage": "lead"  # 15.0%
            },
            # Associated with customer 2 (no estimated value, different stage)
            {
                "id": "notebook:3",
                "customer_id": "customer:2",
                "estimated_value": None,
                "stage": "won"  # 100.0%
            }
        ]
        
        # Side effect for the three queries: customers, notebooks, contacts GROUP BY
        mock_repo_query.side_effect = [mock_customers, mock_notebooks, []]

        response = client.get("/api/customers")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        
        # Customer 1 Acme Corp checks
        acme = next(c for c in data if c["id"] == "customer:1")
        assert acme["name"] == "Acme Corp"
        assert acme["notebook_count"] == 2
        assert acme["total_value"] == 15000.0
        # Average: (75.0 + 15.0) / 2 = 45.0
        assert acme["compliance_progress"] == 45.0
        
        # Customer 2 Stark Industries checks
        stark = next(c for c in data if c["id"] == "customer:2")
        assert stark["name"] == "Stark Industries"
        assert stark["notebook_count"] == 1
        assert stark["total_value"] == 0.0
        assert stark["compliance_progress"] == 100.0

    @patch("api.routers.customers.repo_create")
    def test_create_customer(self, mock_repo_create, client):
        """Test POST /api/customers creates a new customer."""
        mock_repo_create.return_value = {
            "id": "customer:new123",
            "name": "New Customer Inc",
            "website": "newcust.com",
            "description": "A new customer",
            "industry": "Retail",
            "contacts": [{"name": "Alice"}],
            "created": "2026-05-23T00:00:00Z",
            "updated": "2026-05-23T00:00:00Z",
        }

        response = client.post(
            "/api/customers",
            json={
                "name": "New Customer Inc",
                "website": "newcust.com",
                "description": "A new customer",
                "industry": "Retail",
                "contacts": [{"name": "Alice"}]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "customer:new123"
        assert data["name"] == "New Customer Inc"
        assert len(data["contacts"]) == 1
        assert data["contacts"][0]["name"] == "Alice"

    @patch("api.routers.customers.repo_query")
    def test_get_customer_success(self, mock_repo_query, client):
        """Test GET /api/customers/{id} succeeds for existing customer."""
        mock_repo_query.return_value = [{
            "id": "customer:123",
            "name": "Acme Corp",
            "website": "acme.com",
            "description": "ACME manufacturer",
            "industry": "Manufacturing",
            "contacts": [],
            "created": "2026-01-01T00:00:00Z",
            "updated": "2026-01-01T00:00:00Z",
        }]

        response = client.get("/api/customers/123")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "customer:123"
        assert data["name"] == "Acme Corp"

    @patch("api.routers.customers.repo_query")
    def test_get_customer_not_found(self, mock_repo_query, client):
        """Test GET /api/customers/{id} returns 404 if customer doesn't exist."""
        mock_repo_query.return_value = []

        response = client.get("/api/customers/nonexistent")
        assert response.status_code == 404
        assert response.json()["detail"] == "Customer not found"

    @patch("api.routers.customers.repo_update")
    @patch("api.routers.customers.repo_query")
    def test_update_customer_success(self, mock_repo_query, mock_repo_update, client):
        """Test PUT /api/customers/{id} updates customer data successfully."""
        # Mock existence check
        mock_repo_query.return_value = [{
            "id": "customer:123",
            "name": "Acme Corp",
            "website": "acme.com",
            "description": "ACME manufacturer",
            "industry": "Manufacturing",
            "contacts": [],
            "created": "2026-01-01T00:00:00Z",
            "updated": "2026-01-01T00:00:00Z",
        }]
        
        # Mock update execution
        mock_repo_update.return_value = [{
            "id": "customer:123",
            "name": "Acme Global",
            "website": "acmeglobal.com",
            "description": "ACME manufacturer global",
            "industry": "Manufacturing",
            "contacts": [],
            "created": "2026-01-01T00:00:00Z",
            "updated": "2026-05-23T00:00:00Z",
        }]

        response = client.put(
            "/api/customers/123",
            json={
                "name": "Acme Global",
                "website": "acmeglobal.com",
                "description": "ACME manufacturer global"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "customer:123"
        assert data["name"] == "Acme Global"
        assert data["website"] == "acmeglobal.com"

    @patch("api.routers.customers.repo_query")
    def test_update_customer_not_found(self, mock_repo_query, client):
        """Test PUT /api/customers/{id} returns 404 if customer not found."""
        mock_repo_query.return_value = []

        response = client.put(
            "/api/customers/nonexistent",
            json={"name": "New Name"}
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Customer not found"

    @patch("api.routers.customers.repo_delete")
    @patch("api.routers.customers.repo_query")
    def test_delete_customer_success(self, mock_repo_query, mock_repo_delete, client):
        """Test DELETE /api/customers/{id} succeeds, nullifies notebook customer_ids, and deletes customer."""
        # Mock existence check
        mock_repo_query.side_effect = [
            # Check existence
            [{
                "id": "customer:123",
                "name": "Acme Corp",
                "website": "acme.com",
                "description": "ACME manufacturer",
                "industry": "Manufacturing",
                "contacts": [],
                "created": "2026-01-01T00:00:00Z",
                "updated": "2026-01-01T00:00:00Z",
            }],
            # UPDATE notebook query return (can be empty list)
            [],
            # DELETE contact query return
            [],
            # DELETE entity_note edge query return
            [],
        ]

        mock_repo_delete.return_value = True

        response = client.delete("/api/customers/123")
        assert response.status_code == 200
        assert response.json()["message"] == "Customer deleted successfully"
        
        # Verify repo_delete was called
        mock_repo_delete.assert_called_once_with("customer:123")

    @patch("api.routers.customers.repo_query")
    def test_delete_customer_not_found(self, mock_repo_query, client):
        """Test DELETE /api/customers/{id} returns 404 if customer not found."""
        mock_repo_query.return_value = []

        response = client.delete("/api/customers/nonexistent")
        assert response.status_code == 404
        assert response.json()["detail"] == "Customer not found"
