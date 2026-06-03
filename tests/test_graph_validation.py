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

    def test_top_down_bypass_bidirectional(self, client):
        """Test that a connection drawn from Level 4 down to Level 1 is correctly flagged as a threat path."""
        payload = {
            "nodes": [
                {"id": "node-plc", "type": "plc", "purdueLevel": 1},
                {"id": "node-switch-ops", "type": "switch", "purdueLevel": 3},
                {"id": "node-switch-ent", "type": "switch", "purdueLevel": 4}
            ],
            "edges": [
                # Edges drawn top-down: Level 4 to Level 3, and Level 3 to Level 1
                {"id": "edge-1", "source": "node-switch-ent", "target": "node-switch-ops"},
                {"id": "edge-2", "source": "node-switch-ops", "target": "node-plc"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert len(data["threatPaths"]) > 0
        # Undirected search will find the unmediated path regardless of drawn direction
        path = data["threatPaths"][0]
        assert "node-plc" in path
        assert "node-switch-ops" in path
        assert "node-switch-ent" in path
        
        # Check that nodes and edges along the path are flagged
        assert "node-plc" in data["violatedNodes"]
        assert "node-switch-ops" in data["violatedNodes"]
        assert "node-switch-ent" in data["violatedNodes"]
        assert "edge-1" in data["violatedEdges"]
        assert "edge-2" in data["violatedEdges"]
        assert len(data["verifiedRequirements"]) == 0

    def test_missing_endpoint_validation(self, client):
        """Test that referencing non-existent node IDs in edges triggers a 400 Bad Request error."""
        payload = {
            "nodes": [
                {"id": "node-plc", "type": "plc", "purdueLevel": 1}
            ],
            "edges": [
                {"id": "edge-invalid", "source": "node-plc", "target": "node-nonexistent"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 400
        assert "references non-existent node" in response.json()["detail"]

    def test_zone_containment_and_unencrypted_control_protocol(self, client):
        """Test that unencrypted control protocols crossing zone boundaries are flagged."""
        payload = {
            "nodes": [
                # Define a zone node
                {"id": "zone-control", "type": "zone", "purdueLevel": 0, "x": 100, "y": 100, "width": 500, "height": 400, "zone_sal": "High", "zone_type": "Control"},
                # Device A inside zone (coordinate 150, 150 falls within zone [100, 100] to [600, 500])
                {"id": "node-plc-a", "type": "plc", "purdueLevel": 1, "x": 150, "y": 150},
                # Device B outside zone (coordinate 800, 800)
                {"id": "node-hmi-b", "type": "hmi", "purdueLevel": 3, "x": 800, "y": 800}
            ],
            "edges": [
                # Modbus protocol, unencrypted, crosses boundary
                {"id": "edge-modbus", "source": "node-plc-a", "target": "node-hmi-b", "protocol": "Modbus", "encrypted": False}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "edge-modbus" in data["violatedEdges"]
        assert any("Unencrypted Control Protocol Crossing Boundary" in v for v in data["edgeViolations"]["edge-modbus"])


    def test_sal_boundary_violation(self, client):
        """Test that unencrypted connections crossing SAL boundaries without firewall are flagged."""
        payload = {
            "nodes": [
                {"id": "zone-high", "type": "zone", "purdueLevel": 0, "x": 100, "y": 100, "width": 300, "height": 300, "zone_sal": "High", "zone_type": "Control"},
                {"id": "zone-low", "type": "zone", "purdueLevel": 0, "x": 500, "y": 100, "width": 300, "height": 300, "zone_sal": "Low", "zone_type": "Corporate"},
                {"id": "node-a", "type": "workstation", "purdueLevel": 3, "x": 150, "y": 150},
                {"id": "node-b", "type": "workstation", "purdueLevel": 3, "x": 550, "y": 150}
            ],
            "edges": [
                {"id": "edge-sal-cross", "source": "node-a", "target": "node-b", "protocol": "HTTP", "encrypted": False}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "edge-sal-cross" in data["violatedEdges"]
        assert any("SAL Boundary Violation" in v for v in data["edgeViolations"]["edge-sal-cross"])


    def test_controller_in_corporate_zone_mismatch(self, client):
        """Test that placing a controller in a Corporate Zone is flagged as a mismatch."""
        payload = {
            "nodes": [
                {"id": "zone-corp", "type": "zone", "purdueLevel": 0, "x": 100, "y": 100, "width": 300, "height": 300, "zone_sal": "Low", "zone_type": "Corporate"},
                {"id": "node-plc-misplaced", "type": "plc", "purdueLevel": 1, "x": 150, "y": 150}
            ],
            "edges": []
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "node-plc-misplaced" in data["violatedNodes"]
        assert any("Purdue Zone Violation" in v for v in data["nodeViolations"]["node-plc-misplaced"])


    def test_ip_conflict_validation(self, client):
        """Test that duplicate IP addresses across devices trigger IP conflict violations."""
        payload = {
            "nodes": [
                {"id": "node-plc-1", "type": "plc", "purdueLevel": 1, "ip_address": "192.168.1.10"},
                {"id": "node-plc-2", "type": "plc", "purdueLevel": 1, "ip_address": "192.168.1.10"}
            ],
            "edges": []
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "node-plc-1" in data["violatedNodes"]
        assert "node-plc-2" in data["violatedNodes"]
        assert "node-plc-1" in data["nodeViolations"]
        assert "IP Address conflict detected" in data["nodeViolations"]["node-plc-1"][0]

    def test_missing_parameters_warning(self, client):
        """Test that PLCs missing critical production parameters trigger warning messages."""
        payload = {
            "nodes": [
                {"id": "node-plc-incomplete", "type": "plc", "purdueLevel": 1}
            ],
            "edges": []
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "node-plc-incomplete" in data["nodeViolations"]
        assert "Missing production parameters" in data["nodeViolations"]["node-plc-incomplete"][0]

    def test_subnet_boundary_crossing_validation(self, client):
        """Test that direct connections crossing subnet boundaries without a firewall are flagged."""
        payload = {
            "nodes": [
                {"id": "node-plc-a", "type": "plc", "purdueLevel": 1, "ip_address": "192.168.1.10", "subnet_mask": "255.255.255.0"},
                {"id": "node-plc-b", "type": "plc", "purdueLevel": 1, "ip_address": "192.168.2.10", "subnet_mask": "255.255.255.0"}
            ],
            "edges": [
                {"id": "edge-subnet-cross", "source": "node-plc-a", "target": "node-plc-b"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "node-plc-a" in data["violatedNodes"]
        assert "node-plc-b" in data["violatedNodes"]
        assert "edge-subnet-cross" in data["violatedEdges"]
        assert "edge-subnet-cross" in data["edgeViolations"]
        assert "subnet boundaries detected" in data["edgeViolations"]["edge-subnet-cross"][0]

