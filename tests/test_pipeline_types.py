import pytest
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_delete, repo_query, ensure_record_id
from open_notebook.database.async_migrate import AsyncMigrationManager

client = TestClient(app)

@pytest.mark.asyncio
async def test_migration_34():
    """Assert that migration 34 runs and reverts cleanly."""
    migration_manager = AsyncMigrationManager()
    
    # Check current version
    orig_version = await migration_manager.get_current_version()
    
    # We should run migrations to make sure we're up to date
    await migration_manager.run_migration_up()
    new_version = await migration_manager.get_current_version()
    assert new_version >= 34
    
    # Down migration check (revert 34)
    await migration_manager.runner.run_one_down()
    ver_after_down = await migration_manager.get_current_version()
    assert ver_after_down == new_version - 1
    
    # Bring it back up
    await migration_manager.run_migration_up()
    final_version = await migration_manager.get_current_version()
    assert final_version == new_version

@pytest.mark.asyncio
async def test_pipeline_types_crud():
    """Assert that notebook pipeline_type fields can be created and updated with correct stage fallback handling."""
    # 1. Create a notebook with pipeline_type='research'
    notebook_payload = {
        "name": "Research Test Notebook",
        "description": "Research Test Desc",
        "stage": "queued",
        "client_name": "Test Client",
        "pipeline_type": "research"
    }
    
    response = client.post("/api/notebooks", json=notebook_payload)
    assert response.status_code == 200
    data = response.json()
    notebook_id = data["id"]
    
    try:
        assert data["pipeline_type"] == "research"
        assert data["stage"] == "queued"
        
        # Verify in DB
        res_db = await repo_query("SELECT pipeline_type, stage FROM $id;", {"id": ensure_record_id(notebook_id)})
        assert len(res_db) > 0
        assert res_db[0]["pipeline_type"] == "research"
        assert res_db[0]["stage"] == "queued"
        
        # 2. Update pipeline_type to 'publication' (without providing stage). It should default to 'concept'.
        update_payload = {
            "pipeline_type": "publication"
        }
        res_update = client.put(f"/api/notebooks/{notebook_id}", json=update_payload)
        assert res_update.status_code == 200
        data_update = res_update.json()
        assert data_update["pipeline_type"] == "publication"
        assert data_update["stage"] == "concept"
        
        # Verify update in DB
        res_db2 = await repo_query("SELECT pipeline_type, stage FROM $id;", {"id": ensure_record_id(notebook_id)})
        assert len(res_db2) > 0
        assert res_db2[0]["pipeline_type"] == "publication"
        assert res_db2[0]["stage"] == "concept"

        # 3. Update pipeline_type to 'sales' (without providing stage). It should default to 'lead'.
        update_payload_sales = {
            "pipeline_type": "sales"
        }
        res_update_sales = client.put(f"/api/notebooks/{notebook_id}", json=update_payload_sales)
        assert res_update_sales.status_code == 200
        data_update_sales = res_update_sales.json()
        assert data_update_sales["pipeline_type"] == "sales"
        assert data_update_sales["stage"] == "lead"
        
        # Verify update in DB
        res_db3 = await repo_query("SELECT pipeline_type, stage FROM $id;", {"id": ensure_record_id(notebook_id)})
        assert len(res_db3) > 0
        assert res_db3[0]["pipeline_type"] == "sales"
        assert res_db3[0]["stage"] == "lead"
        
    finally:
        await repo_delete(notebook_id)
