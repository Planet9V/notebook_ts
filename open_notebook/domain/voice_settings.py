"""Voice settings domain model — singleton config persisted in SurrealDB."""
from typing import ClassVar, Optional

from pydantic import Field

from open_notebook.domain.base import RecordModel


class VoiceSettingsConfig(RecordModel):
    record_id: ClassVar[str] = "open_notebook:voice_settings"

    # Active engines
    tts_engine: str = Field(default="kokoro", description="Active TTS engine")
    stt_engine: str = Field(default="whisper", description="Active STT engine")

    # Kokoro preferences
    kokoro_default_voice: str = Field(default="af_heart")
    kokoro_default_speed: float = Field(default=1.0)

    # OpenAI TTS preferences
    openai_tts_voice: str = Field(default="alloy")
    openai_tts_model: str = Field(default="tts-1")
    openai_tts_speed: float = Field(default=1.0)

    # ElevenLabs TTS preferences
    elevenlabs_voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM")  # Rachel (public)
    elevenlabs_model_id: str = Field(default="eleven_v3")
    elevenlabs_stability: float = Field(default=0.5)
    elevenlabs_similarity_boost: float = Field(default=0.75)

    # Deepgram TTS preferences
    deepgram_tts_voice: str = Field(default="aura-2-thalia-en")

    # OpenAI STT preferences
    openai_stt_model: str = Field(default="gpt-4o-transcribe")
    openai_stt_language: str = Field(default="en")

    # Deepgram STT preferences
    deepgram_stt_model: str = Field(default="nova-3")
    deepgram_stt_language: str = Field(default="en")
    deepgram_smart_format: bool = Field(default=True)
    deepgram_punctuate: bool = Field(default=True)
    deepgram_diarize: bool = Field(default=False)

    # Whisper preferences
    whisper_model: str = Field(default="Systran/faster-whisper-large-v3")
    whisper_compute_type: str = Field(default="int8")

    # LiveKit
    livekit_mode: str = Field(default="local")
    livekit_remote_ws_url: str = Field(default="")
    livekit_remote_api_key: str = Field(default="")

    # Global
    voice_enabled: bool = Field(default=True)
