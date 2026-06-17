from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app

    return TestClient(app)


class TestNoteCreation:
    """Test suite for Note API endpoints."""

    @patch("api.routers.notes.Note")
    def test_create_note_returns_command_id(self, mock_note_cls, client):
        """Test that creating a note returns the embed command_id."""
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note.title = "Test Note"
        mock_note.content = "Some content"
        mock_note.note_type = "human"
        mock_note.created = "2026-01-01T00:00:00Z"
        mock_note.updated = "2026-01-01T00:00:00Z"
        mock_note.save.return_value = "command:embed123"
        mock_note.add_to_notebook = AsyncMock()
        mock_note_cls.return_value = mock_note

        response = client.post(
            "/api/notes",
            json={"content": "Some content", "note_type": "human"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["command_id"] == "command:embed123"
        assert data["id"] == "note:abc123"

    @patch("api.routers.notes.Note")
    def test_create_note_command_id_none_when_no_content_embedding(
        self, mock_note_cls, client
    ):
        """Test that command_id is None when save returns None (no embedding)."""
        mock_note = AsyncMock()
        mock_note.id = "note:abc456"
        mock_note.title = "Empty Note"
        mock_note.content = "Some content"
        mock_note.note_type = "human"
        mock_note.created = "2026-01-01T00:00:00Z"
        mock_note.updated = "2026-01-01T00:00:00Z"
        mock_note.save.return_value = None
        mock_note.add_to_notebook = AsyncMock()
        mock_note_cls.return_value = mock_note

        response = client.post(
            "/api/notes",
            json={"content": "Some content", "note_type": "human"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["command_id"] is None


class TestNoteUpdate:
    """Test suite for Note update endpoint."""

    @patch("api.routers.notes.Note")
    def test_update_note_returns_command_id(self, mock_note_cls, client):
        """Test that updating a note returns the embed command_id."""
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note.title = "Test Note"
        mock_note.content = "Original content"
        mock_note.note_type = "human"
        mock_note.created = "2026-01-01T00:00:00Z"
        mock_note.updated = "2026-01-01T00:00:00Z"
        mock_note.save.return_value = "command:embed789"
        mock_note_cls.get = AsyncMock(return_value=mock_note)

        response = client.put(
            "/api/notes/note:abc123",
            json={"content": "Updated content"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["command_id"] == "command:embed789"

    @patch("api.routers.notes.Note")
    def test_update_note_command_id_none_when_no_embedding(
        self, mock_note_cls, client
    ):
        """Test that command_id is None on update when no embedding is triggered."""
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note.title = "Test Note"
        mock_note.content = "Some content"
        mock_note.note_type = "human"
        mock_note.created = "2026-01-01T00:00:00Z"
        mock_note.updated = "2026-01-01T00:00:00Z"
        mock_note.save.return_value = None
        mock_note_cls.get = AsyncMock(return_value=mock_note)

        response = client.put(
            "/api/notes/note:abc123",
            json={"title": "Updated Title"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["command_id"] is None


class TestEntityLinks:
    """Test suite for entity_link endpoints."""

    @patch("open_notebook.database.repository.repo_query")
    def test_get_entity_links(self, mock_query, client):
        mock_query.return_value = [
            {
                "id": "entity_link:link1",
                "in": "note:note1",
                "out": "source:source1",
                "link_type": "references",
                "created": "2026-01-01T00:00:00Z"
            }
        ]

        response = client.get("/api/notes/links")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "entity_link:link1"
        assert data[0]["in"] == "note:note1"
        assert data[0]["out"] == "source:source1"
        assert data[0]["link_type"] == "references"

    @patch("open_notebook.database.repository.repo_relate")
    def test_create_entity_link(self, mock_relate, client):
        mock_relate.return_value = [
            {
                "id": "entity_link:link1",
                "in": "note:note1",
                "out": "source:source1",
                "link_type": "references",
                "created": "2026-01-01T00:00:00Z"
            }
        ]

        response = client.post(
            "/api/notes/links",
            json={
                "source_id": "note:note1",
                "target_id": "source:source1",
                "link_type": "references"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "entity_link:link1"
        assert data["in"] == "note:note1"
        assert data["out"] == "source:source1"

    @patch("open_notebook.database.repository.repo_delete")
    def test_delete_entity_link(self, mock_delete, client):
        mock_delete.return_value = True

        response = client.delete("/api/notes/links/link1")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestMentionsAndNotifications:
    """Test suite for @mention triggers and notification endpoints."""

    @patch("open_notebook.database.repository.repo_query")
    @patch("api.routers.notes.Note")
    def test_create_note_triggers_mention(self, mock_note_cls, mock_query, client):
        """Test that creating a note with a mention calls user lookup and notification insert."""
        mock_note = AsyncMock()
        mock_note.id = "note:abc123"
        mock_note.title = "Test Note"
        mock_note.content = "Hey @john_doe, check this!"
        mock_note.note_type = "human"
        mock_note.created = "2026-01-01T00:00:00Z"
        mock_note.updated = "2026-01-01T00:00:00Z"
        mock_note.save.return_value = "command:embed123"
        mock_note.add_to_notebook = AsyncMock()
        mock_note_cls.return_value = mock_note

        mock_query.side_effect = [
            [{"id": "user:john_doe"}],  # User lookup query
            []                           # Notification create query
        ]

        response = client.post(
            "/api/notes",
            json={"content": "Hey @john_doe, check this!", "note_type": "human", "title": "Test Note"},
        )

        assert response.status_code == 200
        assert mock_query.call_count == 2
        user_query_args = mock_query.call_args_list[0]
        assert "username" in user_query_args[0][1]
        assert user_query_args[0][1]["username"] == "john_doe"

        create_query_args = mock_query.call_args_list[1]
        assert "notification" in create_query_args[0][0]
        assert str(create_query_args[0][1]["data"]["user_id"]) == "user:john_doe"
        assert create_query_args[0][1]["data"]["type"] == "mention"

    @patch("open_notebook.database.repository.repo_query")
    def test_get_notifications(self, mock_query, client):
        mock_query.return_value = [
            {
                "id": "notification:notif1",
                "user_id": "user:john_doe",
                "type": "mention",
                "title": "Mentioned in note",
                "body": "Hey @john_doe",
                "entity_id": "note:abc123",
                "entity_type": "note",
                "is_read": False,
                "created": "2026-01-01T00:00:00Z"
            }
        ]

        response = client.get("/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "notification:notif1"
        assert data[0]["is_read"] is False

    @patch("open_notebook.database.repository.repo_query")
    def test_mark_notification_as_read(self, mock_query, client):
        mock_query.return_value = [
            {
                "id": "notification:notif1",
                "is_read": True
            }
        ]

        response = client.put("/api/notifications/notif1/read")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

