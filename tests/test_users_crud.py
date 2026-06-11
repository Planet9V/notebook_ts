"""
TDD tests for User CRUD endpoints in auth.py.
"""
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for auth API."""
    from api.main import app
    return TestClient(app)


class TestUsersCRUDAPI:
    """Test suite for User CRUD endpoints."""

    @patch("api.routers.auth.repo_query")
    def test_list_users(self, mock_repo_query, client):
        """GET /api/auth/users returns list of users."""
        mock_users = [
            {
                "id": "user:123",
                "username": "jdoe",
                "email": "jdoe@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "role": "Developer",
                "organization": None
            }
        ]
        mock_repo_query.return_value = mock_users

        response = client.get("/api/auth/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["username"] == "jdoe"
        assert data[0]["first_name"] == "John"
        assert data[0]["last_name"] == "Doe"

    @patch("api.routers.auth.repo_query")
    def test_create_user(self, mock_repo_query, client):
        """POST /api/auth/users creates a new user."""
        mock_repo_query.return_value = []

        response = client.post(
            "/api/auth/users",
            json={
                "username": "jdoe",
                "email": "jdoe@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "role": "Developer"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "jdoe"
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["role"] == "Developer"
        assert data["id"].startswith("user:")

    @patch("api.routers.auth.repo_query")
    def test_update_user_success(self, mock_repo_query, client):
        """PUT /api/auth/users/{id} updates user successfully."""
        mock_repo_query.side_effect = [
            # Check existence query
            [{"id": "user:123", "username": "jdoe"}],
            # Update query execution return (unused but query runs)
            [],
            # Updated user select return
            [{
                "id": "user:123",
                "username": "jdoe",
                "email": "jdoe_new@example.com",
                "first_name": "Johnny",
                "last_name": "Doe",
                "role": "Lead Developer",
                "organization": None
            }]
        ]

        response = client.put(
            "/api/auth/users/123",
            json={
                "first_name": "Johnny",
                "email": "jdoe_new@example.com",
                "role": "Lead Developer"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Johnny"
        assert data["email"] == "jdoe_new@example.com"
        assert data["role"] == "Lead Developer"

    @patch("api.routers.auth.repo_query")
    def test_update_user_not_found(self, mock_repo_query, client):
        """PUT /api/auth/users/{id} returns 404 if user not found."""
        mock_repo_query.return_value = []

        response = client.put(
            "/api/auth/users/nonexistent",
            json={"first_name": "Johnny"}
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"

    @patch("api.routers.auth.repo_delete")
    def test_delete_user(self, mock_repo_delete, client):
        """DELETE /api/auth/users/{id} deletes user successfully."""
        mock_repo_delete.return_value = True

        response = client.delete("/api/auth/users/123")
        assert response.status_code == 200
        assert response.json()["message"] == "User deleted successfully"
        mock_repo_delete.assert_called_once_with("user:123")
