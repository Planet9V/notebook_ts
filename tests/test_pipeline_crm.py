import pytest
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_delete, repo_query, ensure_record_id
from open_notebook.database.async_migrate import AsyncMigrationManager

client = TestClient(app)

@pytest.mark.asyncio
async def test_migration_33():
    """Assert that migration 33 runs and reverts cleanly."""
    migration_manager = AsyncMigrationManager()
    
    # Check current version
    orig_version = await migration_manager.get_current_version()
    
    # We should run migrations to make sure we're up to date
    await migration_manager.run_migration_up()
    new_version = await migration_manager.get_current_version()
    assert new_version >= 33
    
    # Down migration check (revert 33)
    await migration_manager.runner.run_one_down()
    ver_after_down = await migration_manager.get_current_version()
    assert ver_after_down == new_version - 1
    
    # Bring it back up
    await migration_manager.run_migration_up()
    final_version = await migration_manager.get_current_version()
    assert final_version == new_version

def test_list_users():
    """Assert that GET /api/auth/users lists users."""
    response = client.get("/api/auth/users")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # The system user 'system' should be present
    usernames = [u["username"] for u in data]
    assert "system" in usernames

@pytest.mark.asyncio
async def test_notebook_crm_updates():
    """Assert that notebook close_date and assigned_to fields can be created and updated."""
    # Create notebook via API
    notebook_payload = {
        "name": "CRM Test Notebook",
        "description": "CRM Test Desc",
        "stage": "lead",
        "client_name": "Acme Corp",
        "estimated_value": 75000.0,
        "close_date": "2026-12-31",
        "assigned_to": "user:system"
    }
    
    response = client.post("/api/notebooks", json=notebook_payload)
    assert response.status_code == 200
    data = response.json()
    notebook_id = data["id"]
    
    try:
        assert data["close_date"] == "2026-12-31"
        assert data["assigned_to"] == "user:system"
        
        # Verify in DB
        res_db = await repo_query("SELECT close_date, assigned_to FROM $id;", {"id": ensure_record_id(notebook_id)})
        assert len(res_db) > 0
        assert res_db[0]["close_date"] == "2026-12-31"
        assert str(res_db[0]["assigned_to"]) == "user:system"
        
        # Update notebook
        update_payload = {
            "close_date": "2027-01-15",
            "assigned_to": None
        }
        res_update = client.put(f"/api/notebooks/{notebook_id}", json=update_payload)
        assert res_update.status_code == 200
        data_update = res_update.json()
        assert data_update["close_date"] == "2027-01-15"
        assert data_update["assigned_to"] is None
        
        # Verify update in DB
        res_db2 = await repo_query("SELECT close_date, assigned_to FROM $id;", {"id": ensure_record_id(notebook_id)})
        assert len(res_db2) > 0
        assert res_db2[0]["close_date"] == "2027-01-15"
        assert res_db2[0]["assigned_to"] is None
        
    finally:
        await repo_delete(notebook_id)
