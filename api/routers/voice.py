"""
Voice Router

Endpoints for real-time voice AI services:
- LiveKit token generation for WebRTC connections
- TTS synthesis proxy to Kokoro
- Voice service health checks

Architecture:
  Browser ↔ LiveKit SFU ↔ Voice Agent Worker
  Kokoro TTS: OpenAI-compatible speech API
  Faster Whisper: STT transcription
"""

import asyncio
import json
import os
import time
from typing import Optional, List, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Header
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field, field_validator

from open_notebook.domain.voice_settings import VoiceSettingsConfig
from open_notebook.domain.notebook import Notebook, vector_search
from open_notebook.utils.text_utils import extract_text_content

router = APIRouter()

def is_running_in_docker() -> bool:
    """Detect if running inside a Docker container."""
    return os.path.exists("/.dockerenv")

# Apply local host defaults if running outside Docker (e.g. host development)
if not is_running_in_docker():
    if not os.getenv("KOKORO_TTS_URL"):
        os.environ["KOKORO_TTS_URL"] = "http://localhost:8880"
    if not os.getenv("WHISPER_STT_URL"):
        os.environ["WHISPER_STT_URL"] = "http://localhost:8881"
    if not os.getenv("LIVEKIT_URL"):
        os.environ["LIVEKIT_URL"] = "http://localhost:7880"
    if not os.getenv("LIVEKIT_WS_URL"):
        os.environ["LIVEKIT_WS_URL"] = "ws://localhost:7880"

# ── Service URLs (configurable via env) ──────────────────────────────
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "http://livekit-server:7880")
LIVEKIT_WS_URL = os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")
KOKORO_TTS_URL = os.getenv("KOKORO_TTS_URL", "http://kokoro-tts:8880")
WHISPER_STT_URL = os.getenv("WHISPER_STT_URL", "http://whisper-stt:8000")
WHISPER_DEFAULT_MODEL = os.getenv(
    "WHISPER__MODEL", "Systran/faster-whisper-base"
)

# ── Provider → Env-var fallback mapping ──────────────────────────────
_PROVIDER_ENV_MAP = {
    "openai": "OPENAI_API_KEY",
    "elevenlabs": "ELEVENLABS_API_KEY",
    "deepgram": "DEEPGRAM_API_KEY",
}


async def _get_provider_api_key(provider: str) -> Optional[str]:
    """
    Resolve an API key for a provider.
    Priority: credential database → environment variable.
    """
    # 1. Try credential database
    try:
        from open_notebook.domain.credential import Credential

        creds = await Credential.get_by_provider(provider)
        for cred in creds:
            if cred.api_key:
                key = cred.api_key.get_secret_value()
                if key and key != "UNDECRYPTABLE":
                    return key
    except Exception as e:
        logger.debug(f"Credential lookup for {provider} failed (using env fallback): {e}")

    # 2. Fallback to environment variable
    env_var = _PROVIDER_ENV_MAP.get(provider)
    if env_var:
        return os.getenv(env_var)

    return None


def _sanitize_upstream_error(text: str, max_len: int = 200) -> str:
    """Strip potential secrets/tokens from upstream error text before surfacing."""
    import re
    sanitized = text[:max_len]
    # Mask anything that looks like an API key or token
    sanitized = re.sub(r'(sk-[a-zA-Z0-9]{20,})', '***REDACTED***', sanitized)
    sanitized = re.sub(r'(key|token|secret|password)["\s:=]+["\']?[a-zA-Z0-9_\-]{16,}', '\1=***REDACTED***', sanitized, flags=re.IGNORECASE)
    return sanitized



# ── Request/Response Models ──────────────────────────────────────────


class VoiceTokenRequest(BaseModel):
    room_name: str = Field(
        default="voice-chat", description="LiveKit room name"
    )
    identity: str = Field(
        default="user", description="Participant identity"
    )
    name: Optional[str] = Field(
        None, description="Display name for participant"
    )
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID for RAG context"
    )
    session_id: Optional[str] = Field(
        None, description="Active voice session ID"
    )


class VoiceTokenResponse(BaseModel):
    token: str = Field(..., description="LiveKit access token (JWT)")
    ws_url: str = Field(..., description="LiveKit WebSocket URL for client connection")
    room_name: str = Field(..., description="Room name")
    identity: str = Field(..., description="Participant identity")


class TTSSynthesizeRequest(BaseModel):
    input: str = Field(..., description="Text to synthesize", max_length=5000)
    voice: str = Field(
        default="af_heart", description="Kokoro voice preset name"
    )
    model: str = Field(
        default="kokoro", description="TTS model name"
    )
    response_format: str = Field(
        default="mp3", description="Audio format: mp3, wav, opus, flac"
    )
    speed: float = Field(
        default=1.0, ge=0.25, le=4.0, description="Speech speed multiplier"
    )


class VoiceServiceStatus(BaseModel):
    name: str
    url: str
    status: str  # "healthy", "unhealthy", "unavailable"
    latency_ms: Optional[float] = None
    details: Optional[str] = None


class VoiceConfigResponse(BaseModel):
    livekit_ws_url: str
    livekit_api_key_set: bool
    kokoro_tts_url: str
    whisper_stt_url: str
    available_voices: list[str]
    services: list[VoiceServiceStatus]


class VoiceHealthResponse(BaseModel):
    overall: str  # "healthy", "degraded", "unhealthy"
    services: list[VoiceServiceStatus]


# ── Available Kokoro Voices ──────────────────────────────────────────


class VoiceEntry(BaseModel):
    id: str
    name: str
    provider: str


class TTSEngineInfo(BaseModel):
    engine: str
    status: str  # "healthy", "configured", "not_configured"
    voices: list[VoiceEntry]


class STTEngineInfo(BaseModel):
    engine: str
    status: str
    models: list[str]


class WebRTCInfo(BaseModel):
    status: str
    ws_url: str


class VoiceRegistryResponse(BaseModel):
    tts_engines: list[TTSEngineInfo]
    stt_engines: list[STTEngineInfo]
    webrtc: dict[str, WebRTCInfo]
    active_tts_engine: str
    active_stt_engine: str


