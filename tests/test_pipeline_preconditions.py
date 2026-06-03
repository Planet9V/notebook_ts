import pytest
import asyncio
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_delete, repo_query, repo_upsert, ensure_record_id
import uuid

client = TestClient(app)

@pytest.fixture
def cleanup_notebooks():
    created_ids = []
    yield created_ids
    async def run_cleanups():
        for cid in created_ids:
            try:
                await repo_delete(cid)
            except Exception:
                pass
    asyncio.run(run_cleanups())

def test_sales_pipeline_stage_transition_constraints(cleanup_notebooks):
    """Test stage transition pre-conditions for the Sales pipeline."""
    # 1. Create a notebook in 'lead' stage with no assignee or close date
    notebook_payload = {
        "name": "Precondition Test Sales",
        "description": "Sales deal validation",
        "stage": "lead",
        "client_name": "Test Client",
        "pipeline_type": "sales",
        "assigned_to": None,
        "close_date": None
    }
    
    response = client.post("/api/notebooks", json=notebook_payload)
    assert response.status_code == 200
    data = response.json()
    nb_id = data["id"]
    cleanup_notebooks.append(nb_id)
    
    # 2. Try to move to 'research' stage (should fail because assignee and close_date are missing)
    res_fail = client.put(f"/api/notebooks/{nb_id}", json={"stage": "research"})
    assert res_fail.status_code == 400
    assert "must have an assignee and close date" in res_fail.json()["detail"]
    
    # 3. Configure assignee and close date
    res_configure = client.put(f"/api/notebooks/{nb_id}", json={
        "assigned_to": "user:system",
        "close_date": "2026-12-31"
    })
    assert res_configure.status_code == 200
    
    # 4. Try to move to 'research' stage again (should succeed now)
    res_ok = client.put(f"/api/notebooks/{nb_id}", json={"stage": "research"})
    assert res_ok.status_code == 200
    
    # 5. Try to move to 'proposal' stage (should fail because no sources or notes are connected)
    res_fail_proposal = client.put(f"/api/notebooks/{nb_id}", json={"stage": "proposal"})
    assert res_fail_proposal.status_code == 400
    assert "At least one source document or research note must be added" in res_fail_proposal.json()["detail"]

    # 6. Add a research note to the notebook
    # First create note in SurrealDB and relate it
    note_payload = {
        "title": "Sales Research Note",
        "content": "Valuable sales specs",
        "note_type": "human"
    }
    note_res = client.post(f"/api/projects", json={"name": "Sales Project", "description": ""})
    assert note_res.status_code in (200, 201)
    proj_id = note_res.json()["id"]
    cleanup_notebooks.append(proj_id)
    
    async def create_and_relate_note():
        note_rec = await repo_upsert("note", None, {"title": "Sales Note", "content": "Valuable specs"})
        n_id = note_rec[0]["id"]
        cleanup_notebooks.append(n_id)
        await repo_query("RELATE $note_id->artifact->$nb_id", {"note_id": ensure_record_id(n_id), "nb_id": ensure_record_id(nb_id)})
    asyncio.run(create_and_relate_note())

    # 7. Try to move to 'proposal' stage (should succeed now)
    res_ok_proposal = client.put(f"/api/notebooks/{nb_id}", json={"stage": "proposal"})
    assert res_ok_proposal.status_code == 200


def test_research_pipeline_stage_transition_constraints(cleanup_notebooks):
    """Test stage transition pre-conditions for the Research pipeline."""
    unique_id = uuid.uuid4().hex[:8]
    cust_name = f"ResearchCust_{unique_id}"
    
    # Create customer
    cust_res = client.post("/api/customers", json={"name": cust_name})
    assert cust_res.status_code == 200
    cust_data = cust_res.json()
    customer_id = cust_data["id"]
    cleanup_notebooks.append(customer_id)

    # 1. Create a notebook in 'queued' stage (Research pipeline)
    notebook_payload = {
        "name": "Precondition Test Research",
        "description": "Research validation",
        "stage": "queued",
        "client_name": "Test Client",
        "pipeline_type": "research",
        "customer_id": customer_id,
        "assigned_to": None,
        "close_date": None
    }
    
    response = client.post("/api/notebooks", json=notebook_payload)
    assert response.status_code == 200
    data = response.json()
    nb_id = data["id"]
    cleanup_notebooks.append(nb_id)
    
    # 2. Try to move to 'researching' (should fail - no assignee/date)
    res_fail = client.put(f"/api/notebooks/{nb_id}", json={"stage": "researching"})
    assert res_fail.status_code == 400
    assert "must have an assignee and target date" in res_fail.json()["detail"]
    
    # 3. Configure assignee and close date
    res_configure = client.put(f"/api/notebooks/{nb_id}", json={
        "assigned_to": "user:system",
        "close_date": "2026-12-31"
    })
    assert res_configure.status_code == 200
    
    # 4. Try to move to 'completed' stage (should fail because compliance quiz session is missing or not locked)
    res_fail_comp = client.put(f"/api/notebooks/{nb_id}", json={"stage": "completed"})
    assert res_fail_comp.status_code == 400
    assert "compliance quiz session must be completed and locked" in res_fail_comp.json()["detail"]

    # 5. Create and lock a compliance session for the customer
    reg_id = f"IEC_{unique_id}"
    reg_record_id = f"regulation:{reg_id}"
    
    async def setup_cset_framework_and_lock():
        await repo_upsert("regulation", reg_record_id, {
            "name": f"Framework {unique_id}",
            "fullName": f"Full Framework {unique_id}",
            "description": "Mock Test",
            "questionCount": 1
        })
        cleanup_notebooks.append(reg_record_id)

        q1_id = f"question:q1_{unique_id}"
        await repo_upsert("question", q1_id, {
            "regulation_id": reg_record_id,
            "standard_code": "SR 1.1",
            "question_text": "Configured?",
            "purdue_level": 1,
            "category": "Access Control"
        })
        cleanup_notebooks.append(q1_id)
    asyncio.run(setup_cset_framework_and_lock())

    assess_res = client.post("/api/assessments", json={
        "customer_id": customer_id,
        "framework_id": reg_record_id
    })
    assert assess_res.status_code == 200
    assessment_id = assess_res.json()["id"]
    cleanup_notebooks.append(assessment_id)

    sess_res = client.post(f"/api/assessments/{assessment_id}/sessions", json={
        "session_name": f"Session_{unique_id}",
        "carry_forward_prior": False
    })
    assert sess_res.status_code == 200
    session_id = sess_res.json()["id"]
    cleanup_notebooks.append(session_id)

    # Locking session
    complete_res = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_res.status_code == 200

    # 6. Try to move to 'completed' stage (should succeed now)
    res_ok_comp = client.put(f"/api/notebooks/{nb_id}", json={"stage": "completed"})
    assert res_ok_comp.status_code == 200
