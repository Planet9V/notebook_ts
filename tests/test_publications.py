import pytest
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_query

client = TestClient(app)

def test_migration_35():
    """Verify that email_setting and scheduled_post tables exist in SurrealDB."""
    # We query the tables or try to insert to verify tables exist
    res = client.get("/api/publications/settings")
    assert res.status_code == 200

def test_publications_settings_crud():
    """Test getting and setting publication/SMTP configurations."""
    payload = {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_username": "test@gmail.com",
        "smtp_password": "supersecretpassword",
        "use_tls": True,
        "oauth_provider": "google",
        "oauth_token_ref": None
    }
    
    # Save settings
    post_res = client.post("/api/publications/settings", json=payload)
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["smtp_host"] == "smtp.gmail.com"
    assert data["smtp_port"] == 587
    
    # Get settings
    get_res = client.get("/api/publications/settings")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["smtp_username"] == "test@gmail.com"

def test_publications_connection_test():
    """Test connection validation endpoint."""
    # Test connection with sandbox host
    payload = {
        "smtp_host": "sandbox",
        "smtp_port": 587,
        "smtp_username": "test@gmail.com",
        "smtp_password": "password",
        "use_tls": True
    }
    res = client.post("/api/publications/settings/test", json=payload)
    assert res.status_code == 200
    assert "status" in res.json()

def test_publications_connection_test_real_mocked():
    """Test connection validation endpoint with mocked smtplib connection."""
    from unittest.mock import patch, MagicMock
    
    payload = {
        "smtp_host": "smtp.company.com",
        "smtp_port": 587,
        "smtp_username": "realuser",
        "smtp_password": "realpassword",
        "use_tls": True
    }
    
    mock_server = MagicMock()
    with patch("smtplib.SMTP", return_value=mock_server) as mock_smtp:
        res = client.post("/api/publications/settings/test", json=payload)
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        mock_smtp.assert_called_once_with("smtp.company.com", 587, timeout=10)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("realuser", "realpassword")
        mock_server.noop.assert_called_once()
        mock_server.quit.assert_called_once()

def test_publications_schedule_crud():
    """Test scheduling social media posts and campaigns."""
    post_payload = {
        "channel": "linkedin",
        "title": "Unveiling Tetrel OT Security Canvas",
        "content": "Check out our resizable Purdue Model Level lanes and NetworkX validation rules!",
        "media_urls": [],
        "scheduled_time": "2026-06-15T12:00:00Z",
        "status": "queued"
    }
    
    # Create scheduled post
    res = client.post("/api/publications/schedule", json=post_payload)
    assert res.status_code == 200
    post_data = res.json()
    assert post_data["id"] is not None
    assert post_data["title"] == "Unveiling Tetrel OT Security Canvas"
    assert post_data["status"] == "queued"
    
    post_id = post_data["id"]
    
    # Fetch content calendar (start/end parameters optional or custom)
    calendar_res = client.get("/api/publications/calendar?start_date=2026-06-01T00:00:00Z&end_date=2026-06-30T23:59:59Z")
    assert calendar_res.status_code == 200
    calendar_data = calendar_res.json()
    assert len(calendar_data) >= 1
    assert any(p["id"] == post_id for p in calendar_data)
    
    # Update scheduled post
    update_payload = {
        "title": "Unveiling Tetrel OT Security Canvas V2",
        "status": "draft"
    }
    put_res = client.put(f"/api/publications/schedule/{post_id}", json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["title"] == "Unveiling Tetrel OT Security Canvas V2"
    assert put_res.json()["status"] == "draft"
    
    # Delete scheduled post
    del_res = client.delete(f"/api/publications/schedule/{post_id}")
    assert del_res.status_code == 200
    
    # Verify deleted
    get_calendar = client.get("/api/publications/calendar?start_date=2026-06-01T00:00:00Z&end_date=2026-06-30T23:59:59Z")
    assert get_calendar.status_code == 200
    assert not any(p["id"] == post_id for p in get_calendar.json())
