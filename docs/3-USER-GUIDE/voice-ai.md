# Voice AI

Tetrel Notebook includes a real-time Voice AI assistant powered by LiveKit WebRTC, Kokoro TTS, and Whisper STT. Talk to your notebooks hands-free.

## Quick Start

1. Navigate to **Voice Playground** in the left sidebar
2. Give your session a unique, descriptive name (e.g., "Climate Research — June 12")
3. Select your voice and language
4. Click **Start Session** — your microphone activates
5. Speak naturally — the AI responds in your chosen voice

## Session Naming Requirement

Every voice session **must have a unique name**. This name:
- Identifies the session in your history
- Is used to persist your voice choice for future sessions
- Must be different from all your previous session names

## Choosing a Voice

Tetrel supports 67+ voices via Kokoro TTS. The voice you select is:

- **Stored persistently** in the database (not just for the current session)
- **Remembered** across browser sessions
- **Available** to all users (shared voice library)

### Voice Categories

| Prefix | Language/Accent |
|---|---|
| `af_` | American English (female) |
| `am_` | American English (male) |
| `bf_` | British English (female) |
| `bm_` | British English (male) |
| `jf_` | Japanese (female) |
| `zf_` | Chinese (female) |
| (others) | Various languages |

### Default Voice

The default voice is set in **Settings → Voice → TTS Configuration**. Changes take effect immediately for new sessions. The default is pulled from the database — it is not hardcoded.

## Voice Settings (Admin)

Go to **Settings → Voice** to configure:

| Setting | Description |
|---|---|
| **Default TTS Voice** | Voice used when no session preference is stored |
| **Default STT Model** | Whisper model for speech recognition (speed vs. accuracy) |
| **Kokoro Base URL** | Override the TTS service endpoint |
| **Whisper Base URL** | Override the STT service endpoint |
| **LiveKit URL** | WebRTC server endpoint |
| **LiveKit API Key/Secret** | Authentication for LiveKit server |

All settings are stored in SurrealDB and applied immediately — no restart required.

## RAG Context

The Voice AI automatically retrieves context from your notebooks:

1. Your spoken question is transcribed by Whisper STT
2. The system runs a semantic search against your selected notebook(s)
3. Relevant chunks are injected into the AI's context window
4. The response is generated and spoken back via Kokoro TTS

## Voice Tools

The voice copilot has access to built-in tools:

| Tool | What It Does |
|---|---|
| **Search** | Searches across all your notebooks |
| **Summary** | Summarizes a notebook or source |
| **Query Social** | Fetches recent social content from your sources |

## Session History

All voice sessions are saved. To review:
1. Open **Voice Playground**
2. Select a past session from the session list
3. Read the transcript of the full conversation

## Troubleshooting

| Issue | Solution |
|---|---|
| Microphone not working | Check browser microphone permissions (Settings → Privacy) |
| No voice output | Ensure Kokoro TTS is running: `docker compose ps kokoro-tts` |
| Session won't start | Make sure the session name is unique — duplicate names are rejected |
| Wrong voice plays | The selected voice must be saved — check Settings → Voice for your default |
| Transcription garbled | Try switching to the `large-v3` Whisper model in Settings |

## Technical Details

- **WebRTC**: LiveKit SFU (port 7880/7881)
- **TTS**: Kokoro FastAPI (port 8880) — 67+ voices
- **STT**: faster-whisper (port 8881)
- **Voice persistence**: voices stored in `custom_voice` SurrealDB table (migration 50)
- **Session title**: required, enforced unique per user
