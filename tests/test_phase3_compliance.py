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

    # Delete asset
    del_res = client.delete(f"/api/notebooks/{notebook_id}/assets/plc-node-1")
    assert del_res.status_code == 200
    assert del_res.json() == {"message": "Asset deleted successfully"}

    # List assets again and verify deletion
    list_res2 = client.get(f"/api/notebooks/{notebook_id}/assets")
    assert list_res2.status_code == 200
    node_ids = [asset["node_id"] for asset in list_res2.json()]
    assert "plc-node-1" not in node_ids


@pytest.mark.asyncio
async def test_assessment_session_quiz_and_report():
    from open_notebook.database.repository import repo_upsert, repo_query, repo_delete
    import uuid

    # 1. Create unique identifiers
    unique_id = uuid.uuid4().hex[:8]
    cust_name = f"Cust_{unique_id}"
    reg_id = f"IEC_{unique_id}"
    reg_record_id = f"regulation:{reg_id}"

    # 2. Create customer
    cust_res = client.post("/api/customers", json={"name": cust_name})
    assert cust_res.status_code == 200
    cust_data = cust_res.json()
    customer_id = cust_data["id"]

    # 3. Create mock regulation & questions directly in DB
    # Create regulation
    await repo_upsert("regulation", reg_record_id, {
        "name": f"Framework {unique_id}",
        "fullName": f"Full Framework {unique_id}",
        "description": "Mock Test Framework",
        "questionCount": 2
    })

    # Create two questions
    q1_id = f"question:q1_{unique_id}"
    q2_id = f"question:q2_{unique_id}"
    await repo_upsert("question", q1_id, {
        "regulation_id": reg_record_id,
        "standard_code": "SR 1.1",
        "question_text": "Is access control configured?",
        "description": "Access Control Test",
        "purdue_level": 2,
        "category": "Access Control"
    })
    await repo_upsert("question", q2_id, {
        "regulation_id": reg_record_id,
        "standard_code": "SR 1.2",
        "question_text": "Is boundary protection configured?",
        "description": "Boundary Control Test",
        "purdue_level": 4,
        "category": "Boundary Protection"
    })

    try:
        # 4. Create assessment link
        assess_res = client.post("/api/assessments", json={
            "customer_id": customer_id,
            "framework_id": reg_record_id
        })
        assert assess_res.status_code == 200
        assess_data = assess_res.json()
        assessment_id = assess_data["id"]

        # 5. Start audit session
        sess_res = client.post(f"/api/assessments/{assessment_id}/sessions", json={
            "session_name": f"Session_{unique_id}",
            "carry_forward_prior": True
        })
        assert sess_res.status_code == 200
        sess_data = sess_res.json()
        session_id = sess_data["id"]

        # 6. Hydrate/Retrieve questions list
        q_res = client.get(f"/api/sessions/{session_id}/questions")
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert len(q_data) == 2
        
        # 7. Patch answers
        # Answer Y to Q1 (Access Control)
        patch1_res = client.patch(
            f"/api/sessions/{session_id}/answers/{q1_id.split(':', 1)[-1]}",
            json={"answer": "Y", "comments": "Remediation done", "evidence_url": "http://evidence.io/1"}
        )
        assert patch1_res.status_code == 200
        p1_data = patch1_res.json()
        assert p1_data["answer"] == "Y"

        # Answer N to Q2 (Boundary Protection)
        patch2_res = client.patch(
            f"/api/sessions/{session_id}/answers/{q2_id.split(':', 1)[-1]}",
            json={"answer": "N", "comments": "No boundary yet", "evidence_url": "http://evidence.io/2"}
        )
        assert patch2_res.status_code == 200
        p2_data = patch2_res.json()
        assert p2_data["answer"] == "N"

        # 8. Generate report and verify compliance score matches expected math
        report_res = client.get(f"/api/sessions/{session_id}/report")
        assert report_res.status_code == 200
        report_data = report_res.json()
        assert report_data["stats"]["compliance_score"] == 50.0
        assert report_data["stats"]["yes_count"] == 1
        assert report_data["stats"]["no_count"] == 1
        assert report_data["stats"]["total_questions"] == 2

        # 9. Lock session and assert updates are blocked
        complete_res = client.post(f"/api/sessions/{session_id}/complete")
        assert complete_res.status_code == 200
        comp_data = complete_res.json()
        assert comp_data["status"] == "COMPLETED"

        # Verify that trying to update after lock is blocked
        block_res = client.patch(
            f"/api/sessions/{session_id}/answers/{q1_id.split(':', 1)[-1]}",
            json={"answer": "N"}
        )
        assert block_res.status_code == 400
        assert block_res.json()["detail"] == "Cannot edit answers inside a completed audit session"
    finally:
        # 10. Cleanup
        await repo_delete(customer_id)
        await repo_delete(reg_record_id)
        await repo_delete(q1_id)
        await repo_delete(q2_id)
        try:
            await repo_delete(assessment_id)
        except NameError:
            pass
        try:
            await repo_delete(session_id)
        except NameError:
            pass
        try:
            await repo_query("DELETE assessment_answer WHERE session_id = $sess_id", {"sess_id": session_id})
        except Exception:
            pass


def test_edge_persistence_crud():
    notebook_id = "test-nb-999"
    # Ensure notebook exists by creating it or letting backend auto-create it
    # Create edges
    edges_payload = [
        {
            "edge_id": "edge-1",
            "source": "plc-node-1",
            "target": "fw-node-1",
            "protocol": "Modbus",
            "encrypted": False
        },
        {
            "edge_id": "edge-2",
            "source": "fw-node-1",
            "target": "hmi-node-1",
            "protocol": "HTTPS",
            "encrypted": True
        }
    ]

    # Sync edges (POST)
    res = client.post(f"/api/notebooks/{notebook_id}/edges", json=edges_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["edge_id"] == "edge-1"
    assert data[0]["protocol"] == "Modbus"
    assert data[0]["encrypted"] is False
    assert data[1]["edge_id"] == "edge-2"
    assert data[1]["protocol"] == "HTTPS"
    assert data[1]["encrypted"] is True

    # List edges (GET)
    list_res = client.get(f"/api/notebooks/{notebook_id}/edges")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert len(list_data) == 2
    
    # Sync with one edge removed and one updated (POST)
    updated_payload = [
        {
            "edge_id": "edge-2",
            "source": "fw-node-1",
            "target": "hmi-node-1",
            "protocol": "HTTPS",
            "encrypted": False # Change encryption state
        }
    ]
    res2 = client.post(f"/api/notebooks/{notebook_id}/edges", json=updated_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) == 1
    assert data2[0]["edge_id"] == "edge-2"
    assert data2[0]["encrypted"] is False

    # Check listing again
    list_res2 = client.get(f"/api/notebooks/{notebook_id}/edges")
    assert list_res2.status_code == 200
    list_data2 = list_res2.json()
    assert len(list_data2) == 1
    assert list_data2[0]["edge_id"] == "edge-2"

    # Delete edge
    del_res = client.delete(f"/api/notebooks/{notebook_id}/edges/edge-2")
    assert del_res.status_code == 200
    assert del_res.json() == {"message": "Edge deleted successfully"}

    # List edges again to verify empty
    list_res3 = client.get(f"/api/notebooks/{notebook_id}/edges")
    assert list_res3.status_code == 200
    assert len(list_res3.json()) == 0



