"""
TDD tests for contacts.py router.

Tests contact CRUD operations and customer sub-resource routes.
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


MOCK_CONTACT_DATA = {
    "id": "contact:ct1",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@acme.com",
    "phone": "+1-555-0100",
    "mobile": "",
    "title": "CISO",
    "department": "Security",
    "seniority": "Director",
    "linkedin_url": "https://linkedin.com/in/janedoe",
    "customer_id": "customer:cust1",
    "status": "active",
    "tags": ["security", "executive"],
    "notes": "Key decision maker",
    "last_contacted": "2026-05-20T00:00:00Z",
    "source": "manual",
    "import_batch_id": None,
    "created": "2026-05-01T00:00:00Z",
    "updated": "2026-05-27T00:00:00Z",
}


class TestContactsListAPI:
    """Test GET /api/contacts."""

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_get_contacts_returns_list(self, mock_repo_query, client):
        """GET /api/contacts returns list of contacts."""
        mock_repo_query.return_value = [MOCK_CONTACT_DATA]

        response = client.get("/api/contacts")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["first_name"] == "Jane"
        assert data[0]["full_name"] == "Jane Doe"

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_get_contacts_empty(self, mock_repo_query, client):
        """GET /api/contacts returns empty list when none exist."""
        mock_repo_query.return_value = []

        response = client.get("/api/contacts")

        assert response.status_code == 200
        assert response.json() == []

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_get_contacts_by_customer_id(self, mock_repo_query, client):
        """GET /api/contacts?customer_id=X filters by customer."""
        mock_repo_query.return_value = [MOCK_CONTACT_DATA]

        response = client.get("/api/contacts?customer_id=customer:cust1")

        assert response.status_code == 200
        assert len(response.json()) == 1


class TestContactsCRUD:
    """Test contact CRUD operations."""

    @patch("api.routers.contacts.repo_create", new_callable=AsyncMock)
    def test_create_contact(self, mock_repo_create, client):
        """POST /api/contacts creates a new contact."""
        mock_repo_create.return_value = [MOCK_CONTACT_DATA]

        response = client.post("/api/contacts", json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@acme.com",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "jane@acme.com"

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_get_contact_by_id(self, mock_repo_query, client):
        """GET /api/contacts/{id} returns a specific contact."""
        mock_repo_query.return_value = [MOCK_CONTACT_DATA]

        response = client.get("/api/contacts/contact:ct1")

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Jane"

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_get_contact_not_found(self, mock_repo_query, client):
        """GET /api/contacts/{id} returns 404 for missing contact."""
        mock_repo_query.return_value = []

        response = client.get("/api/contacts/contact:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.contacts.repo_update", new_callable=AsyncMock)
    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_update_contact(self, mock_repo_query, mock_repo_update, client):
        """PUT /api/contacts/{id} updates a contact."""
        mock_repo_query.return_value = [MOCK_CONTACT_DATA]
        updated = dict(MOCK_CONTACT_DATA)
        updated["title"] = "VP Security"
        mock_repo_update.return_value = [updated]

        response = client.put("/api/contacts/contact:ct1", json={
            "title": "VP Security"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "VP Security"

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_update_contact_not_found(self, mock_repo_query, client):
        """PUT /api/contacts/{id} returns 404 for missing contact."""
        mock_repo_query.return_value = []

        response = client.put("/api/contacts/contact:nonexistent", json={
            "title": "CEO"
        })

        assert response.status_code == 404

    @patch("api.routers.contacts.repo_delete", new_callable=AsyncMock)
    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_delete_contact(self, mock_repo_query, mock_repo_delete, client):
        """DELETE /api/contacts/{id} deletes a contact."""
        mock_repo_query.return_value = [MOCK_CONTACT_DATA]

        response = client.delete("/api/contacts/contact:ct1")

        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()

    @patch("api.routers.contacts.repo_query", new_callable=AsyncMock)
    def test_delete_contact_not_found(self, mock_repo_query, client):
        """DELETE /api/contacts/{id} returns 404 for missing contact."""
        mock_repo_query.return_value = []

        response = client.delete("/api/contacts/contact:nonexistent")

        assert response.status_code == 404
