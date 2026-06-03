"""
TDD tests for chat.py router.

Tests all chat session CRUD endpoints and context building.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


class TestChatSessionsAPI:
    """Test suite for Chat Sessions endpoints."""

    @patch("api.routers.chat.get_session_message_count", new_callable=AsyncMock)
    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_get_sessions_notebook_not_found(self, mock_notebook_cls, mock_msg_count, client):
        """GET /api/chat/sessions returns 404 when notebook doesn't exist."""
        mock_notebook_cls.get = AsyncMock(return_value=None)

        response = client.get("/api/chat/sessions?notebook_id=notebook:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.chat.get_session_message_count", new_callable=AsyncMock)
    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_get_sessions_empty_list(self, mock_notebook_cls, mock_msg_count, client):
        """GET /api/chat/sessions returns empty list when no sessions exist."""
        mock_notebook = MagicMock()
        mock_notebook.get_chat_sessions = AsyncMock(return_value=[])
        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)

        response = client.get("/api/chat/sessions?notebook_id=notebook:test123")

        assert response.status_code == 200
        assert response.json() == []

    @patch("api.routers.chat.get_session_message_count", new_callable=AsyncMock)
    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_get_sessions_returns_sessions(self, mock_notebook_cls, mock_msg_count, client):
        """GET /api/chat/sessions returns list of sessions."""
        mock_session = MagicMock()
        mock_session.id = "chat_session:sess1"
        mock_session.title = "Test Session"
        mock_session.created = "2026-05-27T00:00:00Z"
        mock_session.updated = "2026-05-27T00:00:00Z"
        mock_session.model_override = None

        mock_notebook = MagicMock()
        mock_notebook.get_chat_sessions = AsyncMock(return_value=[mock_session])
        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)
        mock_msg_count.return_value = 5

        response = client.get("/api/chat/sessions?notebook_id=notebook:test123")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "chat_session:sess1"
        assert data[0]["title"] == "Test Session"
        assert data[0]["message_count"] == 5

    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_create_session(self, mock_notebook_cls, mock_session_cls, client):
        """POST /api/chat/sessions creates a new session."""
        mock_notebook_cls.get = AsyncMock(return_value=MagicMock())

        mock_session = MagicMock()
        mock_session.id = "chat_session:new1"
        mock_session.title = "My Chat"
        mock_session.created = "2026-05-27T00:00:00Z"
        mock_session.updated = "2026-05-27T00:00:00Z"
        mock_session.model_override = None
        mock_session.save = AsyncMock()
        mock_session.relate_to_notebook = AsyncMock()

        mock_session_cls.return_value = mock_session

        response = client.post("/api/chat/sessions", json={
            "notebook_id": "notebook:test123",
            "title": "My Chat"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "My Chat"

    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_create_session_notebook_not_found(self, mock_notebook_cls, mock_session_cls, client):
        """POST /api/chat/sessions returns 404 when notebook doesn't exist."""
        mock_notebook_cls.get = AsyncMock(return_value=None)

        response = client.post("/api/chat/sessions", json={
            "notebook_id": "notebook:nonexistent"
        })

        assert response.status_code == 404

    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    def test_get_session_not_found(self, mock_session_cls, client):
        """GET /api/chat/sessions/{id} returns 404 for missing session."""
        mock_session_cls.get = AsyncMock(return_value=None)

        response = client.get("/api/chat/sessions/chat_session:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    def test_delete_session(self, mock_session_cls, client):
        """DELETE /api/chat/sessions/{id} deletes session."""
        mock_session = MagicMock()
        mock_session.delete = AsyncMock()
        mock_session_cls.get = AsyncMock(return_value=mock_session)

        response = client.delete("/api/chat/sessions/chat_session:sess1")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    def test_delete_session_not_found(self, mock_session_cls, client):
        """DELETE /api/chat/sessions/{id} returns 404 for missing session."""
        mock_session_cls.get = AsyncMock(return_value=None)

        response = client.delete("/api/chat/sessions/chat_session:nonexistent")

        assert response.status_code == 404

    @patch("api.routers.chat.repo_query", new_callable=AsyncMock)
    @patch("api.routers.chat.get_session_message_count", new_callable=AsyncMock)
    @patch("api.routers.chat.ChatSession", new_callable=MagicMock)
    def test_update_session_title(self, mock_session_cls, mock_msg_count, mock_repo_query, client):
        """PUT /api/chat/sessions/{id} updates session title."""
        mock_session = MagicMock()
        mock_session.id = "chat_session:sess1"
        mock_session.title = "Old Title"
        mock_session.created = "2026-05-27T00:00:00Z"
        mock_session.updated = "2026-05-27T01:00:00Z"
        mock_session.model_override = None
        mock_session.save = AsyncMock()
        mock_session_cls.get = AsyncMock(return_value=mock_session)

        mock_repo_query.return_value = [{"out": "notebook:test123"}]
        mock_msg_count.return_value = 3

        response = client.put("/api/chat/sessions/chat_session:sess1", json={
            "title": "New Title"
        })

        assert response.status_code == 200
        mock_session.save.assert_called_once()


class TestChatContextAPI:
    """Test suite for chat context building."""

    @patch("api.routers.chat.Notebook", new_callable=MagicMock)
    def test_build_context_notebook_not_found(self, mock_notebook_cls, client):
        """POST /api/chat/context returns 404 when notebook doesn't exist."""
        mock_notebook_cls.get = AsyncMock(return_value=None)

        response = client.post("/api/chat/context", json={
            "notebook_id": "notebook:nonexistent",
            "context_config": {}
        })

        assert response.status_code == 404
