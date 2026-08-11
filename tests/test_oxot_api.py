"""
Tests for OXOT Router (/api/oxot)
Verifies CRA offering matrix, campaign generation, Gmail outreach, and Google Calendar scheduling.
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_get_oxot_offering():
    response = client.get("/api/oxot/offering")
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "OXOT B.V."
    assert "retainer" in data
    assert "value_proposition" in data
    assert len(data["value_proposition"]) >= 5

def test_generate_oxot_campaign_linkedin():
    payload = {
        "artifact_type": "linkedin",
        "company_name": "Aalberts N.V.",
        "industry": "Industrial OT & Semiconductors",
        "product_count": 4
    }
    response = client.post("/api/oxot/campaigns/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["artifact_type"] == "linkedin"
    assert "CYBER RESILIENCE ACT" in data["content"]
    assert "Aalberts N.V." in data["content"]

def test_send_gmail_outreach():
    payload = {
        "recipient_email": "ciso@aalberts.com",
        "subject": "CRA Conformity Year Coverage",
        "body": "Hi CISO, OXOT standing access available.",
        "sender_name": "OXOT Engineering Team"
    }
    response = client.post("/api/oxot/gmail", json=payload)  # Note: /api/oxot/gmail/send
    if response.status_code == 404:
        response = client.post("/api/oxot/gmail/send", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["recipient"] == "ciso@aalberts.com"

def test_schedule_calendar_meeting():
    payload = {
        "client_name": "Aalberts N.V.",
        "client_email": "ciso@aalberts.com",
        "meeting_date": "2026-08-20",
        "time_slot": "14:00 CET",
        "topic": "CRA Readiness Audit"
    }
    response = client.post("/api/oxot/calendar/schedule", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "scheduled"
    assert "calendar_event_link" in data
