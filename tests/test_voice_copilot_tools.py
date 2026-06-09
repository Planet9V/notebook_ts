from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from api.main import app

@pytest.fixture
def client():
    """Create test client for voice tools API."""
    return TestClient(app)

class TestVoiceCopilotToolsAPI:
    """Test suite for voice assistant co-pilot tool schemas and execution."""

    def test_get_tools_schema(self, client):
        """Test GET /api/voice/tools/schema returns the correct JSON schemas."""
        response = client.get("/api/voice/tools/schema")
        assert response.status_code == 200
        data = response.json()
        
        assert "tools" in data
        tools = data["tools"]
        assert len(tools) == 6
        
        tool_names = [t["function"]["name"] for t in tools]
        assert "query_graph_edges" in tool_names
        assert "edit_note" in tool_names
        assert "trigger_export" in tool_names
        assert "search_research_corpus" in tool_names
        assert "query_skills" in tool_names
        assert "query_social_posts" in tool_names

    @patch("api.routers.voice_tools.repo_query")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_query_graph_edges_success(self, mock_synthesize, mock_repo_query, client):
        """Test querying database graph edges retrieves linked metadata successfully."""
        mock_repo_query.return_value = [
            {
                "id": "entity_note:1",
                "entity": {
                    "id": "customer:1",
                    "name": "Acme Corp",
                    "activeThreatCount": 2,
                    "complianceScore": 84
                }
            },
            {
                "id": "entity_note:2",
                "entity": {
                    "id": "location:1",
                    "name": "Primary Site",
                    "latitude": 37.7749,
                    "longitude": -122.4194
                }
            }
        ]
        mock_synthesize.return_value = "mocked_audio_data"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "query_graph_edges",
                "arguments": {"note_id": "note:1"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "mocked_audio_data"
        assert len(data["data"]["entities"]) == 2
        assert data["data"]["entities"][0]["name"] == "Acme Corp"
        assert data["data"]["entities"][0]["type"] == "customer"
        assert data["data"]["entities"][1]["name"] == "Primary Site"
        assert data["data"]["entities"][1]["type"] == "location"

    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_edit_note_requires_confirmation(self, mock_synthesize, client):
        """Test editing a note without confirmation returns a requires_confirmation status."""
        mock_synthesize.return_value = "confirm_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "edit_note",
                "arguments": {
                    "note_id": "note:1",
                    "content": "Additional notes",
                    "mode": "append",
                    "confirm": False
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "requires_confirmation"
        assert data["audio_base64"] == "confirm_audio"
        assert data["data"]["content"] == "Additional notes"

    @patch("api.routers.voice_tools.repo_query")
    @patch("api.routers.voice_tools.repo_update")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_edit_note_confirmed_success(self, mock_synthesize, mock_repo_update, mock_repo_query, client):
        """Test editing a note with confirmation updates the database content."""
        mock_repo_query.return_value = [{"title": "My Note", "content": "Existing content"}]
        mock_repo_update.return_value = []
        mock_synthesize.return_value = "success_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "edit_note",
                "arguments": {
                    "note_id": "note:1",
                    "content": "New content line",
                    "mode": "append",
                    "confirm": True
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "success_audio"
        
        # Verify repo_update was called with merged content
        mock_repo_update.assert_called_once_with(
            "note", "note:1", {"content": "Existing content\nNew content line"}
        )

    @patch("api.routers.voice_tools.Credential.get")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_trigger_export_missing_credentials(self, mock_synthesize, mock_cred_get, client):
        """Test exporting when Google OAuth credentials are not configured fails gracefully."""
        mock_cred_get.side_effect = Exception("Credentials not found")
        mock_synthesize.return_value = "error_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "trigger_export",
                "arguments": {
                    "note_id": "note:1",
                    "export_type": "gdocs",
                    "confirm": True
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert data["status"] == "failed"
        assert data["audio_base64"] == "error_audio"
        assert "Google Account not linked" in data["message"]

    @patch("api.routers.voice_tools.Credential.get")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_trigger_export_requires_confirmation(self, mock_synthesize, mock_cred_get, client):
        """Test exporting with valid credentials but without confirm flag triggers confirmation gate."""
        mock_cred = MagicMock()
        mock_cred.client_id = "test_client_id"
        mock_cred.client_secret = MagicMock()
        mock_cred.refresh_token = MagicMock()
        mock_cred_get.return_value = mock_cred
        mock_synthesize.return_value = "confirm_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "trigger_export",
                "arguments": {
                    "note_id": "note:1",
                    "export_type": "gdocs",
                    "confirm": False
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "requires_confirmation"
        assert data["audio_base64"] == "confirm_audio"

    @patch("api.routers.voice_tools.Credential.get")
    @patch("api.routers.voice_tools.repo_query")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_trigger_export_success_simulation(self, mock_synthesize, mock_repo_query, mock_cred_get, client):
        """Test exporting when credentials are valid but access token is missing triggers simulated fallback."""
        mock_cred = MagicMock()
        mock_cred.client_id = "test_client_id"
        mock_cred.client_secret = MagicMock()
        mock_cred.refresh_token = MagicMock()
        mock_cred.api_key = None
        mock_cred_get.return_value = mock_cred
        
        mock_repo_query.return_value = [{"title": "Test Title", "content": "Markdown content"}]
        mock_synthesize.return_value = "success_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "trigger_export",
                "arguments": {
                    "note_id": "note:1",
                    "export_type": "gdocs",
                    "confirm": True
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["data"]["doc_id"] == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        assert "Export simulated" in data["message"]

    @patch("api.routers.voice_tools.repo_query")
    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    def test_execute_tool_active_context_binding(self, mock_synthesize, mock_repo_query, client):
        """Test that active note_id is dynamically resolved from X-Notebook-ID header when omitted."""
        mock_repo_query.side_effect = [
            # First query: Resolving note from notebook
            [{"id": "note:resolved_from_context"}],
            # Second query: Fetching linked entities
            [{"id": "entity_note:1", "entity": {"id": "contact:1", "name": "Jane Doe", "email": "jane@example.com"}}]
        ]
        mock_synthesize.return_value = "context_audio"

        response = client.post(
            "/api/voice/tools/execute",
            headers={"X-Notebook-ID": "notebook:1"},
            json={
                "tool_name": "query_graph_edges",
                "arguments": {}  # Empty arguments, note_id omitted!
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "context_audio"
        assert data["data"]["entities"][0]["id"] == "contact:1"
        assert data["data"]["entities"][0]["name"] == "Jane Doe"

    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    @patch("open_notebook.search.memory_first_search.hybrid_rrf_search")
    def test_search_research_corpus_success(self, mock_search, mock_synthesize, client):
        """Test searching research corpus via voice copilot tool."""
        mock_search.return_value = [
            {
                "id": "doc:1",
                "title": "Clean Energy Storage",
                "url": "https://example.com/energy",
                "content": "Innovations in clean battery storage technology details here...",
                "source_type": "web"
            }
        ]
        mock_synthesize.return_value = "search_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "search_research_corpus",
                "arguments": {"query": "battery storage"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "search_audio"
        assert len(data["data"]["results"]) == 1
        assert data["data"]["results"][0]["title"] == "Clean Energy Storage"

    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    @patch("api.routers.skills._get_merged_skills")
    def test_query_skills_success(self, mock_get_skills, mock_synthesize, client):
        """Test querying automations skills registry via voice copilot tool."""
        mock_skill = MagicMock()
        mock_skill.id = "skill:1"
        mock_skill.name = "Twitter Auto-Post"
        mock_skill.description = "Schedules social messages to Twitter automatically"
        mock_skill.category = "social"
        mock_skill.enabled = True
        mock_get_skills.return_value = [mock_skill]
        mock_synthesize.return_value = "skills_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "query_skills",
                "arguments": {"query": "twitter"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "skills_audio"
        assert len(data["data"]["skills"]) == 1
        assert data["data"]["skills"][0]["name"] == "Twitter Auto-Post"

    @patch("api.routers.voice_tools.synthesize_text_to_base64")
    @patch("api.routers.voice_tools.repo_query")
    def test_query_social_posts_success(self, mock_repo_query, mock_synthesize, client):
        """Test retrieving scheduled posts and metrics via voice copilot tool."""
        mock_repo_query.return_value = [
            {
                "id": "post:1",
                "title": "Weekly Tech Insights",
                "channel": "twitter",
                "status": "published",
                "views": 450,
                "clicks": 25,
                "interactions": 10,
                "scheduled_time": "2026-06-08T10:00:00Z"
            }
        ]
        mock_synthesize.return_value = "social_audio"

        response = client.post(
            "/api/voice/tools/execute",
            json={
                "tool_name": "query_social_posts",
                "arguments": {"channel": "twitter"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "completed"
        assert data["audio_base64"] == "social_audio"
        assert len(data["data"]["posts"]) == 1
        assert data["data"]["posts"][0]["title"] == "Weekly Tech Insights"
        assert data["data"]["posts"][0]["views"] == 450