KOKORO_VOICES = [
    "af_heart", "af_bella", "af_nicole", "af_sarah", "af_sky",
    "am_adam", "am_michael",
    "bf_emma", "bf_isabella",
    "bm_george", "bm_lewis",
]


# ── Helper: Check Service Health ─────────────────────────────────────


async def _check_service_health(
    name: str, url: str, path: str = "/health"
) -> VoiceServiceStatus:
    """Check if a service is reachable and healthy."""
    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{url}{path}")
            latency = (time.monotonic() - start) * 1000

            if resp.status_code < 400:
                return VoiceServiceStatus(
                    name=name,
                    url=url,
                    status="healthy",
                    latency_ms=round(latency, 1),
                )
            else:
                return VoiceServiceStatus(
                    name=name,
                    url=url,
                    status="unhealthy",
                    latency_ms=round(latency, 1),
                    details=f"HTTP {resp.status_code}",
                )
    except httpx.ConnectError:
        return VoiceServiceStatus(
            name=name,
            url=url,
            status="unavailable",
            details="Connection refused — service may not be running",
        )
    except httpx.TimeoutException:
        return VoiceServiceStatus(
            name=name,
            url=url,
            status="unavailable",
            details="Connection timed out",
        )
    except Exception as e:
        return VoiceServiceStatus(
            name=name,
            url=url,
            status="unavailable",
            details=str(e),
        )


# ── Endpoints ────────────────────────────────────────────────────────


@router.get("/voice/config", response_model=VoiceConfigResponse)
async def get_voice_config():
    """
    Get voice service configuration and health status.
    Used by the frontend to initialize voice features.
    """
    services = await asyncio.gather(
        _check_service_health("LiveKit SFU", LIVEKIT_URL, "/"),
        _check_service_health("Kokoro TTS", KOKORO_TTS_URL, "/health"),
        _check_service_health("Faster Whisper STT", WHISPER_STT_URL, "/health"),
    )

    return VoiceConfigResponse(
        livekit_ws_url=LIVEKIT_WS_URL,
        livekit_api_key_set=bool(LIVEKIT_API_KEY),
        kokoro_tts_url=KOKORO_TTS_URL,
        whisper_stt_url=WHISPER_STT_URL,
        available_voices=KOKORO_VOICES,
        services=services,
    )


@router.post("/voice/token", response_model=VoiceTokenResponse)
async def create_voice_token(request: VoiceTokenRequest):
    """
    Generate a LiveKit access token (JWT) for client WebRTC connection.

    The token grants the user permission to join a specific room
    with publish/subscribe capabilities for audio.
    """
    try:
        # Load voice settings config to determine mode and credentials
        db_config = await VoiceSettingsConfig.get_instance()
        api_key = LIVEKIT_API_KEY
        api_secret = LIVEKIT_API_SECRET
        ws_url = LIVEKIT_WS_URL

        if db_config.livekit_mode == "remote":
            if db_config.livekit_remote_api_key:
                api_key = db_config.livekit_remote_api_key
            if db_config.livekit_remote_api_secret:
                api_secret = db_config.livekit_remote_api_secret
            if db_config.livekit_remote_ws_url:
                ws_url = db_config.livekit_remote_ws_url

        # Build JWT manually using HMAC-SHA256 (no livekit SDK dependency)
        import base64
        import hashlib
        import hmac
        import json

        now = int(time.time())
        exp = now + 3600  # 1 hour expiry

        header = {"alg": "HS256", "typ": "JWT"}

        # LiveKit JWT claims
        # See: https://docs.livekit.io/realtime/concepts/authentication/
        payload = {
            "iss": api_key,
            "sub": request.identity,
            "name": request.name or request.identity,
            "nbf": now,
            "exp": exp,
            "iat": now,
            "jti": f"voice-{request.identity}-{now}",
            "metadata": json.dumps({
                "notebook_id": request.notebook_id,
                "session_id": request.session_id
            }) if (request.notebook_id or request.session_id) else "",
            "video": {
                "room": request.room_name,
                "roomJoin": True,
                "canPublish": True,
                "canSubscribe": True,
                "canPublishData": True,
            },
        }

        # Encode JWT
        def _b64url(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

        header_b64 = _b64url(json.dumps(header, separators=(",", ":")).encode())
        payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode())
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            api_secret.encode(),
            signing_input.encode(),
            hashlib.sha256,
        ).digest()
        token = f"{signing_input}.{_b64url(signature)}"

        return VoiceTokenResponse(
            token=token,
            ws_url=ws_url,
            room_name=request.room_name,
            identity=request.identity,
        )

    except Exception as e:
        logger.error(f"Failed to generate LiveKit token: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate voice access token"
        )


