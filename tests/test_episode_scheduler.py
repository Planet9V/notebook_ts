import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("api.routers.podcasts.PodcastService.submit_generation_job", new_callable=AsyncMock)
async def test_scheduled_episode_crud(mock_submit):
    # Setup mock return value
    mock_submit.return_value = "command:test_job_123"

    # Attempt to create a scheduled episode
    payload = {
        "notebook_id": "notebook:test_nb_123",
        "name": "Weekly Security Update",
        "episode_profile": "Standard Podcast",
        "speaker_profile": "Host & Guest",
        "schedule": "0 0 * * 0",  # every Sunday at midnight
        "status": "active"
    }
    
    res = client.post("/api/podcasts/schedule", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Weekly Security Update"
    assert data["schedule"] == "0 0 * * 0"
    assert data["status"] == "active"
    assert "id" in data
    
    # List scheduled episodes
    list_res = client.get("/api/podcasts/schedule")
    assert list_res.status_code == 200
    items = list_res.json()
    names = [s["name"] for s in items]
    assert "Weekly Security Update" in names
    
    # Update status to paused
    schedule_id = data["id"]
    update_res = client.put(f"/api/podcasts/schedule/{schedule_id}", json={"status": "paused"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "paused"
    
    # Trigger execution immediately
    trigger_res = client.post(f"/api/podcasts/schedule/{schedule_id}/trigger")
    assert trigger_res.status_code == 200
    assert trigger_res.json()["status"] == "triggered"
    assert trigger_res.json()["job_id"] == "command:test_job_123"
    
    # Delete scheduled episode
    del_res = client.delete(f"/api/podcasts/schedule/{schedule_id}")
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Scheduled episode deleted successfully"

