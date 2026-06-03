import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_publications_metrics_history_tracking():
    """
    Test creating a published post, triggering the metrics tracking worker
    via HTTP trigger, and validating metrics updates and timeseries history.
    """
    # 1. Seed a published post in the database
    post_payload = {
        "channel": "linkedin",
        "title": "Published Post for Metrics Tracker",
        "content": "Check out our Tremor dashboard integration!",
        "media_urls": [],
        "scheduled_time": "2026-06-01T12:00:00Z",
        "status": "published"  # Worker scans only status="published" posts
    }
    
    res = client.post("/api/publications/schedule", json=post_payload)
    assert res.status_code == 200
    post_data = res.json()
    post_id = post_data["id"]
    
    try:
        # 2. Trigger the track-due endpoint which executes the worker
        track_res = client.post("/api/publications/metrics/track-due")
        assert track_res.status_code == 200
        assert track_res.json()["status"] == "success"
        
        # 3. Verify metrics values were incremented on the post
        calendar_res = client.get("/api/publications/calendar")
        assert calendar_res.status_code == 200
        calendar_posts = calendar_res.json()
        
        updated_post = next(p for p in calendar_posts if p["id"] == post_id)
        assert updated_post["views"] > 0
        assert updated_post["clicks"] >= 0
        
        # 4. Fetch history and assert logs were recorded
        history_res = client.get("/api/publications/metrics/history")
        assert history_res.status_code == 200
        history_data = history_res.json()
        assert len(history_data) >= 1
        
        # Ensure the entry matches our post
        logged_entry = next(entry for entry in history_data if entry["scheduled_post"] == post_id)
        assert logged_entry["channel"] == "linkedin"
        assert logged_entry["views"] == updated_post["views"]
        
    finally:
        # Cleanup seeded data
        client.delete(f"/api/publications/schedule/{post_id}")