@router.post("/voice/tts/synthesize")
async def synthesize_speech(request: TTSSynthesizeRequest):
    """
    Proxy TTS request to Kokoro TTS service.
    Returns streaming audio in the requested format.

    Uses the OpenAI-compatible /v1/audio/speech endpoint.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{KOKORO_TTS_URL}/v1/audio/speech",
                json={
                    "input": request.input,
                    "voice": request.voice,
                    "model": request.model,
                    "response_format": request.response_format,
                    "speed": request.speed,
                },
            )

            if resp.status_code != 200:
                detail = _sanitize_upstream_error(resp.text) if resp.text else "TTS service error"
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Kokoro TTS error: {detail}",
                )

            content_type_map = {
                "mp3": "audio/mpeg",
                "wav": "audio/wav",
                "opus": "audio/opus",
                "flac": "audio/flac",
            }
            media_type = content_type_map.get(
                request.response_format, "audio/mpeg"
            )

            return StreamingResponse(
                iter([resp.content]),
                media_type=media_type,
                headers={
                    "Content-Disposition": f'attachment; filename="speech.{request.response_format}"'
                },
            )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Kokoro TTS service is not running. Start it with: docker compose up kokoro-tts",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Kokoro TTS synthesis timed out",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS synthesis error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to synthesize speech"
        )


@router.get("/voice/tts/voices")
async def list_voices():
    """List available Kokoro TTS voices."""
    # Try fetching from Kokoro if it exposes a voices endpoint
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{KOKORO_TTS_URL}/v1/audio/voices")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch Kokoro voices, using fallback list: {e}")

    # Fallback to hardcoded voice list
    return {
        "voices": [
            {"id": v, "name": v.replace("_", " ").title()}
            for v in KOKORO_VOICES
        ]
    }


@router.get("/voice/health", response_model=VoiceHealthResponse)
async def voice_health_check():
    """
    Health check for all voice AI services.
    Returns overall status and per-service details.
    """
    services = await asyncio.gather(
        _check_service_health("LiveKit SFU", LIVEKIT_URL, "/"),
        _check_service_health("Kokoro TTS", KOKORO_TTS_URL, "/health"),
        _check_service_health("Faster Whisper STT", WHISPER_STT_URL, "/health"),
    )

    healthy_count = sum(1 for s in services if s.status == "healthy")
    total = len(services)

    if healthy_count == total:
        overall = "healthy"
    elif healthy_count > 0:
        overall = "degraded"
    else:
        overall = "unhealthy"

    return VoiceHealthResponse(overall=overall, services=services)


# ── Voice Registry (unified aggregation) ─────────────────────────────


@router.get("/voice/registry", response_model=VoiceRegistryResponse)
async def get_voice_registry():
    """Aggregate all configured voice engines with status and available voices."""
    tts_engines: list[TTSEngineInfo] = []
    stt_engines: list[STTEngineInfo] = []

    # ── TTS: Kokoro ──
    kokoro_voices: list[VoiceEntry] = []
    kokoro_status = "not_configured"
    try:
        health = await _check_service_health("Kokoro TTS", KOKORO_TTS_URL, "/health")
        if health.status == "healthy":
            kokoro_status = "healthy"
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{KOKORO_TTS_URL}/v1/audio/voices")
                    if resp.status_code == 200:
                        data = resp.json()
                        raw = data.get("voices", data) if isinstance(data, dict) else data
                        for v in raw:
                            vid = v.get("id", v) if isinstance(v, dict) else str(v)
                            vname = v.get("name", vid) if isinstance(v, dict) else vid.replace("_", " ").title()
                            kokoro_voices.append(VoiceEntry(id=vid, name=vname, provider="kokoro"))
            except Exception:
                pass
    except Exception:
        pass

    if not kokoro_voices:
        # Only mark as 'configured' if service is healthy but voice list fetch failed.
        # If service is unreachable (not_configured), keep that status.
        kokoro_status = "configured" if kokoro_status == "healthy" else kokoro_status
        kokoro_voices = [
            VoiceEntry(id=v, name=v.replace("_", " ").title(), provider="kokoro")
            for v in KOKORO_VOICES
        ]
    tts_engines.append(TTSEngineInfo(engine="kokoro", status=kokoro_status, voices=kokoro_voices))

    # ── TTS: OpenAI ──
    openai_key = await _get_provider_api_key("openai")
    openai_tts_voices = [
        VoiceEntry(id="alloy", name="Alloy", provider="openai"),
        VoiceEntry(id="ash", name="Ash", provider="openai"),
        VoiceEntry(id="coral", name="Coral", provider="openai"),
        VoiceEntry(id="echo", name="Echo", provider="openai"),
        VoiceEntry(id="fable", name="Fable", provider="openai"),
        VoiceEntry(id="onyx", name="Onyx", provider="openai"),
        VoiceEntry(id="nova", name="Nova", provider="openai"),
        VoiceEntry(id="sage", name="Sage", provider="openai"),
        VoiceEntry(id="shimmer", name="Shimmer", provider="openai"),
    ]
    tts_engines.append(TTSEngineInfo(
        engine="openai",
        status="configured" if openai_key else "not_configured",
        voices=openai_tts_voices,
    ))

    # ── TTS: ElevenLabs ──
    el_key = await _get_provider_api_key("elevenlabs")
    el_voices = [
        VoiceEntry(id="21m00Tcm4TlvDq8ikWAM", name="Rachel (Female)", provider="elevenlabs"),
        VoiceEntry(id="AZnzlk1XvdvUeBnXmlld", name="Dom (Male)", provider="elevenlabs"),
        VoiceEntry(id="EXAVITQu4vr4xnSDxMaL", name="Bella (Female)", provider="elevenlabs"),
        VoiceEntry(id="ErXwobaYiN019PkySvjV", name="Antoni (Male)", provider="elevenlabs"),
        VoiceEntry(id="MF3mKeuZ5aP759t0x789", name="Ellie (Female)", provider="elevenlabs"),
        VoiceEntry(id="TX38z5qCq49O5g24s609", name="Liam (Male)", provider="elevenlabs"),
        VoiceEntry(id="VR6A4UBqKsFlTRUMBEcc", name="Arnold (Male)", provider="elevenlabs"),
        VoiceEntry(id="pNInz6MdihwTYv7sM3nn", name="Rachel Clone (Female)", provider="elevenlabs"),
    ]
    tts_engines.append(TTSEngineInfo(
        engine="elevenlabs",
        status="configured" if el_key else "not_configured",
        voices=el_voices,
    ))

    # ── TTS: Deepgram ──
    dg_key = await _get_provider_api_key("deepgram")
    dg_tts_voices = [
        VoiceEntry(id="aura-2-thalia-en", name="Thalia (English - Female)", provider="deepgram"),
        VoiceEntry(id="aura-2-andromeda-en", name="Andromeda (English - Male)", provider="deepgram"),
        VoiceEntry(id="aura-2-arcas-en", name="Arcas (English - Male)", provider="deepgram"),
        VoiceEntry(id="aura-2-helios-en", name="Helios (English - Male)", provider="deepgram"),
        VoiceEntry(id="aura-2-luna-en", name="Luna (English - Female)", provider="deepgram"),
        VoiceEntry(id="aura-2-orion-en", name="Orion (English - Male)", provider="deepgram"),
        VoiceEntry(id="aura-2-perseus-en", name="Perseus (English - Male)", provider="deepgram"),
        VoiceEntry(id="aura-2-stella-en", name="Stella (English - Female)", provider="deepgram"),
    ]
    tts_engines.append(TTSEngineInfo(
        engine="deepgram",
        status="configured" if dg_key else "not_configured",
        voices=dg_tts_voices,
    ))

    # ── STT: Whisper (local) ──
    whisper_status = "configured"
    try:
        health = await _check_service_health("Whisper STT", WHISPER_STT_URL, "/health")
        if health.status == "healthy":
            whisper_status = "healthy"
    except Exception:
        pass
    stt_engines.append(STTEngineInfo(
        engine="whisper",
        status=whisper_status,
        models=[os.getenv("WHISPER__MODEL", "Systran/faster-whisper-base")],
    ))

    # ── STT: OpenAI Whisper ──
    stt_engines.append(STTEngineInfo(
        engine="openai",
        status="configured" if openai_key else "not_configured",
        models=["whisper-1"] if openai_key else [],
    ))

    # ── STT: Deepgram ──
    dg_key = await _get_provider_api_key("deepgram")
    stt_engines.append(STTEngineInfo(
        engine="deepgram",
        status="configured" if dg_key else "not_configured",
        models=["nova-3", "nova-2", "nova-2-general"] if dg_key else [],
    ))

    # ── WebRTC: LiveKit ──
    livekit_status = "configured"
    try:
        health = await _check_service_health("LiveKit SFU", LIVEKIT_URL, "/")
        if health.status == "healthy":
            livekit_status = "healthy"
    except Exception:
        pass

    return VoiceRegistryResponse(
        tts_engines=tts_engines,
        stt_engines=stt_engines,
        webrtc={"livekit": WebRTCInfo(status=livekit_status, ws_url=LIVEKIT_WS_URL)},
        active_tts_engine=os.getenv("TTS_ENGINE", "kokoro"),
        active_stt_engine=os.getenv("STT_ENGINE", "whisper"),
    )


# ── Voice Settings (Database-backed) ─────────────────────────────────


class VoiceSettings(BaseModel):
    """Voice AI configuration — supports multi-engine TTS/STT."""

    # Core service URLs
    livekit_ws_url: str = Field(
        default="ws://localhost:7880", description="LiveKit WebSocket URL for client"
    )
    livekit_api_key_set: bool = Field(
        default=False, description="Whether LiveKit API key is configured"
    )
    kokoro_tts_url: str = Field(
        default="http://kokoro-tts:8880", description="Kokoro TTS service URL"
    )
    kokoro_default_voice: str = Field(
        default="af_heart", description="Default Kokoro TTS voice"
    )
    kokoro_default_speed: float = Field(
        default=1.0, ge=0.25, le=4.0, description="Default TTS speed"
    )
    whisper_stt_url: str = Field(
        default="http://whisper-stt:8000", description="Faster Whisper service URL"
    )
    whisper_model: str = Field(
        default="Systran/faster-whisper-large-v3",
        description="Whisper model name",
    )
    whisper_compute_type: str = Field(
        default="int8", description="Whisper compute type"
    )
    voice_enabled: bool = Field(
        default=True, description="Enable/disable voice features globally"
    )

    # Multi-engine TTS
    tts_engine: str = Field(
        default="kokoro",
        description="Active TTS engine: kokoro | openai | elevenlabs | deepgram",
    )
    openai_tts_voice: str = Field(
        default="alloy", description="OpenAI TTS voice name"
    )
    openai_tts_model: str = Field(
        default="tts-1", description="OpenAI TTS model"
    )
    openai_tts_speed: float = Field(
        default=1.0, ge=0.25, le=4.0, description="OpenAI TTS speed"
    )
    openai_api_key_set: bool = Field(
        default=False, description="Whether OpenAI API key is available"
    )
    elevenlabs_voice_id: str = Field(
        default="21m00Tcm4TlvDq8ikWAM", description="ElevenLabs voice ID (default: Rachel, public)"
    )
    elevenlabs_model_id: str = Field(
        default="eleven_v3", description="ElevenLabs model ID"
    )
    elevenlabs_stability: float = Field(
        default=0.5, ge=0.0, le=1.0, description="ElevenLabs voice stability"
    )
    elevenlabs_similarity_boost: float = Field(
        default=0.75, ge=0.0, le=1.0, description="ElevenLabs similarity boost"
    )
    elevenlabs_api_key_set: bool = Field(
        default=False, description="Whether ElevenLabs API key is available"
    )
    deepgram_tts_voice: str = Field(
        default="aura-2-thalia-en", description="Deepgram TTS voice/model"
    )

    # Multi-engine STT
    stt_engine: str = Field(
        default="whisper",
        description="Active STT engine: whisper | openai | deepgram",
    )
    deepgram_api_key_set: bool = Field(
        default=False, description="Whether Deepgram API key is available"
    )
    openai_stt_model: str = Field(
        default="gpt-4o-transcribe", description="OpenAI STT model"
    )
    openai_stt_language: str = Field(
        default="en", description="OpenAI STT language"
    )
    deepgram_stt_model: str = Field(
        default="nova-3", description="Deepgram STT model"
    )
    deepgram_stt_language: str = Field(
        default="en", description="Deepgram STT language"
    )
    deepgram_smart_format: bool = Field(
        default=True, description="Deepgram smart formatting"
    )
    deepgram_punctuate: bool = Field(
        default=True, description="Deepgram auto-punctuation"
    )
    deepgram_diarize: bool = Field(
        default=False, description="Deepgram speaker diarization"
    )

    # LiveKit mode
    livekit_mode: str = Field(
        default="local",
        description="LiveKit deployment: local | remote",
    )
    livekit_remote_ws_url: str = Field(
        default="", description="Remote LiveKit WebSocket URL"
    )
    livekit_remote_api_key: str = Field(
        default="", description="Remote LiveKit API Key"
    )
    livekit_remote_api_secret: str = Field(
        default="", description="Remote LiveKit API Secret"
    )
    livekit_remote_api_key_set: bool = Field(
        default=False, description="Whether remote LiveKit API key is configured"
    )


@router.get("/voice/settings", response_model=VoiceSettings)
async def get_voice_settings():
    """
    Get voice AI settings.
    Loads persisted preferences from SurrealDB and merges with
    runtime API key availability checks.
    """
    config = await VoiceSettingsConfig.get_instance()

    openai_key = await _get_provider_api_key("openai")
    elevenlabs_key = await _get_provider_api_key("elevenlabs")
    deepgram_key = await _get_provider_api_key("deepgram")

    return VoiceSettings(
        # Runtime / infrastructure
        livekit_ws_url=LIVEKIT_WS_URL,
        livekit_api_key_set=bool(LIVEKIT_API_KEY),
        kokoro_tts_url=KOKORO_TTS_URL,
        whisper_stt_url=WHISPER_STT_URL,
        # API key availability flags
        openai_api_key_set=bool(openai_key),
        elevenlabs_api_key_set=bool(elevenlabs_key),
        deepgram_api_key_set=bool(deepgram_key),
        # Persisted user preferences (all from domain model)
        tts_engine=config.tts_engine,
        stt_engine=config.stt_engine,
        kokoro_default_voice=config.kokoro_default_voice,
        kokoro_default_speed=config.kokoro_default_speed,
        openai_tts_voice=config.openai_tts_voice,
        openai_tts_model=config.openai_tts_model,
        openai_tts_speed=config.openai_tts_speed,
        elevenlabs_voice_id=config.elevenlabs_voice_id,
        elevenlabs_model_id=config.elevenlabs_model_id,
        elevenlabs_stability=config.elevenlabs_stability,
        elevenlabs_similarity_boost=config.elevenlabs_similarity_boost,
        deepgram_tts_voice=config.deepgram_tts_voice,
        openai_stt_model=config.openai_stt_model,
        openai_stt_language=config.openai_stt_language,
        deepgram_stt_model=config.deepgram_stt_model,
        deepgram_stt_language=config.deepgram_stt_language,
        deepgram_smart_format=config.deepgram_smart_format,
        deepgram_punctuate=config.deepgram_punctuate,
        deepgram_diarize=config.deepgram_diarize,
        whisper_model=config.whisper_model,
        whisper_compute_type=config.whisper_compute_type,
        voice_enabled=config.voice_enabled,
        livekit_mode=config.livekit_mode,
        livekit_remote_ws_url=config.livekit_remote_ws_url,
        livekit_remote_api_key=config.livekit_remote_api_key,
        livekit_remote_api_secret=config.livekit_remote_api_secret,
        livekit_remote_api_key_set=bool(config.livekit_remote_api_key),
    )


@router.put("/voice/settings", response_model=VoiceSettings)
async def update_voice_settings(request: Request):
    """
    Update voice AI settings.
    Accepts partial JSON — only the fields present in the request body
    are updated. Missing fields are left unchanged in the database.
    Returns the merged settings with runtime API key checks.
    """
    config = await VoiceSettingsConfig.get_instance()
    body = await request.json()

    # All user-controllable fields (excludes read-only runtime fields
    # like *_url, *_api_key_set which are computed at read time)
    WRITABLE_FIELDS = {
        "tts_engine", "stt_engine",
        "kokoro_default_voice", "kokoro_default_speed",
        "openai_tts_voice", "openai_tts_model", "openai_tts_speed",
        "elevenlabs_voice_id", "elevenlabs_model_id",
        "elevenlabs_stability", "elevenlabs_similarity_boost",
        "deepgram_tts_voice",
        "openai_stt_model", "openai_stt_language",
        "deepgram_stt_model", "deepgram_stt_language",
        "deepgram_smart_format", "deepgram_punctuate", "deepgram_diarize",
        "whisper_model", "whisper_compute_type",
        "voice_enabled",
        "livekit_mode", "livekit_remote_ws_url", "livekit_remote_api_key", "livekit_remote_api_secret",
    }

    # Only patch fields that were explicitly sent in the request
    update_dict = {k: v for k, v in body.items() if k in WRITABLE_FIELDS}

    # Warn about unknown fields (helps catch typos — #12)
    unknown_fields = set(body.keys()) - WRITABLE_FIELDS - {
        # Read-only fields that are expected in round-trip but ignored
        "livekit_ws_url", "livekit_api_key_set", "kokoro_tts_url", "whisper_stt_url",
        "openai_api_key_set", "elevenlabs_api_key_set", "deepgram_api_key_set",
        "livekit_remote_api_key_set",
    }
    if unknown_fields:
        logger.warning(f"Voice settings PUT: ignoring unknown fields: {unknown_fields}")

    # Validate engine enum values (H3)
    VALID_TTS_ENGINES = {"kokoro", "openai", "elevenlabs", "deepgram"}
    VALID_STT_ENGINES = {"whisper", "openai", "deepgram"}
    if "tts_engine" in update_dict and update_dict["tts_engine"] not in VALID_TTS_ENGINES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid tts_engine '{update_dict['tts_engine']}'. Must be one of: {', '.join(sorted(VALID_TTS_ENGINES))}"
        )
    if "stt_engine" in update_dict and update_dict["stt_engine"] not in VALID_STT_ENGINES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid stt_engine '{update_dict['stt_engine']}'. Must be one of: {', '.join(sorted(VALID_STT_ENGINES))}"
        )

    if update_dict:
        await config.patch(update_dict)
        logger.info(
            f"Voice settings updated ({len(update_dict)} fields): "
            f"{', '.join(update_dict.keys())}"
        )

    # Return merged settings with fresh API key checks
    return await get_voice_settings()


class VoicePreflightRequest(BaseModel):
    engine: str = Field(..., description="TTS engine: kokoro | openai | elevenlabs | deepgram")

    @field_validator("engine")
    @classmethod
    def validate_engine(cls, v: str) -> str:
        valid_engines = {"kokoro", "openai", "elevenlabs", "deepgram"}
        if v not in valid_engines:
            raise ValueError(f"Invalid engine. Must be one of: {', '.join(sorted(valid_engines))}")
        return v


class VoicePreflightResponse(BaseModel):
    engine: str
    status: str  # "healthy", "unavailable", "not_configured", "error"
    latency_ms: Optional[float] = None
    details: Optional[str] = None


@router.post("/voice/preflight", response_model=VoicePreflightResponse)
async def tts_preflight_check(payload: VoicePreflightRequest):
    """
    Perform pre-flight health and credential validation checks for a TTS engine
    before allowing selection or routing.
    """
    engine = payload.engine

    if engine == "kokoro":
        try:
            health = await _check_service_health("Kokoro TTS", KOKORO_TTS_URL, "/health")
            return VoicePreflightResponse(
                engine="kokoro",
                status="healthy" if health.status == "healthy" else health.status,
                latency_ms=health.latency_ms,
                details=health.details,
            )
        except Exception as e:
            return VoicePreflightResponse(
                engine="kokoro",
                status="error",
                details=_sanitize_upstream_error(str(e)),
            )

    elif engine == "openai":
        api_key = await _get_provider_api_key("openai")
        if not api_key:
            return VoicePreflightResponse(
                engine="openai",
                status="not_configured",
                details="OpenAI API key not set",
            )
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                latency = (time.monotonic() - start) * 1000
                if resp.status_code == 200:
                    return VoicePreflightResponse(
                        engine="openai",
                        status="healthy",
                        latency_ms=round(latency, 1),
                    )
                else:
                    details = _sanitize_upstream_error(resp.text)
                    return VoicePreflightResponse(
                        engine="openai",
                        status="error",
                        latency_ms=round(latency, 1),
                        details=f"HTTP {resp.status_code}: {details}",
                    )
        except Exception as e:
            return VoicePreflightResponse(
                engine="openai",
                status="error",
                details=_sanitize_upstream_error(str(e)),
            )

    elif engine == "elevenlabs":
        api_key = await _get_provider_api_key("elevenlabs")
        if not api_key:
            return VoicePreflightResponse(
                engine="elevenlabs",
                status="not_configured",
                details="ElevenLabs API key not set",
            )
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://api.elevenlabs.io/v1/voices",
                    headers={"xi-api-key": api_key}
                )
                latency = (time.monotonic() - start) * 1000
                if resp.status_code == 200:
                    return VoicePreflightResponse(
                        engine="elevenlabs",
                        status="healthy",
                        latency_ms=round(latency, 1),
                    )
                else:
                    details = _sanitize_upstream_error(resp.text)
                    return VoicePreflightResponse(
                        engine="elevenlabs",
                        status="error",
                        latency_ms=round(latency, 1),
                        details=f"HTTP {resp.status_code}: {details}",
                    )
        except Exception as e:
            return VoicePreflightResponse(
                engine="elevenlabs",
                status="error",
                details=_sanitize_upstream_error(str(e)),
            )

    elif engine == "deepgram":
        api_key = await _get_provider_api_key("deepgram")
        if not api_key:
            return VoicePreflightResponse(
                engine="deepgram",
                status="not_configured",
                details="Deepgram API key not set",
            )
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://api.deepgram.com/v1/projects",
                    headers={"Authorization": f"Token {api_key}"}
                )
                latency = (time.monotonic() - start) * 1000
                if resp.status_code == 200:
                    return VoicePreflightResponse(
                        engine="deepgram",
                        status="healthy",
                        latency_ms=round(latency, 1),
                    )
                else:
                    details = _sanitize_upstream_error(resp.text)
                    return VoicePreflightResponse(
                        engine="deepgram",
                        status="error",
                        latency_ms=round(latency, 1),
                        details=f"HTTP {resp.status_code}: {details}",
                    )
        except Exception as e:
            return VoicePreflightResponse(
                engine="deepgram",
                status="error",
                details=_sanitize_upstream_error(str(e)),
            )


# ── Startup logging ──────────────────────────────────────────────────
logger.info(
    f"Voice AI services configured: "
    f"LiveKit={LIVEKIT_URL}, Kokoro={KOKORO_TTS_URL}, Whisper={WHISPER_STT_URL}"
)


# ── STT Transcription ────────────────────────────────────────────────


@router.post("/voice/stt/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    engine: Optional[str] = Form("whisper"),
):
    """
    Transcribe audio via configurable STT engine.

    Engines:
    - whisper (default): Local Faster Whisper service
    - openai: OpenAI Whisper API (requires OPENAI_API_KEY)
    - deepgram: Deepgram API (requires DEEPGRAM_API_KEY)
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    try:
        audio_data = await file.read()
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        files_payload = {
            "file": (file.filename, audio_data, file.content_type or "audio/wav"),
        }

        if engine == "openai":
            # Proxy to OpenAI Whisper API
            api_key = await _get_provider_api_key("openai")
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="OpenAI API key not configured. Add it in Settings → Voice or Settings → Models & API Keys.",
                )
            data = {"model": model or "whisper-1"}
            if language:
                data["language"] = language

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files=files_payload,
                    data=data,
                )

        elif engine == "deepgram":
            # Proxy to Deepgram API
            api_key = await _get_provider_api_key("deepgram")
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="Deepgram API key not configured. Add it in Settings → Voice or Settings → Models & API Keys.",
                )
            # Use user's persisted STT model as default
            if not model:
                try:
                    stt_config = await VoiceSettingsConfig.get_instance()
                    model = stt_config.deepgram_stt_model or "nova-3"
                except Exception:
                    model = "nova-3"
            params = {"model": model, "smart_format": "true"}
            if language:
                params["language"] = language

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.deepgram.com/v1/listen",
                    headers={
                        "Authorization": f"Token {api_key}",
                        "Content-Type": file.content_type or "audio/wav",
                    },
                    content=audio_data,
                    params=params,
                )

            # Normalize Deepgram response to OpenAI format
            if response.status_code == 200:
                dg_data = response.json()
                transcript = ""
                try:
                    transcript = dg_data["results"]["channels"][0]["alternatives"][0]["transcript"]
                except (KeyError, IndexError):
                    pass
                return {"text": transcript}

        else:
            # Default: Local Whisper
            data = {"model": model or WHISPER_DEFAULT_MODEL}
            if language:
                data["language"] = language

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{WHISPER_STT_URL}/v1/audio/transcriptions",
                    files=files_payload,
                    data=data,
                )

        if response.status_code != 200:
            logger.error(
                f"STT error ({engine}): {response.status_code} — {response.text}"
            )
            raise HTTPException(
                status_code=502,
                detail=f"STT service returned {response.status_code}: {_sanitize_upstream_error(response.text)}",
            )

        return response.json()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to STT service ({engine})",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── OpenAI TTS Proxy ─────────────────────────────────────────────────


