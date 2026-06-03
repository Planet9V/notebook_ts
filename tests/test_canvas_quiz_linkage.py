import pytest
from fastapi.testclient import TestClient
from api.main import app
from open_notebook.database.repository import repo_upsert, repo_query, repo_delete

client = TestClient(app)

@pytest.mark.asyncio
async def test_canvas_quiz_linkage():
    # 1. Create a unique customer
    cust_res = client.post("/api/customers", json={"name": "Canvas Quiz Linkage Test Customer"})
    assert cust_res.status_code == 200
    cust_data = cust_res.json()
    customer_id = cust_data["id"]

    try:
        # 2. Create a notebook linked to this customer
        # We need to hit POST /api/notebooks if it exists or create directly in DB.
        # Let's see if POST /api/notebooks exists in main.py. Yes, it's a standard endpoint.
        nb_res = client.post("/api/notebooks", json={
            "name": "Linkage Test Notebook",
            "customer_id": customer_id
        })
        assert nb_res.status_code == 200
        nb_data = nb_res.json()
        notebook_id = nb_data["id"]

        # Ensure the asset table is clean for this notebook
        await repo_query("DELETE asset WHERE notebook_id = $nb_id", {"nb_id": notebook_id})

        # 3. Create assessment for regulation:Components
        assess_res = client.post("/api/assessments", json={
            "customer_id": customer_id,
            "framework_id": "regulation:Components"
        })
        assert assess_res.status_code == 200
        assess_data = assess_res.json()
        assessment_id = assess_data["id"]

        # 4. Start session
        sess_res = client.post(f"/api/assessments/{assessment_id}/sessions", json={
            "session_name": "Linkage Live Session",
            "carry_forward_prior": True
        })
        assert sess_res.status_code == 200
        sess_data = sess_res.json()
        session_id = sess_data["id"]

        # 5. Fetch questions with NO assets on canvas
        q_res = client.get(f"/api/sessions/{session_id}/questions")
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert len(q_data) > 0

        # With no assets, component-specific questions (e.g. PLC, Firewall, HMI) must be NA
        plc_questions = [q for q in q_data if q["standard_code"].startswith("PLC") or q["standard_code"].startswith("DCS")]
        fw_questions = [q for q in q_data if q["standard_code"].startswith("Firewall") or q["standard_code"].startswith("VPN")]
        
        # Verify they are all marked as NA initially
        for q in plc_questions:
            assert q["answer"] == "NA"
        for q in fw_questions:
            assert q["answer"] == "NA"

        # 6. Add a PLC asset
        plc_asset_payload = {
            "notebook_id": notebook_id,
            "node_id": "node-plc-test",
            "type": "plc",
            "purdueLevel": 1,
            "x": 100.0,
            "y": 100.0
        }
        plc_asset_res = client.post(f"/api/notebooks/{notebook_id}/assets", json=plc_asset_payload)
        assert plc_asset_res.status_code == 200

        # 7. Fetch questions again - PLC questions should be active ("U" or user answer), not "NA"
        q_res_plc = client.get(f"/api/sessions/{session_id}/questions")
        assert q_res_plc.status_code == 200
        q_data_plc = q_res_plc.json()

        plc_questions_after = [q for q in q_data_plc if q["standard_code"].startswith("PLC") or q["standard_code"].startswith("DCS")]
        fw_questions_after = [q for q in q_data_plc if q["standard_code"].startswith("Firewall") or q["standard_code"].startswith("VPN")]

        # PLC should now be active (answer is U/Unanswered by default)
        assert len(plc_questions_after) > 0
        for q in plc_questions_after:
            assert q["answer"] == "U"

        # Firewall questions should STILL be NA
        for q in fw_questions_after:
            assert q["answer"] == "NA"

        # 8. Add a Firewall asset
        fw_asset_payload = {
            "notebook_id": notebook_id,
            "node_id": "node-fw-test",
            "type": "firewall",
            "purdueLevel": 3,
            "x": 200.0,
            "y": 200.0
        }
        fw_asset_res = client.post(f"/api/notebooks/{notebook_id}/assets", json=fw_asset_payload)
        assert fw_asset_res.status_code == 200

        # 9. Fetch questions again - both PLC and Firewall should be active
        q_res_both = client.get(f"/api/sessions/{session_id}/questions")
        assert q_res_both.status_code == 200
        q_data_both = q_res_both.json()

        plc_questions_both = [q for q in q_data_both if q["standard_code"].startswith("PLC") or q["standard_code"].startswith("DCS")]
        fw_questions_both = [q for q in q_data_both if q["standard_code"].startswith("Firewall") or q["standard_code"].startswith("VPN")]

        for q in plc_questions_both:
            assert q["answer"] == "U"
        for q in fw_questions_both:
            assert q["answer"] == "U"

        # 10. Delete the PLC asset
        del_res = client.delete(f"/api/notebooks/{notebook_id}/assets/node-plc-test")
        assert del_res.status_code == 200

        # 11. Fetch questions again - PLC should go back to NA, Firewall should remain active
        q_res_final = client.get(f"/api/sessions/{session_id}/questions")
        assert q_res_final.status_code == 200
        q_data_final = q_res_final.json()

        plc_questions_final = [q for q in q_data_final if q["standard_code"].startswith("PLC") or q["standard_code"].startswith("DCS")]
        fw_questions_final = [q for q in q_data_final if q["standard_code"].startswith("Firewall") or q["standard_code"].startswith("VPN")]

        for q in plc_questions_final:
            assert q["answer"] == "NA"
        for q in fw_questions_final:
            assert q["answer"] == "U"

    finally:
        # Cleanup database records
        await repo_delete(customer_id)
        if 'notebook_id' in locals():
            await repo_delete(notebook_id)
            await repo_query("DELETE asset WHERE notebook_id = $nb_id", {"nb_id": notebook_id})
        if 'assessment_id' in locals():
            await repo_delete(assessment_id)
        if 'session_id' in locals():
            await repo_delete(session_id)
            await repo_query("DELETE assessment_answer WHERE session_id = $sess_id", {"sess_id": session_id})
