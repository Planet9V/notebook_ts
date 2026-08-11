"""
Tests for GET /api/providers (api/routers/providers.py).
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import app

    return TestClient(app)


def test_list_providers(client):
    response = client.get("/api/providers")
    assert response.status_code == 200
    providers = response.json()
    assert isinstance(providers, list)
    assert len(providers) > 0
    
    # Check schema structure of first provider
    first = providers[0]
    assert "name" in first
    assert "display_name" in first
    assert "modalities" in first
    assert "env_configured" in first