class OpenAITTSRequest(BaseModel):
    """Request for OpenAI TTS synthesis."""
    input: str = Field(..., description="Text to synthesize", max_length=5000)
    voice: str = Field(default="alloy", description="OpenAI voice name")
    model: str = Field(default="tts-1", description="TTS model")
    response_format: str = Field(default="mp3", description="Audio format")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)


@router.post("/voice/tts/openai")
async def openai_tts_synthesize(request: OpenAITTSRequest):
    """
    Synthesize speech using OpenAI's TTS API.
    Proxies to https://api.openai.com/v1/audio/speech.
    Requires OPENAI_API_KEY environment variable.
    """
    api_key = await _get_provider_api_key("openai")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured. Add it in Settings → Voice or Settings → Models & API Keys.",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": request.model,
                    "input": request.input,
                    "voice": request.voice,
                    "response_format": request.response_format,
                    "speed": request.speed,
                },
            )

        if response.status_code != 200:
            logger.error(f"OpenAI TTS error: {response.status_code} — {response.text[:200]}")
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI TTS returned {response.status_code}",
            )

        content_type = {
            "mp3": "audio/mpeg",
            "opus": "audio/opus",
            "aac": "audio/aac",
            "flac": "audio/flac",
            "wav": "audio/wav",
            "pcm": "audio/pcm",
        }.get(request.response_format, "audio/mpeg")

        return StreamingResponse(
            content=iter([response.content]),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="speech.{request.response_format}"'},
        )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to OpenAI API",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── ElevenLabs TTS Proxy ─────────────────────────────────────────────


