"""
Integration and unit tests for Google Workspace & DOCX Exporters.
"""
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from api.main import app
    return TestClient(app)

class TestDOCXCompiler:
    @patch("open_notebook.domain.styleguide.StyleGuide.get", new_callable=AsyncMock)
    @patch("open_notebook.domain.styleguide.StyleGuide.get_all", new_callable=AsyncMock)
    @pytest.mark.asyncio
    async def test_compile_markdown_to_docx_default(self, mock_get_all, mock_get):
        from api.routers.notebooks import compile_markdown_to_docx
        import os
        
        mock_get_all.return_value = []
        markdown_text = "# SOW Section\nThis is normal text.\n- Bullet point 1\n* Bullet point 2\n> Blockquote text"
        
        file_path = await compile_markdown_to_docx(markdown_text, "Acme Corp")
        assert os.path.exists(file_path)
        assert file_path.endswith(".docx")
        os.remove(file_path)

    @patch("open_notebook.domain.styleguide.StyleGuide.get", new_callable=AsyncMock)
    @pytest.mark.asyncio
    async def test_compile_markdown_to_docx_with_styleguide(self, mock_get):
        from api.routers.notebooks import compile_markdown_to_docx
        from open_notebook.domain.styleguide import StyleGuide
        import os
        
        mock_sg = StyleGuide(
            id="styleguide:sg1",
            name="Sleek Dark",
            primary_color="#1e3a8a",
            secondary_color="#0284c7",
            accent_color="#334155",
            body_font="Arial",
            body_size="12pt",
            title_font="Times New Roman",
            title_size="24pt",
            heading_size="18pt",
            subheading_size="14pt",
            margin_top="1.25in",
            margin_bottom="1.25in",
            margin_left="1.25in",
            margin_right="1.25in"
        )
        mock_get.return_value = mock_sg
        
        markdown_text = "# Big Title\nSome content text."
        file_path = await compile_markdown_to_docx(markdown_text, "Acme Corp", "styleguide:sg1")
        assert os.path.exists(file_path)
        os.remove(file_path)


class TestGoogleWorkspaceExporters:
    @patch("open_notebook.domain.credential.Credential.get", new_callable=AsyncMock)
    def test_export_gdocs_simulated(self, mock_cred_get, client):
        # When Credential.get raises error or returns empty fields, it should fallback to simulation
        mock_cred_get.side_effect = Exception("Not Found")
        
        response = client.post("/api/notebooks/export/gdocs", json={
            "markdown": "# Header\nContent",
            "clientName": "Test Client"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "simulated" in data["message"]
        assert "doc_id" in data
        assert "doc_url" in data

    @patch("open_notebook.domain.credential.Credential.get", new_callable=AsyncMock)
    def test_export_gslides_simulated(self, mock_cred_get, client):
        mock_cred_get.side_effect = Exception("Not Found")
        
        response = client.post("/api/notebooks/export/gslides", json={
            "clientName": "Test Client",
            "topology": {
                "nodes": [
                    {"id": "node1", "type": "device", "x": 100, "y": 100, "purdueLevel": 1}
                ],
                "edges": []
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "simulated" in data["message"]
        assert "presentation_url" in data

    @patch("open_notebook.domain.credential.Credential.get", new_callable=AsyncMock)
    def test_export_gsheets_simulated(self, mock_cred_get, client):
        mock_cred_get.side_effect = Exception("Not Found")
        
        response = client.post("/api/notebooks/export/gsheets", json={
            "clientName": "Test Client",
            "notebookId": "notebook:nb1",
            "scorecard": [
                {"badge": "Requirement 1", "description": "Ensure secure authentication", "specSource": "NIST SP 800-82", "verified": True}
            ]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "simulated" in data["message"]
        assert "spreadsheet_url" in data
