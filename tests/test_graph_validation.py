import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client using api.main.app."""
    from api.main import app
    return TestClient(app)


class TestGraphValidation:
    """Test suite for the NetworkX-powered graph boundary validation API endpoint."""

    def test_secure_topology(self, client):
        """Test that a standard, secure mediated topology returns no violations and all verified requirements."""
        payload = {
            "nodes": [
                {"id": "node-field-plc", "type": "plc", "purdueLevel": 1},
                {"id": "node-ot-firewall", "type": "firewall", "purdueLevel": 3},
                {"id": "node-ops-hmi", "type": "hmi", "purdueLevel": 3},
                {"id": "node-ent-switch", "type": "switch", "purdueLevel": 4}
            ],
            "edges": [
                {"id": "edge-1", "source": "node-field-plc", "target": "node-ot-firewall"},
                {"id": "edge-2", "source": "node-ot-firewall", "target": "node-ops-hmi"},
                {"id": "edge-3", "source": "node-ops-hmi", "target": "node-ent-switch"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["violatedNodes"]) == 0
        assert len(data["violatedEdges"]) == 0
        assert len(data["threatPaths"]) == 0
        assert len(data["verifiedRequirements"]) > 0
        assert "hs50-dema" in data["verifiedRequirements"]

    def test_direct_crossing_violation(self, client):
        """Test that a direct connection between Level 1 and Level 4 without mediating firewall flags violations."""
        payload = {
            "nodes": [
                {"id": "node-field-plc", "type": "plc", "purdueLevel": 1},
                {"id": "node-ent-switch", "type": "switch", "purdueLevel": 4}
            ],
            "edges": [
                {"id": "edge-direct", "source": "node-field-plc", "target": "node-ent-switch"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200

        data = response.json()
        # Direct crossing triggers zone bypass since abs(1 - 4) > 1 and neither is firewall
        assert "node-field-plc" in data["violatedNodes"]
        assert "node-ent-switch" in data["violatedNodes"]
        assert "edge-direct" in data["violatedEdges"]
        assert len(data["threatPaths"]) > 0
        assert data["threatPaths"][0] == ["node-field-plc", "node-ent-switch"]
        assert len(data["verifiedRequirements"]) == 0

    def test_unmediated_path_violation(self, client):
        """Test that a multi-hop path from Level 1-2 to Level 4 without a firewall is flagged as a threat path."""
        payload = {
            "nodes": [
                {"id": "node-plc", "type": "plc", "purdueLevel": 1},
                {"id": "node-switch-ops", "type": "switch", "purdueLevel": 3},
                {"id": "node-switch-ent", "type": "switch", "purdueLevel": 4}
            ],
            "edges": [
                {"id": "edge-1", "source": "node-plc", "target": "node-switch-ops"},
                {"id": "edge-2", "source": "node-switch-ops", "target": "node-switch-ent"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert len(data["threatPaths"]) > 0
        assert data["threatPaths"][0] == ["node-plc", "node-switch-ops", "node-switch-ent"]
        
        # Check that nodes along the path are flagged
        assert "node-plc" in data["violatedNodes"]
        assert "node-switch-ops" in data["violatedNodes"]
        assert "node-switch-ent" in data["violatedNodes"]
        assert "edge-1" in data["violatedEdges"]
        assert "edge-2" in data["violatedEdges"]
        assert len(data["verifiedRequirements"]) == 0
