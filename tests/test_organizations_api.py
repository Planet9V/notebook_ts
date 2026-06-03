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


@pytest.mark.asyncio
async def test_tenant_boundary_isolation():
    # Setup test orgs directly in SurrealDB
    from open_notebook.database.repository import repo_upsert, repo_delete, ensure_record_id
    
    # Org A & Notebook A
    await repo_upsert("organization", "organization:org_a", {"name": "Org A", "type": "customer"})
    await repo_upsert("notebook", "notebook:nb_a", {
        "name": "Notebook A",
        "description": "Desc A",
        "organization": ensure_record_id("organization:org_a")
    })
    
    # Org B & Notebook B
    await repo_upsert("organization", "organization:org_b", {"name": "Org B", "type": "customer"})
    await repo_upsert("notebook", "notebook:nb_b", {
        "name": "Notebook B",
        "description": "Desc B",
        "organization": ensure_record_id("organization:org_b")
    })
    
    try:
        # Mock active user role from Org B attempting to fetch Notebook A
        res = client.get("/api/notebooks?organization_id=organization:org_b")
        assert res.status_code == 200
        names = [nb["name"] for nb in res.json()]
        assert "Notebook B" in names
        assert "Notebook A" not in names
    finally:
        await repo_delete("notebook:nb_a")
        await repo_delete("notebook:nb_b")
        await repo_delete("organization:org_a")
        await repo_delete("organization:org_b")

