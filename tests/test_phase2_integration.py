import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client using api.main.app."""
    from api.main import app
    return TestClient(app)


class TestPhase2Integration:
    """Integration test suite for Compliance & Network Validation Engine Phase 2 features."""

    def test_custom_prompts_crud(self, client):
        """Test custom prompts database persistence and retrieval endpoints."""
        notebook_id = "test-nb-123"
        agent_name = "Skeptic Reviewer"
        prompt_text = "You are a hardware security skeptic. Flag everything."

        # 1. Save prompt (POST)
        save_payload = {
            "notebook_id": notebook_id,
            "agent_name": agent_name,
            "prompt_text": prompt_text
        }
        save_res = client.post("/api/agents/prompts", json=save_payload)
        assert save_res.status_code == 200
        save_data = save_res.json()
        assert save_data["notebook_id"] == notebook_id
        assert save_data["agent_name"] == agent_name
        assert save_data["prompt_text"] == prompt_text
        assert "id" in save_data

        # 2. List prompts (GET)
        list_res = client.get(f"/api/agents/prompts/{notebook_id}")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert len(list_data) >= 1
        matched = [p for p in list_data if p["agent_name"] == agent_name]
        assert len(matched) == 1
        assert matched[0]["prompt_text"] == prompt_text

    def test_cve_grounding_scans(self, client):
        """Test that device OS/firmware matches flag CVE vulnerabilities and block requirements verification."""
        payload = {
            "nodes": [
                {
                    "id": "node-vulnerable-plc",
                    "type": "plc",
                    "purdueLevel": 1,
                    "manufacturer": "Siemens",
                    "os_version": "S7-1200",
                    "firmware_version": "4.4.0" # Vulnerable since < 4.5.0
                },
                {
                    "id": "node-vulnerable-switch",
                    "type": "switch",
                    "purdueLevel": 4,
                    "manufacturer": "Cisco",
                    "os_version": "IOS",
                    "firmware_version": "15.2" # Vulnerable since < 15.9
                },
                {
                    "id": "node-safe-firewall",
                    "type": "firewall",
                    "purdueLevel": 3,
                    "manufacturer": "Fortinet",
                    "os_version": "FortiOS",
                    "firmware_version": "7.0.5" # Safe
                }
            ],
            "edges": [
                {"id": "edge-1", "source": "node-vulnerable-plc", "target": "node-safe-firewall"},
                {"id": "edge-2", "source": "node-safe-firewall", "target": "node-vulnerable-switch"}
            ]
        }

        response = client.post("/api/graph/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify node violations contain correct CVE warnings
        assert "node-vulnerable-plc" in data["violatedNodes"]
        assert "node-vulnerable-switch" in data["violatedNodes"]
        assert "node-vulnerable-plc" in data["nodeViolations"]
        assert "node-vulnerable-switch" in data["nodeViolations"]

        plc_violations = data["nodeViolations"]["node-vulnerable-plc"]
        assert any("CVE-2021-37203" in v for v in plc_violations)
        assert any("Siemens S7-1200" in v for v in plc_violations)

        switch_violations = data["nodeViolations"]["node-vulnerable-switch"]
        assert any("CVE-2023-20198" in v for v in switch_violations)
        assert any("Cisco IOS" in v for v in switch_violations)

        # Verify requirements verification is blocked due to critical vulnerabilities
        assert len(data["verifiedRequirements"]) == 0

    def test_run_agent_pipeline(self, client):
        """Test multi-agent programmatical pipeline execution, model cost tracking, and thought logs."""
        payload = {
            "notebookId": "test-nb-123",
            "sowContent": "Scope of work for cryptographic silicon audit.",
            "topology": {
                "nodes": [
                    {
                        "id": "node-field-plc",
                        "type": "deviceNode",
                        "data": {
                            "label": "Field PLC",
                            "deviceType": "plc",
                            "purdueLevel": 1,
                            "manufacturer": "Siemens",
                            "os_version": "S7-1200",
                            "firmware_version": "4.4.0"
                        }
                    }
                ],
                "edges": []
            },
            "agentConfigs": [
                {"task": "Topology Auditor", "model": "gpt-4o-mini", "temp": 0.0},
                {"task": "Skeptic Reviewer", "model": "claude-3-5-sonnet", "temp": 0.2}
            ],
            "customPrompts": {
                "Topology Auditor": "Audit this: {{topology_graph}}",
                "Skeptic Reviewer": "Audit this: {{sow_content}}"
            }
        }

        response = client.post("/api/agents/run-pipeline", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert len(data["steps"]) == 2
        assert len(data["objections"]) >= 1
        assert data["cost"] > 0.0

        # Assert step logs are formatted properly
        step_names = [s["name"] for s in data["steps"]]
        assert "Topology Auditor" in step_names
        assert "Skeptic Reviewer" in step_names
        assert all(s["status"] == "success" for s in data["steps"])
        assert all(s["latency"] > 0 for s in data["steps"])

    def test_proposal_export_docx(self, client):
        """Test compiling proposal markdown content into high-fidelity DOCX download binary."""
        markdown_text = (
            "# Proposal Draft\n"
            "## 1. Scope of Services\n"
            "This is a test of python-docx compile.\n"
            "| Requirement | Status |\n"
            "| --- | --- |\n"
            "| **HS-50** | Verified |\n"
        )
        payload = {
            "markdown": markdown_text,
            "clientName": "Test Client Corp"
        }

        response = client.post("/api/notebooks/export", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert response.headers["content-disposition"] == 'attachment; filename="SOW_Test_Client_Corp_Tetrel.docx"'
        
        # Verify it has some binary file content
        assert len(response.content) > 1000

    def test_proposal_export_markdown(self, client):
        """Test exporting SOW proposal draft as Markdown text file."""
        markdown_text = "# Proposal Draft\nThis is a test markdown document."
        payload = {
            "markdown": markdown_text,
            "clientName": "Test Client Corp"
        }

        response = client.post("/api/notebooks/export/markdown", json=payload)
        assert response.status_code == 200
        assert "text/markdown" in response.headers["content-type"]
        assert response.headers["content-disposition"] == 'attachment; filename="SOW_Test_Client_Corp_Tetrel.md"'
        assert response.text == markdown_text

    def test_proposal_export_gdocs(self, client):
        """Test exporting SOW proposal draft to Google Docs."""
        markdown_text = "# Proposal Draft\nThis is a test Google Doc."
        payload = {
            "markdown": markdown_text,
            "clientName": "Test Client Corp"
        }

        response = client.post("/api/notebooks/export/gdocs", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "doc_id" in data
        assert "doc_url" in data
        assert "message" in data

