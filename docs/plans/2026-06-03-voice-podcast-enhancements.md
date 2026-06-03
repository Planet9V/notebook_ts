# Sub-Plan: Voice & Podcast Enhancements Implementation Plan

This sub-plan outlines the implementation of Voice and Podcast features, specifically:
1. **TTS Engine Pre-Flight Checks & Backend Validation**
2. **Autonomous Episode Writing & Scheduling Engine**
3. **Advanced Voice RAG Citations & Dialogue Memory**

We follow a strict Test-Driven Development (TDD) cycle: failing tests first, followed by implementation, verification, and code quality audits.

---

### Task 1: TTS Engine Pre-Flight Checks & Backend Validation

**Files:**
- Create: [tests/test_voice_preflight.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_voice_preflight.py)
- Modify: [api/routers/voice.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/voice.py)

**Step 1: Write failing test case**
Create `tests/test_voice_preflight.py` checking the `/api/voice/preflight` endpoint.

**Step 2: Run pytest to verify failure**
Run `.venv/bin/pytest tests/test_voice_preflight.py` and verify failure.

**Step 3: Implement pre-flight validation logic**
Add `POST /api/voice/preflight` in `api/routers/voice.py` that takes an engine name and checks connectivity or credential availability:
- **Kokoro:** check URL health.
- **OpenAI / ElevenLabs / Deepgram:** check credential availability and perform a lightweight metadata check (e.g. fetching models or voices) or key structure check.
- Sanitize all error logs to prevent credential leakage.

**Step 4: Verify test case passes**
Run pytest and confirm all pre-flight checks are green.

---

### Task 2: Autonomous Episode Writing & Scheduling Engine

**Files:**
- Create: [tests/test_episode_scheduler.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_episode_scheduler.py)
- Modify: [api/routers/podcasts.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/podcasts.py)
- Create migration: `32.surrealql` and `32_down.surrealql` to register the `scheduled_episode` table.

**Step 1: Write failing test case**
Create `tests/test_episode_scheduler.py` checking automated episode generation queue and scheduler.

**Step 2: Run pytest to verify failure**
Run `.venv/bin/pytest tests/test_episode_scheduler.py` and verify failure.

**Step 3: Implement database migration**
Create migration 32 to define `scheduled_episode` schema. Register it in `async_migrate.py`.

**Step 4: Implement autonomous episode scheduler**
Add worker task in `api/routers/podcasts.py` that crawls notes and drafts dialogue transcripts. Expose scheduling triggers and lists.

**Step 5: Verify test case passes**
Run pytest and verify that episodes are drafted, persisted, and listed.

---

### Task 3: Advanced Voice RAG Citations & Dialogue Memory

**Files:**
- Create: [tests/test_voice_rag_citation.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_voice_rag_citation.py)
- Modify: [api/routers/voice_rag.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/voice_rag.py)

**Step 1: Write failing test case**
Create `tests/test_voice_rag_citation.py` checking session dialogue context and streaming citation events.

**Step 2: Run pytest to verify failure**
Run `.venv/bin/pytest tests/test_voice_rag_citation.py` and verify failure.

**Step 3: Implement dialogue memory and citations in Voice RAG**
Modify `api/routers/voice_rag.py` to maintain multi-turn short-term conversation context in the session memory buffer, and emit source citation references to the client.

**Step 4: Verify test case passes**
Run pytest and confirm 100% success.
