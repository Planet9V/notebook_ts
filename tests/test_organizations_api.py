import pytest
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_delete

client = TestClient(app)

def test_organizations_crud():
    # Make sure to cleanup if it exists
    org_id_to_cleanup = None
    try:
        payload = {"name": "Test Org 1", "type": "customer"}
        res = client.post("/api/organizations", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Test Org 1"
        assert data["type"] == "customer"
        org_id_to_cleanup = data["id"]
        
        # List organizations
        list_res = client.get("/api/organizations")
        assert list_res.status_code == 200
        org_names = [org["name"] for org in list_res.json()]
        assert "Test Org 1" in org_names
    finally:
        if org_id_to_cleanup:
            import asyncio
            async def cleanup():
                await repo_delete(org_id_to_cleanup)
            asyncio.run(cleanup())
