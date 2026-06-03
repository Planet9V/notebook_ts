import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_voice_preflight_endpoint_validation():
    # Test with invalid engine name
    res = client.post("/api/voice/preflight", json={"engine": "invalid-engine"})
    assert res.status_code == 422

def test_voice_preflight_success():
    # Test pre-flight checks for kokoro
    # Note: In test environments, Kokoro might be mockable or direct check is performed.
    res = client.post("/api/voice/preflight", json={"engine": "kokoro"})
    assert res.status_code == 200
    data = res.json()
    assert data["engine"] == "kokoro"
    assert "status" in data
    assert data["status"] in ["healthy", "unavailable", "error"]