class ElevenLabsTTSRequest(BaseModel):
    """Request for ElevenLabs TTS synthesis."""
    input: str = Field(..., description="Text to synthesize", max_length=5000)
    voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", description="ElevenLabs voice ID (default: Rachel)")
    model_id: str = Field(default="eleven_v3", description="ElevenLabs model")
    stability: float = Field(default=0.5, ge=0.0, le=1.0)
    similarity_boost: float = Field(default=0.75, ge=0.0, le=1.0)
    output_format: str = Field(default="mp3_44100_128", description="Output format")


@router.post("/voice/tts/elevenlabs")
async def elevenlabs_tts_synthesize(request: ElevenLabsTTSRequest):
    """
    Synthesize speech using ElevenLabs TTS API.
    Proxies to https://api.elevenlabs.io/v1/text-to-speech/{voice_id}.
    Requires ELEVENLABS_API_KEY.
    """
    api_key = await _get_provider_api_key("elevenlabs")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="ElevenLabs API key not configured. Add it in Settings \u2192 Voice or Settings \u2192 Models & API Keys.",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}?output_format={request.output_format}",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": request.input,
                    "model_id": request.model_id,
                    "voice_settings": {
                        "stability": request.stability,
                        "similarity_boost": request.similarity_boost,
                    },
                },
            )

        if response.status_code != 200:
            logger.error(f"ElevenLabs TTS error: {response.status_code} \u2014 {response.text[:200]}")
            raise HTTPException(
                status_code=502,
                detail=f"ElevenLabs TTS returned {response.status_code}",
            )

        return StreamingResponse(
            content=iter([response.content]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'attachment; filename="speech.mp3"'},
        )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to ElevenLabs API",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Deepgram TTS Proxy ───────────────────────────────────────────────


