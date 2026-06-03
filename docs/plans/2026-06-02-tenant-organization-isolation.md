# Tenant & Organization Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement database-level organization schemas, multi-tenant workspace isolation, and append-only activity audit logging inside SurrealDB to separate tenant boundaries.

**Architecture:** Create an `organization` table and link `user` and `notebook` records. Existing notebooks and users will be automatically backfilled to an `org_admin` record during migration. A new `file_audit_log` table will log user file operations (upload, download, read, modify) in SurrealDB.

**Tech Stack:** SurrealDB v2, FastAPI, Pytest.

---

### Task 1: Database Migration for Organization and Multi-Tenancy

**Files:**
- Create: [31.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/31.surrealql)
- Create: [31_down.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/31_down.surrealql)
- Modify: [async_migrate.py](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/async_migrate.py)

**Step 1: Write the migration files**

Create [31.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/31.surrealql):
```surrealql
-- Migration 31: Tenant & Organization Isolation
DEFINE TABLE organization SCHEMALESS;
DEFINE FIELD name ON organization TYPE string;
DEFINE FIELD type ON organization TYPE string ASSERT $value INSIDE ['admin', 'customer'];
DEFINE FIELD status ON organization TYPE string DEFAULT 'active' ASSERT $value INSIDE ['active', 'suspended', 'inactive'];
DEFINE FIELD created ON organization TYPE datetime DEFAULT time::now();
DEFINE FIELD updated ON organization TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX org_name ON organization COLUMNS name UNIQUE;

-- Create default admin organization
CREATE organization:org_admin SET name = 'admin', type = 'admin', status = 'active';

-- Add organization relation to user and notebook
DEFINE FIELD organization ON user TYPE record<organization>;
DEFINE FIELD organization ON notebook TYPE record<organization>;

-- Backfill existing records to admin organization
UPDATE user SET organization = organization:org_admin;
UPDATE notebook SET organization = organization:org_admin;

-- Audit logs table
DEFINE TABLE file_audit_log SCHEMALESS;
DEFINE FIELD user ON file_audit_log TYPE record<user>;
DEFINE FIELD organization ON file_audit_log TYPE record<organization>;
DEFINE FIELD action ON file_audit_log TYPE string ASSERT $value INSIDE ['upload', 'download', 'delete', 'read', 'modify'];
DEFINE FIELD target_type ON file_audit_log TYPE string ASSERT $value INSIDE ['source', 'note', 'report', 'sow'];
DEFINE FIELD target_id ON file_audit_log TYPE string;
DEFINE FIELD file_path ON file_audit_log TYPE string;
DEFINE FIELD ip_address ON file_audit_log TYPE option<string>;
DEFINE FIELD user_agent ON file_audit_log TYPE option<string>;
DEFINE FIELD timestamp ON file_audit_log TYPE datetime DEFAULT time::now();
```

Create [31_down.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/31_down.surrealql):
```surrealql
REMOVE TABLE file_audit_log;
REMOVE FIELD organization ON notebook;
REMOVE FIELD organization ON user;
REMOVE TABLE organization;
```

**Step 2: Register migration in async_migrate.py**

Modify [async_migrate.py](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/async_migrate.py) to append `31.surrealql` and `31_down.surrealql` to `up_migrations` and `down_migrations`.

**Step 3: Verify migration registers and applies on test client**

Run: `.venv/bin/pytest tests/test_config_api.py -v`
Expected: PASS (checks that migrations compile and apply correctly).

**Step 4: Commit**
```bash
git add open_notebook/database/migrations/31.surrealql open_notebook/database/migrations/31_down.surrealql open_notebook/database/async_migrate.py
git commit -m "migration: add organization and audit logging tables"
```

---

### Task 2: Update Pydantic Models for Organizations and Users

