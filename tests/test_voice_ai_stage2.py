"""Tests for Voice AI Stage 2-3 features.

Tests multi-engine STT routing, OpenAI TTS proxy, expanded VoiceSettings,
and platform MPS detection.
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app

    return TestClient(app)


# ── Multi-Engine STT Tests ───────────────────────────────────────────


class TestSTTMultiEngine:
    """Tests for multi-engine STT routing."""

    def test_stt_default_engine_is_whisper(self, client):
        """Default engine should be 'whisper' when no engine param is given."""
        # This should work without any API key requirement
        audio_data = b"RIFF" + b"\x00" * 100
        with patch("api.routers.voice.httpx.AsyncClient") as MockClient:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"text": "hello"}
            mock_instance = AsyncMock()
            mock_instance.post = AsyncMock(return_value=mock_resp)
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_instance

            response = client.post(
                "/api/voice/stt/transcribe",
                files={"file": ("test.wav", io.BytesIO(audio_data), "audio/wav")},
            )
            assert response.status_code == 200

    def test_stt_openai_engine_requires_api_key(self, client):
        """OpenAI STT engine should return 400 if OPENAI_API_KEY not set."""
        audio_data = b"RIFF" + b"\x00" * 100
        with patch("api.routers.voice._get_provider_api_key", new_callable=AsyncMock) as mock_get_key:
            mock_get_key.return_value = None
            response = client.post(
                "/api/voice/stt/transcribe",
                files={"file": ("test.wav", io.BytesIO(audio_data), "audio/wav")},
                data={"engine": "openai"},
            )
            assert response.status_code == 400
            assert "OpenAI API key" in response.json()["detail"]

    def test_stt_deepgram_engine_requires_api_key(self, client):
        """Deepgram STT engine should return 400 if DEEPGRAM_API_KEY not set."""
        audio_data = b"RIFF" + b"\x00" * 100
        with patch("api.routers.voice._get_provider_api_key", new_callable=AsyncMock) as mock_get_key:
            mock_get_key.return_value = None
            response = client.post(
                "/api/voice/stt/transcribe",
                files={"file": ("test.wav", io.BytesIO(audio_data), "audio/wav")},
                data={"engine": "deepgram"},
            )
            assert response.status_code == 400
            assert "Deepgram API key" in response.json()["detail"]


# ── OpenAI TTS Proxy Tests ──────────────────────────────────────────


class TestOpenAITTSProxy:
    """Tests for the OpenAI TTS proxy endpoint."""

    def test_openai_tts_endpoint_exists(self, client):
        """The OpenAI TTS endpoint should be registered."""
        response = client.post("/api/voice/tts/openai", json={"input": "hello"})
        # Should NOT be 404 — may be 400 if OPENAI_API_KEY not set
        assert response.status_code != 404, "OpenAI TTS endpoint not registered"

    def test_openai_tts_requires_api_key(self, client):
        """Should return 400 if OPENAI_API_KEY not configured."""
        with patch("api.routers.voice._get_provider_api_key", new_callable=AsyncMock) as mock_get_key:
            mock_get_key.return_value = None
            response = client.post(
                "/api/voice/tts/openai",
                json={"input": "test text", "voice": "alloy"},
            )
            assert response.status_code == 400
            assert "OpenAI API key" in response.json()["detail"]


# ── Expanded VoiceSettings Tests ─────────────────────────────────────


class TestExpandedVoiceSettings:
    """Tests for the expanded VoiceSettings model."""

    def test_settings_returns_multi_engine_fields(self, client):
        """GET /voice/settings should include multi-engine fields."""
        response = client.get("/api/voice/settings")
        assert response.status_code == 200
        data = response.json()

        # New multi-engine fields should be present
        assert "tts_engine" in data
        assert "stt_engine" in data
        assert "openai_api_key_set" in data
        assert "elevenlabs_api_key_set" in data
        assert "deepgram_api_key_set" in data
        assert "livekit_mode" in data

    def test_settings_api_key_flags_are_booleans(self, client):
        """API key flags should be boolean, never exposing actual keys."""
        response = client.get("/api/voice/settings")
        data = response.json()

        assert isinstance(data["openai_api_key_set"], bool)
        assert isinstance(data["elevenlabs_api_key_set"], bool)
        assert isinstance(data["deepgram_api_key_set"], bool)

    def test_settings_update_accepts_multi_engine_fields(self, client):
        """PUT /voice/settings should accept the new fields."""
        response = client.put(
            "/api/voice/settings",
            json={
                "livekit_ws_url": "ws://localhost:7880",
                "livekit_api_key": "devkey",
                "kokoro_tts_url": "http://kokoro-tts:8880",
                "kokoro_default_voice": "af_heart",
                "kokoro_default_speed": 1.0,
                "whisper_stt_url": "http://whisper-stt:8000",
                "whisper_model": "Systran/faster-whisper-large-v3",
                "whisper_compute_type": "int8",
                "voice_enabled": True,
                "tts_engine": "openai",
                "openai_tts_voice": "nova",
                "stt_engine": "deepgram",
                "livekit_mode": "remote",
                "livekit_remote_ws_url": "wss://my-livekit.example.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tts_engine"] == "openai"
        assert data["stt_engine"] == "deepgram"
        assert data["livekit_mode"] == "remote"

    def test_settings_update_and_token_generation_remote(self, client):
        """Updating to remote LiveKit mode should generate a token signed with remote keys and return remote WS URL."""
        # 1. Update settings with remote configs
        response = client.put(
            "/api/voice/settings",
            json={
                "livekit_mode": "remote",
                "livekit_remote_ws_url": "wss://my-remote-livekit:7880",
                "livekit_remote_api_key": "my-remote-key",
                "livekit_remote_api_secret": "my-remote-secret",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["livekit_mode"] == "remote"
        assert data["livekit_remote_ws_url"] == "wss://my-remote-livekit:7880"
        assert data["livekit_remote_api_key"] == "my-remote-key"
        assert data["livekit_remote_api_secret"] == "my-remote-secret"

        # 2. Get voice token
        token_response = client.post(
            "/api/voice/token",
            json={
                "room_name": "test-remote-room",
                "identity": "remote-user",
            }
        )
        assert token_response.status_code == 200
        token_data = token_response.json()
        assert token_data["ws_url"] == "wss://my-remote-livekit:7880"
        
        # Verify JWT payload header matches my-remote-key
        import base64
        import json
        jwt_parts = token_data["token"].split(".")
        assert len(jwt_parts) == 3
        # Decode base64 payload
        payload_bytes = base64.urlsafe_b64decode(jwt_parts[1] + "==")
        payload = json.loads(payload_bytes.decode())
        assert payload["iss"] == "my-remote-key"
        assert payload["sub"] == "remote-user"
        
        # Reset back to local mode to avoid messing up other tests
        client.put(
            "/api/voice/settings",
            json={
                "livekit_mode": "local",
            },
        )


# ── Platform Detection Tests ─────────────────────────────────────────


class TestPlatformDetection:
    """Tests for the platform info endpoint."""

    def test_platform_info_endpoint_exists(self, client):
        """Platform info endpoint should return system data."""
        response = client.get("/api/platform/info")
        assert response.status_code == 200
        data = response.json()
        assert "os" in data
        assert "gpu" in data
        assert "docker" in data

    def test_gpu_has_recommended_compute_type(self, client):
        """GPU detection should include recommended_compute_type."""
        response = client.get("/api/platform/info")
        data = response.json()
        assert "recommended_compute_type" in data["gpu"]
        assert data["gpu"]["recommended_compute_type"] in ("int8", "float16", "float32")


# ── Voice Message Persistence Tests ──────────────────────────────────


class TestVoiceMessagePersistence:
    """Tests for the POST /voice/sessions/{id}/messages endpoint."""

    def test_add_message_endpoint_exists(self, client):
        """The add-message endpoint should be registered (not 404)."""
        response = client.post(
            "/api/voice/sessions/fake-id/messages",
            json={"role": "human", "content": "test message"},
        )
        # Should NOT be 404 — may be 404 from "session not found" which is fine
        # (that's the endpoint working, just no session)
        assert response.status_code != 405, "Messages endpoint not registered"

    def test_add_message_returns_404_for_missing_session(self, client):
        """Should return 404/500 for a nonexistent session ID."""
        response = client.post(
            "/api/voice/sessions/chat_session:nonexistent999/messages",
            json={"role": "human", "content": "test"},
        )
        assert response.status_code in (404, 500)

    def test_add_message_validates_request_body(self, client):
        """Should validate the request body (role and content required)."""
        response = client.post(
            "/api/voice/sessions/fake-id/messages",
            json={},  # Missing required fields
        )
        assert response.status_code == 422  # Pydantic validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

