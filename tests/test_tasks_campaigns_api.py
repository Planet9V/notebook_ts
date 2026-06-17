"""
Integration tests for Tasks and Campaigns API routers.
"""
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    """TestClient fixture with auth disabled by conftest."""
    return TestClient(app)


def test_tasks_api_lifecycle(client):
    """Verify task creation, retrieval, updates, filtering, and deletion."""
    # 1. Create a task via API
    task_payload = {
        "title": "API Test Task",
        "description": "This is an integration test task",
        "status": "todo",
        "priority": "high",
        "due_date": "2026-07-01",
        "tags": ["integration", "test"],
    }

    response = client.post("/api/tasks", json=task_payload)
    assert response.status_code == 201
    created_task = response.json()
    assert created_task["id"].startswith("task:")
    assert created_task["title"] == "API Test Task"
    assert created_task["status"] == "todo"
    assert created_task["priority"] == "high"
    assert "integration" in created_task["tags"]

    task_id = created_task["id"]

    try:
        # 2. Get task by ID
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        fetched_task = response.json()
        assert fetched_task["id"] == task_id
        assert fetched_task["title"] == "API Test Task"

        # 3. List tasks and verify it shows up
        response = client.get("/api/tasks")
        assert response.status_code == 200
        tasks_list = response.json()
        assert any(t["id"] == task_id for t in tasks_list)

        # Filter list by status
        response = client.get("/api/tasks?status=todo")
        assert response.status_code == 200
        todo_tasks = response.json()
        assert any(t["id"] == task_id for t in todo_tasks)

        response = client.get("/api/tasks?status=done")
        assert response.status_code == 200
        done_tasks = response.json()
        assert not any(t["id"] == task_id for t in done_tasks)

        # 4. Update task
        update_payload = {
            "status": "in_progress",
            "priority": "critical",
            "title": "API Test Task Updated",
        }
        response = client.put(f"/api/tasks/{task_id}", json=update_payload)
        assert response.status_code == 200
        updated_task = response.json()
        assert updated_task["status"] == "in_progress"
        assert updated_task["priority"] == "critical"
        assert updated_task["title"] == "API Test Task Updated"

    finally:
        # 5. Delete task
        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 200

        # Verify deletion
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 404


def test_campaigns_api_lifecycle(client):
    """Verify campaign creation, retrieval, updates, filtering, and deletion."""
    # 1. Create a campaign
    campaign_payload = {
        "name": "API Test Campaign",
        "description": "Integration test campaign",
        "theme": "Compliance Automation",
        "status": "draft",
        "channels": ["linkedin", "twitter"],
    }

    response = client.post("/api/campaigns", json=campaign_payload)
    assert response.status_code == 201
    created_campaign = response.json()
    assert created_campaign["id"].startswith("campaign:")
    assert created_campaign["name"] == "API Test Campaign"
    assert created_campaign["status"] == "draft"
    assert created_campaign["theme"] == "Compliance Automation"
    assert "linkedin" in created_campaign["channels"]

    campaign_id = created_campaign["id"]

    try:
        # 2. Get campaign by ID
        response = client.get(f"/api/campaigns/{campaign_id}")
        assert response.status_code == 200
        fetched_campaign = response.json()
        assert fetched_campaign["id"] == campaign_id
        assert fetched_campaign["name"] == "API Test Campaign"

        # 3. List campaigns and verify it shows up
        response = client.get("/api/campaigns")
        assert response.status_code == 200
        campaigns_list = response.json()
        assert any(c["id"] == campaign_id for c in campaigns_list)

        # 4. Update campaign
        update_payload = {
            "status": "active",
            "theme": "Compliance Automation 2.0",
        }
        response = client.put(f"/api/campaigns/{campaign_id}", json=update_payload)
        assert response.status_code == 200
        updated_campaign = response.json()
        assert updated_campaign["status"] == "active"
        assert updated_campaign["theme"] == "Compliance Automation 2.0"

    finally:
        # 5. Delete campaign
        response = client.delete(f"/api/campaigns/{campaign_id}")
        assert response.status_code == 200

        # Verify deletion
        response = client.get(f"/api/campaigns/{campaign_id}")
        assert response.status_code == 404