**Files:**
- Modify: [models.py](file:///Users/jimmcknney/notebook_tetrel/api/models.py)

**Step 1: Write failing tests for model parsing**

Add to [test_domain.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_domain.py):
```python
def test_organization_model_schemas():
    from api.models import OrganizationCreate, OrganizationResponse
    # Create request
    org = OrganizationCreate(name="Customer A", type="customer")
    assert org.name == "Customer A"
    assert org.type == "customer"
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_domain.py::test_organization_model_schemas -v`
Expected: FAIL with `ImportError: cannot import name 'OrganizationCreate'`

**Step 3: Implement minimal Pydantic schemas**

Add to [models.py](file:///Users/jimmcknney/notebook_tetrel/api/models.py):
```python
class OrganizationCreate(BaseModel):
    name: str
    type: str = "customer" # admin or customer
    status: str = "active"

class OrganizationResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    created: str
```
Also update `UserResponse` and `NotebookResponse` to include `organization: Optional[str] = None`.

**Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_domain.py::test_organization_model_schemas -v`
Expected: PASS

**Step 5: Commit**
```bash
git add api/models.py tests/test_domain.py
git commit -m "models: define Pydantic schemas for multi-tenancy"
```

---

### Task 3: Implement Backend Router for Organizations CRUD

**Files:**
- Create: [organizations.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/organizations.py)
- Modify: [main.py](file:///Users/jimmcknney/notebook_tetrel/api/main.py)

**Step 1: Write a failing integration test**

Create [test_organizations_api.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_organizations_api.py):
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_organizations_crud():
    payload = {"name": "Test Org 1", "type": "customer"}
    res = client.post("/api/organizations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Org 1"
    
    # List organizations
    list_res = client.get("/api/organizations")
    assert list_res.status_code == 200
    org_names = [org["name"] for org in list_res.json()]
    assert "Test Org 1" in org_names
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_organizations_api.py -v`
Expected: FAIL with 404 Not Found on POST /api/organizations.

**Step 3: Implement endpoints in organizations.py**

Create [organizations.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/organizations.py):
```python
from fastapi import APIRouter, HTTPException
from typing import List
from api.models import OrganizationCreate, OrganizationResponse
from open_notebook.database.repository import repo_upsert, repo_query, repo_delete
import uuid

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])

@router.post("", response_model=OrganizationResponse)
async def create_organization(payload: OrganizationCreate):
    org_id = f"organization:{uuid.uuid4().hex[:8]}"
    record = {
        "id": org_id,
        "name": payload.name,
        "type": payload.type,
        "status": payload.status,
        "created": "time::now()",
    }
    await repo_upsert("organization", org_id, record)
    
    # Return formatted response
    return OrganizationResponse(
        id=org_id,
        name=payload.name,
        type=payload.type,
        status=payload.status,
        created="now"
    )

@router.get("", response_model=List[OrganizationResponse])
async def list_organizations():
    orgs = await repo_query("SELECT * FROM organization ORDER BY name;")
    return [
        OrganizationResponse(
            id=org["id"],
            name=org["name"],
            type=org["type"],
            status=org["status"],
            created=str(org.get("created", ""))
        )
        for org in orgs
    ]
```

Register the router in [main.py](file:///Users/jimmcknney/notebook_tetrel/api/main.py):
```python
from api.routers import organizations
app.include_router(organizations.router)
```

**Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_organizations_api.py -v`
Expected: PASS

**Step 5: Commit**
```bash
git add api/routers/organizations.py api/main.py tests/test_organizations_api.py
git commit -m "api: implement organizations CRUD router endpoints"
```

---

### Task 4: Tenant Boundary Isolation in Workspaces

**Files:**
- Modify: [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py)

**Step 1: Write a failing validation test**

Add to [test_organizations_api.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_organizations_api.py):
```python
@pytest.mark.asyncio
async def test_tenant_boundary_isolation():
    # Setup test orgs directly in SurrealDB
    from open_notebook.database.repository import repo_upsert, repo_query, repo_delete
    
    # Org A & Notebook A
    await repo_upsert("organization", "organization:org_a", {"name": "Org A", "type": "customer"})
    await repo_upsert("notebook", "notebook:nb_a", {"title": "Notebook A", "organization": "organization:org_a"})
    
    # Org B & Notebook B
    await repo_upsert("organization", "organization:org_b", {"name": "Org B", "type": "customer"})
    await repo_upsert("notebook", "notebook:nb_b", {"title": "Notebook B", "organization": "organization:org_b"})
    
    try:
        # Mock active user role from Org B attempting to fetch Notebook A
        # (Asserting endpoint enforces organization filter matching the user's organization)
        # Note: In development mode, endpoints resolve the query parameter or session context organization
        res = client.get("/api/notebooks?organization_id=organization:org_b")
        assert res.status_code == 200
        titles = [nb["title"] for nb in res.json()]
        assert "Notebook B" in titles
        assert "Notebook A" not in titles
    finally:
        await repo_delete("notebook:nb_a")
        await repo_delete("notebook:nb_b")
        await repo_delete("organization:org_a")
        await repo_delete("organization:org_b")
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_organizations_api.py::test_tenant_boundary_isolation -v`
Expected: FAIL (both notebooks are listed since filter is not yet applied).

**Step 3: Implement organization boundary query scoping**

Modify `list_notebooks` in [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py):
```python
@router.get("", response_model=List[NotebookResponse])
async def list_notebooks(organization_id: Optional[str] = None):
    # Filter notebooks scoped to the requested organization
    if organization_id:
        notebooks = await repo_query(
            "SELECT * FROM notebook WHERE organization = $org_id ORDER BY created DESC;",
            {"org_id": organization_id}
        )
    else:
        notebooks = await repo_query("SELECT * FROM notebook ORDER BY created DESC;")
    ...
```

**Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_organizations_api.py::test_tenant_boundary_isolation -v`
Expected: PASS

**Step 5: Commit**
```bash
git add api/routers/notebooks.py tests/test_organizations_api.py
git commit -m "api: scope notebook listings to organization boundaries"
```

---

### Task 5: SurrealDB Audit Logging for Document Actions

**Files:**
- Modify: [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py)

**Step 1: Write a failing audit log test**

Add to [test_organizations_api.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_organizations_api.py):
```python
@pytest.mark.asyncio
async def test_file_audit_logging():
    from open_notebook.database.repository import repo_query
    
    # Trigger source registration/action
    # Asserts that file operations write records to the file_audit_log table
    res = client.post("/api/notebooks/test-nb-999/assets", json={
        "notebook_id": "test-nb-999",
        "node_id": "plc-99",
        "type": "plc",
        "purdueLevel": 1
    })
    
    # Query SurrealDB file_audit_log
    logs = await repo_query("SELECT * FROM file_audit_log ORDER BY timestamp DESC LIMIT 1;")
    assert len(logs) > 0
    assert logs[0]["action"] in ["upload", "download", "modify", "read"]
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_organizations_api.py::test_file_audit_logging -v`
Expected: FAIL (no logs are written to the database).

**Step 3: Implement audit logger calls in endpoints**

Add logging function inside [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py):
```python
async def log_file_action(user_id: str, org_id: str, action: str, target_type: str, target_id: str, file_path: str):
    log_id = f"file_audit_log:{uuid.uuid4().hex[:8]}"
    record = {
        "id": log_id,
        "user": user_id,
        "organization": org_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "file_path": file_path,
        "timestamp": "time::now()"
    }
    await repo_upsert("file_audit_log", log_id, record)
```
Call this function inside the asset creation/modification routes and source upload routes (e.g. `save_notebook_asset`, `upload_notebook_source`).

**Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_organizations_api.py::test_file_audit_logging -v`
Expected: PASS

**Step 5: Commit**
```bash
git add api/routers/notebooks.py tests/test_organizations_api.py
git commit -m "api: implement SurrealDB-based file activity audit logging"
```
