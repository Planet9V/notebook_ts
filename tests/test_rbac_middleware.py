"""Test suite for Role-Based Access Control (RBAC) in FastAPI routers."""
import asyncio
import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

# Ensure SurrealDB connection settings are set for the integration tests
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")


@pytest.fixture
def client():
    """Fixture to provide a test client."""
    from api.main import app
    return TestClient(app)


def test_rbac_default_admin(client):
    """By default, if no custom headers are sent, request defaults to admin and is allowed."""
    with patch("open_notebook.domain.task.Task.save") as mock_save:
        mock_save.return_value = None
        response = client.post(
            "/api/tasks",
            json={
                "title": "Default Task",
                "description": "Verify default access",
                "status": "todo",
                "priority": "medium",
                "tags": []
            }
        )
        assert response.status_code == 201


def test_rbac_viewer_blocked(client):
    """Requests with X-User-Role: viewer should get blocked with 403 Forbidden."""
    response = client.post(
        "/api/tasks",
        json={
            "title": "Unauthorized Task",
            "description": "Should fail",
            "status": "todo",
            "priority": "medium",
            "tags": []
        },
        headers={"X-User-Role": "viewer"}
    )
    assert response.status_code == 403
    assert "Minimum role required: editor" in response.json()["detail"]


def test_rbac_editor_allowed(client):
    """Requests with X-User-Role: editor should be allowed to modify resources."""
    with patch("open_notebook.domain.task.Task.save") as mock_save:
        mock_save.return_value = None
        response = client.post(
            "/api/tasks",
            json={
                "title": "Editor Task",
                "description": "Should succeed",
                "status": "todo",
                "priority": "medium",
                "tags": []
            },
            headers={"X-User-Role": "editor"}
        )
        assert response.status_code == 201


def test_rbac_admin_allowed(client):
    """Requests with X-User-Role: admin should be allowed to modify resources."""
    with patch("open_notebook.domain.task.Task.save") as mock_save:
        mock_save.return_value = None
        response = client.post(
            "/api/tasks",
            json={
                "title": "Admin Task",
                "description": "Should succeed",
                "status": "todo",
                "priority": "medium",
                "tags": []
            },
            headers={"X-User-Role": "admin"}
        )
        assert response.status_code == 201


def test_rbac_db_lookup_viewer(client):
    """If X-User-Id matches a database user with role 'viewer', requests should be blocked."""
    from open_notebook.database.repository import repo_create, repo_delete
    import uuid

    username = f"user_{uuid.uuid4().hex[:8]}"
    result = asyncio.run(repo_create("user", {
        "username": username,
        "email": f"{username}@test.com",
        "role": "viewer"
    }))
    assert len(result) > 0
    user_id = result[0]["id"]

    try:
        response = client.post(
            "/api/tasks",
            json={
                "title": "Database Viewer Task",
                "status": "todo",
                "priority": "medium",
                "tags": []
            },
            headers={"X-User-Id": user_id}
        )
        assert response.status_code == 403
        assert "Minimum role required: editor" in response.json()["detail"]
    finally:
        asyncio.run(repo_delete(user_id))


def test_rbac_db_lookup_editor(client):
    """If X-User-Id matches a database user with role 'editor', requests should succeed."""
    from open_notebook.database.repository import repo_create, repo_delete
    import uuid

    username = f"user_{uuid.uuid4().hex[:8]}"
    result = asyncio.run(repo_create("user", {
        "username": username,
        "email": f"{username}@test.com",
        "role": "editor"
    }))
    assert len(result) > 0
    user_id = result[0]["id"]

    try:
        with patch("open_notebook.domain.task.Task.save") as mock_save:
            mock_save.return_value = None
            response = client.post(
                "/api/tasks",
                json={
                    "title": "Database Editor Task",
                    "status": "todo",
                    "priority": "medium",
                    "tags": []
                },
                headers={"X-User-Id": user_id}
            )
            assert response.status_code == 201
    finally:
        asyncio.run(repo_delete(user_id))
