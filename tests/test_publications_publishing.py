import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_query

client = TestClient(app)

@pytest.mark.asyncio
async def test_publications_publish_due_sandbox():
    """
    Test creating queued posts (email, twitter, linkedin) with a past scheduled_time,
    triggering the publish-due endpoint, and verifying they are marked as published.
    """
    # 0. Save existing SMTP settings to restore later
    settings_res = client.get("/api/publications/settings")
    old_settings = settings_res.json() if settings_res.status_code == 200 else None

    # Configure sandbox SMTP
    sandbox_payload = {
        "smtp_host": "sandbox",
        "smtp_port": 587,
        "smtp_username": "test@example.com",
        "smtp_password": "password",
        "use_tls": True,
        "oauth_provider": None,
        "oauth_token_ref": None
    }
    client.post("/api/publications/settings", json=sandbox_payload)

    # 1. Seed queued posts with scheduled_time in the past
    past_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    email_post = {
        "channel": "email",
        "title": "Test Email Post",
        "content": "Hello, this is a test email campaign content.",
        "media_urls": [],
        "scheduled_time": past_time,
        "status": "queued"
    }
    
    twitter_post = {
        "channel": "twitter",
        "title": "Test Twitter Post",
        "content": "Hello world from the sandbox!",
        "media_urls": [],
        "scheduled_time": past_time,
        "status": "queued"
    }

    # Create the posts via API
    email_res = client.post("/api/publications/schedule", json=email_post)
    assert email_res.status_code == 200
    email_data = email_res.json()
    email_id = email_data["id"]

    twitter_res = client.post("/api/publications/schedule", json=twitter_post)
    assert twitter_res.status_code == 200
    twitter_data = twitter_res.json()
    twitter_id = twitter_data["id"]

    try:
        # 2. Trigger the publish-due endpoint
        publish_res = client.post("/api/publications/publish-due")
        assert publish_res.status_code == 200
        assert publish_res.json()["status"] == "success"

        # 3. Verify they are now status="published"
        calendar_res = client.get("/api/publications/calendar")
        assert calendar_res.status_code == 200
        calendar_posts = calendar_res.json()

        updated_email = next(p for p in calendar_posts if p["id"] == email_id)
        assert updated_email["status"] == "published"

        updated_twitter = next(p for p in calendar_posts if p["id"] == twitter_id)
        assert updated_twitter["status"] == "published"

    finally:
        # Cleanup seeded data
        client.delete(f"/api/publications/schedule/{email_id}")
        client.delete(f"/api/publications/schedule/{twitter_id}")
        
        # Restore old settings
        if old_settings:
            client.post("/api/publications/settings", json=old_settings)
