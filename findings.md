# Findings & Decisions: Voice & Podcast, CRM, RAG, and Publication Roadmap

**Date:** 2026-06-03  
**Goal:** Track requirements and research findings for the upcoming features.

---

## Requirements

1. **TTS Engine Pre-Flight Checks & Backend Validation (Item 1)**
   - Pre-flight checks for Kokoro, OpenAI, ElevenLabs, and Deepgram in `api/routers/voice.py`
   - Active validation of API keys, URLs, and status before enabling selection in settings
   - Zero-stub, high-fidelity error sanitization

2. **Autonomous Episode Writing & Scheduling Engine (Item 2)**
   - Crawl notebook sources, notes, and frameworks dynamically
   - Build background worker task to outline episodes and draft transcripts
   - Database schemas for scheduled episodes and publication statuses

3. **Advanced Voice RAG Citations & Dialogue Memory (Item 3)**
   - Short-term conversation dialogue memory for multi-turn WebRTC chat
   - Streaming document source citations via custom SSE sub-events in LiveKit Voice RAG

4. **CRM & Sales Pipeline Multi-Views (Items 4-6)**
   - Multi-views (Table, List, Calendar) on Kanban board
   - Card assignment to team members (`user` relation)
   - Deal cards linked to customer ledger records and project notebooks

5. **Multi-Engine Search & RAG Enhancements (Items 7-9)**
   - Native cross-encoder and local Ollama reranking support
   - Sliders and selection configurations inside Search Settings UI
   - Multiple pipeline types (Sales, Research, Publication)

6. **Social Media, Email & Docs Publication (Items 10-13)**
   - SMTP & OAuth integration for automated email sequencing
   - Content calendar and post scheduling with media attachment options
   - Post performance metrics tracker (impressions, reactions, replies)
   - Styleguide-driven PDF/DOCX templates and Google Workspace connectors

---

## Research Findings

### 1. Voice Router (`api/routers/voice.py`)
- We discovered that `voice.py` resolves API keys for OpenAI, ElevenLabs, and Deepgram via `_get_provider_api_key`.
- It currently exposes a fallback hardcoded list of voices for Kokoro if the service is offline.
- A new endpoint `POST /api/voice/preflight` needs to be defined to test engine configurations dynamically (e.g. attempting a minimal TTS synthesis query or validating API credentials).

### 2. Podcasts & Episode Profiles (`api/routers/podcasts.py`)
- `podcasts.py` contains basic podcast structure and episode metadata.
- We need to introduce background worker tasks using Python's asyncio or background tasks parameter to compile and schedule episodes asynchronously without blocking the client thread.

### 3. Voice RAG (`api/routers/voice_rag.py`)
- `voice_rag.py` coordinates LiveKit sessions.
- Multi-turn dialogue memory is currently stateless or relies on LiveKit WebRTC state. To support multi-turn dialogue memory, we need to persist dialogue context (e.g. recent conversation turns) in a session-tied memory buffer.
- Source citations must be structured as server-sent events (`citations` event) and sent to the client to render on-screen.

---

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| State-backed Conversation Memory | Preserves context across multi-turn WebRTC voice streams, preventing LLM context loss |
| SSE-Based Citations | Standardized Server-Sent Events are already used in standard chat; extending this to Voice RAG ensures UI alignment |
| background_tasks for Scheduler | FastAPI's built-in `BackgroundTasks` avoids external Celery/RabbitMQ dependencies, keeping container footprint low |

---

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| None | - |

---

## Resources
- PRD: [PRD.md](file:///Users/jimmcknney/notebook_tetrel/docs/PRD.md)
- Voice Router: [voice.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/voice.py)
- Voice RAG: [voice_rag.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/voice_rag.py)
- Podcasts Router: [podcasts.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/podcasts.py)

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
