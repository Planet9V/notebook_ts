# Compliance Quiz & Asset Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish database persistence for drew OT assets from the network canvas, build a CSET compliance quiz wizard, and render automated compliance analytics scores in the notebook cockpit.

**Architecture:** We will create a schema-validated `asset` table in SurrealDB and expose FastAPI endpoints for canvas node persistence. Compliance quiz answers are saved to `assessment_answer` table and aggregated via SurrealQL grouping queries to calculate security metrics.

**Tech Stack:** SurrealDB v2, FastAPI (Python), React Flow (@xyflow/react), TypeScript, Tailwind CSS.

---

### Task 1: Define Asset Database Schema & Router Endpoints

**Files:**
- Create: `open_notebook/database/migrations/29.surrealql`
- Create: `open_notebook/database/migrations/29_down.surrealql`
- Modify: `api/routers/notebooks.py`
- Test: `tests/test_phase3_compliance.py`

**Step 1: Write the failing test**
Create `tests/test_phase3_compliance.py` with:
```python
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
```

**Step 2: Run test to verify it fails**
Run: `.venv/bin/pytest tests/test_phase3_compliance.py::test_asset_persistence_crud -v`
Expected: FAIL with `404 Not Found` (endpoint doesn't exist yet).

**Step 3: Implement database migrations & endpoint**
Create migration `29.surrealql` to register the `asset` table in SurrealDB:
```surrealql
DEFINE TABLE asset SCHEMAFULL;
DEFINE FIELD notebook_id ON asset TYPE string;
DEFINE FIELD node_id ON asset TYPE string;
DEFINE FIELD type ON asset TYPE string;
DEFINE FIELD purdueLevel ON asset TYPE int;
DEFINE FIELD manufacturer ON asset TYPE option<string>;
DEFINE FIELD os_version ON asset TYPE option<string>;
DEFINE FIELD firmware_version ON asset TYPE option<string>;
DEFINE FIELD ip_address ON asset TYPE option<string>;
DEFINE FIELD mac_address ON asset TYPE option<string>;
DEFINE FIELD subnet_mask ON asset TYPE option<string>;
DEFINE FIELD hostname ON asset TYPE option<string>;
DEFINE FIELD x ON asset TYPE float;
DEFINE FIELD y ON asset TYPE float;
DEFINE FIELD created ON asset TYPE datetime DEFAULT time::now();
```
Create `29_down.surrealql` containing `REMOVE TABLE asset;`.
Implement Pydantic asset schemas and CRUD endpoints in `api/routers/notebooks.py`.

**Step 4: Run test to verify it passes**
Run: `.venv/bin/pytest tests/test_phase3_compliance.py::test_asset_persistence_crud -v`
Expected: PASS.

**Step 5: Commit**
Commit changes to version control.

---

### Task 2: Connect Drawing Canvas to Asset Database

**Files:**
- Modify: `frontend/src/app/(dashboard)/notebooks/components/CSETNetworkCanvas.tsx`

**Step 1: Write mock test or UI integration checkpoint**
Add a test in `CSETNetworkCanvas.tsx` to call the `/api/notebooks/{id}/assets` endpoint on render.

**Step 2: Load assets on mount**
Fetch current canvas nodes/edges from `/api/notebooks/{id}/assets` inside a `useEffect` on canvas mount, rather than loading static presets.

**Step 3: Save asset movements**
Add a debounced listener on `onNodeDragStop` and custom property modifications that calls `POST /api/notebooks/{id}/assets` to save positions and configuration.

**Step 4: Verify frontend type-safety**
Run: `npx tsc --noEmit` inside `frontend`
Expected: exit 0.

**Step 5: Commit**
Commit changes.

---

### Task 3: Build CSET Compliance Quiz Wizard

**Files:**
- Create: `api/routers/assessments.py`
- Modify: `api/main.py`
- Modify: `frontend/src/app/(dashboard)/notebooks/components/B2BDraftingWorkspace.tsx`
- Test: `tests/test_phase3_compliance.py`

**Step 1: Write the failing test**
Add `test_assessment_quiz` to `tests/test_phase3_compliance.py` checking loading questions and recording answers.

**Step 2: Run test to verify it fails**
Run: `.venv/bin/pytest tests/test_phase3_compliance.py::test_assessment_quiz -v`
Expected: FAIL.

**Step 3: Implement Quiz Router endpoints**
Add `GET /api/assessments/{id}/questions` and `POST /api/assessments/{id}/answers` inside the assessments router, registering it in `api/main.py`.

**Step 4: Build Quiz UI Panel**
Create an interactive quiz list panel inside `B2BDraftingWorkspace.tsx` displaying fetched questions and binding option changes directly to answer persistence.

**Step 5: Run tests and verify they pass**
Run: `.venv/bin/pytest tests/test_phase3_compliance.py::test_assessment_quiz -v`
Expected: PASS.

**Step 6: Commit**
Commit changes.

---

### Task 4: Compliance scoring aggregate queries & Analytics Dashboard

**Files:**
- Modify: `api/routers/assessments.py`
- Modify: `frontend/src/app/(dashboard)/notebooks/components/B2BDraftingWorkspace.tsx`
- Test: `tests/test_phase3_compliance.py`

**Step 1: Write scoring test case**
Add `test_assessment_scoring` asserting that answering questions updates category compliance aggregates.

**Step 2: Run test to verify it fails**
Run: `.venv/bin/pytest tests/test_phase3_compliance.py::test_assessment_scoring -v`
Expected: FAIL.

**Step 3: Implement aggregate SQL scorer endpoint**
Write a SurrealQL query executing `GROUP BY category` count aggregates for overall compliance computations:
```surrealql
SELECT category, count(answer = 'Y') as yes_count, count() as total_count FROM assessment_answer GROUP BY category;
```
Expose this via `GET /api/assessments/{id}/score`.

**Step 4: Render progress indicator chart**
Integrate progress indicators and summary cockpit scoring cards inside the UI workspace.

**Step 5: Verify all tests and type checks**
Run: `.venv/bin/pytest` and `npx tsc --noEmit`
Expected: 100% green pass.

**Step 6: Commit**
Commit changes.
