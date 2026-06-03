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


@pytest.mark.asyncio
async def test_file_audit_logging():
    from open_notebook.database.repository import repo_query, repo_delete

    notebook_id = "test-nb-999"
    node_id = "plc-99"

    try:
        # Make a POST to '/api/notebooks/test-nb-999/assets'
        payload = {
            "notebook_id": notebook_id,
            "node_id": node_id,
            "type": "plc",
            "purdueLevel": 1,
            "x": 100.0,
            "y": 100.0
        }
        res = client.post(f"/api/notebooks/{notebook_id}/assets", json=payload)
        assert res.status_code == 200

        # Query SurrealDB 'file_audit_log' using repo_query
        logs = await repo_query("SELECT * FROM file_audit_log ORDER BY timestamp DESC LIMIT 1;")
        assert len(logs) > 0
        assert logs[0]["action"] in ['upload', 'download', 'delete', 'read', 'modify']

    finally:
        # Clean up created records (asset, notebook, and audit logs created during the test)
        # Find asset ID
        assets = await repo_query(
            "SELECT id FROM asset WHERE notebook_id = $notebook_id AND node_id = $node_id",
            {"notebook_id": notebook_id, "node_id": node_id}
        )
        for a in assets:
            await repo_delete(a["id"])

        # Delete notebook
        await repo_delete(f"notebook:{notebook_id}")

        # Delete any file audit logs referencing this target_id
        audit_logs = await repo_query(
            "SELECT id FROM file_audit_log WHERE target_id = $node_id",
            {"node_id": node_id}
        )
        for l in audit_logs:
            await repo_delete(l["id"])