class DeepgramTTSRequest(BaseModel):
    """Request for Deepgram TTS synthesis."""
    input: str = Field(..., description="Text to synthesize", max_length=5000)
    model: str = Field(default="aura-2-thalia-en", description="Deepgram TTS model")


@router.post("/voice/tts/deepgram")
async def deepgram_tts_synthesize(request: DeepgramTTSRequest):
    """
    Synthesize speech using Deepgram TTS API.
    Proxies to https://api.deepgram.com/v1/speak.
    Requires DEEPGRAM_API_KEY.
    """
    api_key = await _get_provider_api_key("deepgram")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Deepgram API key not configured. Add it in Settings \u2192 Voice or Settings \u2192 Models & API Keys.",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.deepgram.com/v1/speak?model={request.model}",
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": "application/json",
                },
                json={"text": request.input},
            )

        if response.status_code != 200:
            logger.error(f"Deepgram TTS error: {response.status_code} \u2014 {response.text[:200]}")
            raise HTTPException(
                status_code=502,
                detail=f"Deepgram TTS returned {response.status_code}",
            )

        return StreamingResponse(
            content=iter([response.content]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'attachment; filename="speech.mp3"'},
        )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Deepgram API",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deepgram TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/upload-custom")
async def upload_custom_voice(
    file: UploadFile = File(...),
    speaker_name: str = Form(...),
    provider: str = Form("kokoro"),
):
    """
    Upload a custom voice audio recording/file.
    Saves it locally, and if the provider is ElevenLabs, triggers instant voice cloning
    to retrieve a valid ElevenLabs voice ID.
    """
    import uuid
    from open_notebook.config import DATA_FOLDER

    custom_voices_dir = os.path.join(DATA_FOLDER, "custom_voices")
    os.makedirs(custom_voices_dir, exist_ok=True)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    ext = os.path.splitext(file.filename)[1] or ".wav"
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    local_path = os.path.join(custom_voices_dir, filename)

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        with open(local_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved custom voice recording to: {local_path}")

        # If ElevenLabs is selected, trigger instant voice cloning
        if provider == "elevenlabs":
            api_key = await _get_provider_api_key("elevenlabs")
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="ElevenLabs API key is required to clone custom voices. Add it in Settings → Voice or Settings → Models & API Keys.",
                )

            headers = {"xi-api-key": api_key}
            files = {
                "files": (file.filename, content, file.content_type or "audio/wav"),
            }
            data = {
                "name": f"Clone: {speaker_name} ({file_id[:8]})",
                "description": f"Custom voice recording for speaker {speaker_name}",
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.elevenlabs.io/v1/voices/add",
                    headers=headers,
                    files=files,
                    data=data,
                )

            if response.status_code != 200:
                logger.error(f"ElevenLabs voice cloning failed: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"ElevenLabs cloning failed: {response.text}",
                )

            res_data = response.json()
            voice_id = res_data.get("voice_id")
            if not voice_id:
                raise HTTPException(
                    status_code=502,
                    detail="ElevenLabs did not return a voice ID",
                )

            logger.info(f"ElevenLabs instant voice clone successful! Voice ID: {voice_id}")
            return {
                "voice_id": voice_id,
                "custom_voice_path": local_path,
                "message": "Voice successfully cloned in ElevenLabs",
            }

        # Otherwise (Kokoro, OpenAI, Deepgram, etc.)
        # We save it locally, and return a mock/custom ID prefixing with custom_
        return {
            "voice_id": f"custom_{file_id}",
            "custom_voice_path": local_path,
            "message": "Custom voice recording saved locally",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to handle custom voice upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── OpenAI-Compatible Completions Endpoint for LiveKit Agent ──────────


class OpenAICompletionsMessage(BaseModel):
    role: str
    content: str


class OpenAICompletionsRequest(BaseModel):
    messages: List[OpenAICompletionsMessage]
    model: str = "default"
    stream: bool = True


@router.post("/voice/agent/llm/v1/chat/completions")
async def agent_llm_completions(
    request: OpenAICompletionsRequest,
    x_notebook_id: Optional[str] = Header(None),
    x_session_id: Optional[str] = Header(None)
):
    """
    OpenAI-compatible completions proxy for the LiveKit voice agent.
    Performs RAG context retrieval using x_notebook_id, streams responses,
    and saves turns to x_session_id.
    """
    logger.info(f"Received agent completions request. Notebook ID: {x_notebook_id}, Session ID: {x_session_id}, messages count: {len(request.messages)}")
    
    # Retrieve the last user message
    user_query = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_query = msg.content
            break

    if not user_query:
        user_query = "Hello"

    rag_context = ""
    sources_used = 0

    if x_notebook_id:
        try:
            notebook = await Notebook.get(x_notebook_id)
            if notebook:
                # Build context from sources
                try:
                    sources = await notebook.get_sources()
                    for src in sources[:5]:
                        title = src.title or "Untitled"
                        rag_context += f"Source: {title}\n"
                        sources_used += 1
                except Exception as e:
                    logger.warning(f"Voice agent completions: failed to get notebook sources: {e}")

                try:
                    notes = await notebook.get_notes()
                    for note in notes[:5]:
                        title = note.title or "Untitled"
                        content = (note.content or "")[:300]
                        rag_context += f"Note: {title}\n{content}\n\n"
                        sources_used += 1
                except Exception as e:
                    logger.warning(f"Voice agent completions: failed to get notebook notes: {e}")
        except Exception as e:
            logger.warning(f"Voice agent completions: failed to get notebook context: {e}")

    # Vector search
    try:
        results = await vector_search(
            keyword=user_query,
            results=5,
            source=True,
            note=True,
            minimum_score=0.3,
        )
        if results:
            for i, r in enumerate(results, 1):
                title = r.get("title", f"Source {i}") if isinstance(r, dict) else getattr(r, "title", f"Source {i}")
                content = (r.get("content", "") if isinstance(r, dict) else getattr(r, "content", ""))[:400]
                rag_context += f"[{i}] {title}\n{content}\n\n"
                sources_used += 1
    except Exception as e:
        logger.warning(f"Voice agent completions: RAG search failed: {e}")

    system_prompt = (
        "You are a helpful voice assistant for a research and knowledge management platform. "
        "Respond conversationally and concisely — your response will be read aloud via TTS. "
        "Keep responses under 3 paragraphs unless explicitly asked. "
        "When using context, reference key points naturally but don't list source numbers."
    )

    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    payload_messages = [SystemMessage(content=system_prompt)]

    # Append chat history (excluding the last user message)
    history_messages = request.messages[:-1]
    for msg in history_messages:
        if msg.role == "system":
            payload_messages.append(SystemMessage(content=msg.content))
        elif msg.role == "user":
            payload_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            payload_messages.append(AIMessage(content=msg.content))

    # Append user prompt with RAG context
    final_prompt = ""
    if rag_context:
        final_prompt += f"Context from knowledge base:\n{rag_context}\n\n"
    final_prompt += f"User query: {user_query}"
    payload_messages.append(HumanMessage(content=final_prompt))

    from open_notebook.ai.provision import provision_langchain_model
    llm = await provision_langchain_model(
        content=final_prompt, model_id=None, default_type="chat"
    )

    async def event_generator():
        try:
            accumulated = ""
            async for chunk in llm.astream(payload_messages):
                content = extract_text_content(chunk.content)
                if content:
                    accumulated += content
                    choice = {
                        "choices": [
                            {
                                "delta": {"content": content},
                                "index": 0,
                                "finish_reason": None
                            }
                        ]
                    }
                    yield f"data: {json.dumps(choice)}\n\n"

            # Persist prompt and completion to session in the database
            if x_session_id:
                try:
                    from api.routers.voice_sessions import add_voice_message, VoiceMessageRequest
                    await add_voice_message(
                        session_id=x_session_id,
                        request=VoiceMessageRequest(role="human", content=user_query)
                    )
                    await add_voice_message(
                        session_id=x_session_id,
                        request=VoiceMessageRequest(role="ai", content=accumulated)
                    )
                    logger.info(f"Saved real-time voice message turn to session {x_session_id}")
                except Exception as db_err:
                    logger.warning(f"Failed to save voice messages to database: {db_err}")

            choice_final = {
                "choices": [
                    {
                        "delta": {},
                        "index": 0,
                        "finish_reason": "stop"
                    }
                ]
            }
            yield f"data: {json.dumps(choice_final)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Voice agent completions stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    if request.stream:
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    else:
        response = await llm.ainvoke(payload_messages)
        answer = extract_text_content(response.content)
        if x_session_id:
            try:
                from api.routers.voice_sessions import add_voice_message, VoiceMessageRequest
                await add_voice_message(
                    session_id=x_session_id,
                    request=VoiceMessageRequest(role="human", content=user_query)
                )
                await add_voice_message(
                    session_id=x_session_id,
                    request=VoiceMessageRequest(role="ai", content=answer)
                )
            except Exception as db_err:
                logger.warning(f"Failed to save voice messages to database: {db_err}")
        return {
            "choices": [
                {
                    "message": {"role": "assistant", "content": answer},
                    "finish_reason": "stop",
                    "index": 0
                }
            ]
        }

