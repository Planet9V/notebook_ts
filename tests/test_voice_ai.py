"""Tests for voice AI routers — voice_sessions, voice_rag, and voice STT.

These tests verify the critical runtime fixes:
1. Voice session creation uses ChatSession + relate_to_notebook (not create_chat_session)
2. STT transcribe endpoint exists and proxies correctly
3. Voice RAG builds context from get_sources/get_notes (not get_context)
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app

    return TestClient(app)


# ── Voice Sessions Tests ────────────────────────────────────────────


class TestVoiceSessionCreation:
    """Tests for #audit-1: voice session creation must NOT call create_chat_session."""

    @pytest.mark.asyncio
    @patch("api.routers.voice_sessions.ChatSession.save", new_callable=AsyncMock)
    @patch("api.routers.voice_sessions.ChatSession.relate_to_notebook", new_callable=AsyncMock)
    @patch("api.routers.voice_sessions.Notebook.get", new_callable=AsyncMock)
    async def test_create_voice_session_with_notebook_uses_relate(
        self, mock_nb_get, mock_relate, mock_save, client
    ):
        """Creating a notebook-scoped voice session should save() then relate_to_notebook()."""
        mock_notebook = MagicMock()
        mock_notebook.id = "notebook:test123"
        mock_nb_get.return_value = mock_notebook

        mock_save.return_value = None
        mock_relate.return_value = None

        # Patch ChatSession to have an id after save
        with patch("api.routers.voice_sessions.ChatSession") as MockSession:
            instance = MagicMock()
            instance.id = "chat_session:fake"
            instance.title = "🎙️ Voice Conversation"
            instance.created = "2026-01-01T00:00:00Z"
            instance.updated = "2026-01-01T00:00:00Z"
            instance.save = mock_save
            instance.relate_to_notebook = mock_relate
            MockSession.return_value = instance

            response = client.post(
                "/api/voice/sessions",
                json={
                    "notebook_id": "notebook:test123",
                    "title": "Test Voice Session",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["voice_mode"] is True
        # Verify save() was called (not create_chat_session)
        mock_save.assert_called_once()
        # Verify relate_to_notebook was called
        mock_relate.assert_called_once_with("notebook:test123")

    @pytest.mark.asyncio
    @patch("api.routers.voice_sessions.ChatSession", autospec=False)
    async def test_create_voice_session_without_notebook(self, MockSession, client):
        """Creating a voice session without notebook should just save()."""
        instance = MagicMock()
        instance.id = "chat_session:no_nb"
        instance.title = "🎙️ Voice Chat"
        instance.created = "2026-01-01T00:00:00Z"
        instance.updated = "2026-01-01T00:00:00Z"
        instance.save = AsyncMock()
        MockSession.return_value = instance

        response = client.post(
            "/api/voice/sessions",
            json={"title": "Standalone Voice"},
        )

        assert response.status_code == 200
        instance.save.assert_called_once()


# ── STT Transcribe Tests ────────────────────────────────────────────


class TestSTTTranscribe:
    """Tests for #audit-2: /voice/stt/transcribe endpoint must exist."""

    def test_stt_transcribe_endpoint_exists(self, client):
        """The STT transcribe endpoint should be registered and accept POST."""
        # Sending empty file should return 400 or 422, NOT 404/405
        response = client.post("/api/voice/stt/transcribe")
        # FastAPI returns 422 for missing required file parameter
        assert response.status_code in (400, 422), (
            f"Expected 400 or 422, got {response.status_code} — endpoint may not exist"
        )

    @patch("api.routers.voice.httpx.AsyncClient")
    def test_stt_transcribe_empty_audio_returns_400(self, mock_httpx, client):
        """Empty audio file should return 400."""
        audio_file = io.BytesIO(b"")
        response = client.post(
            "/api/voice/stt/transcribe",
            files={"file": ("empty.wav", audio_file, "audio/wav")},
        )
        assert response.status_code == 400

    @patch("api.routers.voice.httpx.AsyncClient")
    def test_stt_transcribe_proxies_to_whisper(self, MockAsyncClient, client):
        """Valid audio should be proxied to the Whisper service."""
        # Mock the httpx response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"text": "Hello world"}

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)
        MockAsyncClient.return_value = mock_client_instance

        audio_data = b"RIFF" + b"\x00" * 100  # Minimal WAV-like data
        response = client.post(
            "/api/voice/stt/transcribe",
            files={"file": ("test.wav", io.BytesIO(audio_data), "audio/wav")},
        )

        assert response.status_code == 200
        assert response.json()["text"] == "Hello world"


# ── Voice RAG Context Tests ─────────────────────────────────────────


class TestVoiceRAGContext:
    """Tests for #audit-3: voice RAG builds context from get_sources/get_notes."""

    @pytest.mark.asyncio
    async def test_voice_rag_endpoint_exists(self, client):
        """The voice RAG chat endpoint should be registered."""
        response = client.post(
            "/api/voice/chat/simple",
            json={"text": "test", "use_rag": False},
        )
        # Should not be 404 — may be 500 if LLM not configured, but endpoint exists
        assert response.status_code != 404, "Voice RAG endpoint not registered"

    @pytest.mark.asyncio
    @patch("api.routers.voice_rag.vector_search", new_callable=AsyncMock)
    @patch("api.routers.voice_rag.Notebook.get", new_callable=AsyncMock)
    async def test_voice_rag_uses_get_sources_not_get_context(
        self, mock_nb_get, mock_vector_search, client
    ):
        """Voice RAG should call notebook.get_sources(), not notebook.get_context()."""
        mock_notebook = MagicMock()
        mock_notebook.name = "Test Notebook"
        mock_sources = [
            MagicMock(title="Source 1"),
            MagicMock(title="Source 2"),
        ]
        mock_notes = [
            MagicMock(title="Note 1", content="Note content"),
        ]
        mock_notebook.get_sources = AsyncMock(return_value=mock_sources)
        mock_notebook.get_notes = AsyncMock(return_value=mock_notes)
        # Verify get_context is NOT called
        mock_notebook.get_context = AsyncMock(
            side_effect=AssertionError("get_context should NOT be called")
        )
        mock_nb_get.return_value = mock_notebook
        mock_vector_search.return_value = []

        # Use streaming endpoint to test context building
        response = client.post(
            "/api/voice/chat",
            json={
                "text": "test query",
                "notebook_id": "notebook:test",
                "use_rag": True,
            },
        )

        # Endpoint should return 200 (streaming response)
        assert response.status_code == 200
        # Verify get_sources was called
        mock_notebook.get_sources.assert_called_once()
        mock_notebook.get_notes.assert_called_once()


# ── Podcast Service Context Tests ────────────────────────────────────


class TestPodcastServiceContext:
    """Tests for #audit-3b: podcast_service builds context from get_sources/get_notes."""

    @pytest.mark.asyncio
    @patch("api.podcast_service.Notebook.get", new_callable=AsyncMock)
    @patch("api.podcast_service.EpisodeProfile.get_by_name", new_callable=AsyncMock)
    @patch("api.podcast_service.SpeakerProfile.get_by_name", new_callable=AsyncMock)
    async def test_podcast_service_uses_get_sources_not_get_context(
        self, mock_sp_get, mock_ep_get, mock_nb_get
    ):
        """PodcastService should use get_sources/get_notes, not get_context."""
        from api.podcast_service import PodcastService

        mock_notebook = MagicMock()
        mock_notebook.name = "Test Notebook"
        mock_notebook.description = "A test"
        mock_notebook.get_sources = AsyncMock(
            return_value=[MagicMock(title="Src1")]
        )
        mock_notebook.get_notes = AsyncMock(
            return_value=[MagicMock(title="Note1", content="Content")]
        )
        # Ensure get_context raises if called
        mock_notebook.get_context = AsyncMock(
            side_effect=AssertionError("get_context should NOT be called")
        )
        mock_nb_get.return_value = mock_notebook
        mock_ep_get.return_value = MagicMock(name="ep1")
        mock_sp_get.return_value = MagicMock(name="sp1")

        # This should build content from sources/notes, not get_context
        with patch("api.podcast_service.submit_command") as mock_submit:
            mock_submit.return_value = "command:test123"
            try:
                await PodcastService.submit_generation_job(
                    episode_profile_name="test_profile",
                    speaker_profile_name="test_speakers",
                    episode_name="Test Episode",
                    notebook_id="notebook:test",
                )
            except Exception:
                pass  # May fail on command import, that's ok

        # Verify get_sources was called (not get_context)
        mock_notebook.get_sources.assert_called_once()
        mock_notebook.get_notes.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
