import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_asset_persistence_crud():
    notebook_id = "test-nb-999"
    # Create asset
    payload = {
        "notebook_id": notebook_id,
        "node_id": "plc-node-1",
        "type": "plc",
        "purdueLevel": 1,
        "manufacturer": "Siemens",
        "os_version": "S7-1200",
        "firmware_version": "4.5.0",
        "ip_address": "192.168.1.10",
        "mac_address": "00:1A:2B:3C:4D:5E",
        "subnet_mask": "255.255.255.0",
        "hostname": "plc-main",
        "x": 150.0,
        "y": 300.0
    }
    res = client.post(f"/api/notebooks/{notebook_id}/assets", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["node_id"] == "plc-node-1"
    
    # List assets
    list_res = client.get(f"/api/notebooks/{notebook_id}/assets")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
