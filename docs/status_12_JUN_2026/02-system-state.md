# System State Report — June 12, 2026

> Actual running state of all subsystems, compared against documentation claims.

---

## 1. Infrastructure & Services

| Component | Documented | Actual | Match |
|---|---|---|---|
| SurrealDB version | v2 | v2 | ✅ |
| PostgreSQL | pg17 + pgvector | pg17 + pgvector | ✅ |
| Next.js version | `15` (docs/7-DEVELOPMENT), `16` (GEMINI.md) | `^16.2.6` (package.json) | ⚠️ Inconsistent |
| React version | `19` | `^19.2.3` | ✅ |
| Python version | `>=3.11, <3.13` | `3.12` (runtime) | ✅ |
| FastAPI | `>=0.104.0` | Latest compat | ✅ |
| Kokoro TTS | port 8880 | port 8880 ✅ Running | ✅ |
| Whisper STT | port 8881 | port 8881 ✅ Running | ✅ |
| LiveKit | port 7880 | port 7880 ✅ Running | ✅ |
| Frontend port | 8502 | 8502 ✅ | ✅ |
| API port | 5055 | 5055 ✅ | ✅ |
| SurrealDB port | 8000 | 8000 | ✅ |

---

## 2. API Layer

| Claim | Documented | Actual | Status |
|---|---|---|---|
| Router count | "49 Routers" (GEMINI.md) | **47** `include_router` calls in `api/main.py` | 🔴 Discrepancy |
| Migration count | "46+ migrations" (GEMINI.md) | **49** `.surrealql` files (migrations 1–49) | ⚠️ Understated |
| Migrations path | `open_notebook/database/migrations/` | Same ✅ | ✅ |
| Background workers | 4 workers | 4 workers in lifespan | ✅ |
| Podcast migration | Runs on startup | ✅ Confirmed in main.py | ✅ |

### Registered Routers (Actual, from `api/main.py`):
`activities`, `activity_emitter`, `agents`, `assessments`, `auth`, `backup`, `chat`, `commands`, `config`, `contacts`, `containers`, `context`, `credentials`, `customers`, `embedding`, `embedding_rebuild`, `episode_profiles`, `import_export`, `insights`, `languages`, `locations`, `mcp`, `models`, `notebooks`, `notes`, `organizations`, `pipeline`, `platform`, `podcasts`, `projects`, `publications`, `regulations`, `research_items`, `research_memory`, `scheduled_search`, `search`, `settings`, `skills`, `source_chat`, `sources`, `speaker_profiles`, `styleguides`, `system_logs`, `transformations`, `voice`, `voice_rag`, `voice_sessions`, `voice_tools` = **47 registered**

> **Note**: `voice_tools` was added in commit `2c867c4`. GEMINI.md appears to count the router files (49 files incl. `__init__.py`) rather than registrations.

---

## 3. Voice / TTS Subsystem

| Item | State |
|---|---|
| Kokoro voice selection bug | ✅ **Fixed** (Jun 12, 2026 session) |
| Voice count returned by `/voice/config` | **67 voices** (live from Kokoro, was 11 hardcoded) |
| `voice_tools.py` | ✅ Reads `VoiceSettingsConfig.kokoro_default_voice` from DB |
| `voice_sessions.py` | ✅ Reads DB voice in list endpoint |
| `voice.py` | ✅ Live Kokoro voice fetch with fallback |
| `TTSConfigCard.tsx` | ✅ Label map extended for all 17 locales |
| Changes committed | ❌ **Not committed** — 5 modified files pending |

---

## 4. Frontend (35 Pages)

| Route | Status |
|---|---|
| `/` | ✅ Landing "7 Perspectives" — cleaned up (single Mockup 7, no selector) |
| `/operations` | ✅ Operations Hub |
| `/search` | ✅ Intelligence/Search Hub (split pane + scratchpad) |
| `/sources` | ✅ Sources management |
| `/media` | ✅ Creative workspace + Social Builder |
| `/settings/*` | ✅ 8 settings pages |
| `/pipeline` | ✅ CRM deals |
| `/customer-ledger` | ✅ Customer ledger |
| `/customers` | ✅ Customer directory |
| `/contacts` | ✅ Contact directory |
| `/notebooks` | ✅ Research workspace |
| `/notebooks/[id]` | ✅ Notebook detail |
| `/notebooks/test-canvas` | ✅ React Flow canvas (compliance OT) |
| `/compliance` | ✅ CISA/CFATS compliance |
| `/research-memory` | ✅ pgvector stats |
| `/projects` | ✅ Projects / Kanban |
| `/publications` | ✅ Social post tracker |
| `/podcasts` | ✅ Podcast manager |
| `/voice-playground` | ✅ WebRTC voice sandbox |
| `/transformations` | ✅ NLP transforms |
| `/documentation` | ✅ Wiki |
| `/advanced` | ✅ Advanced / Backup-Restore |
| `/mockups` | ✅ Redirects to `/` |
| `/research` | ✅ Redirects to `/operations?tab=research` |
| `/customers/[id]` | ✅ Customer detail |
| `/customers/[id]/bento` | ✅ Customer bento dossier |

> Total: **26 unique route destinations** (35 `page.tsx` files including nested settings)

---

## 5. Test Suite State

| Category | Count |
|---|---|
| **Passing** | **436** |
| **Failing** | **53** |
| Collection errors (Playwright) | **3 files** blocked |

### Failing Test Groups (Root Cause Analysis)

| Test Group | Failures | Root Cause |
|---|---|---|
| `test_phase3_compliance.py` | 2 | DB connection required (no live DB in CI) |
| `test_pipeline_crm.py` | 3 | `OSError: Multiple exceptions` — DB not reachable, 500 responses |
| `test_pipeline_preconditions.py` | 2 | DB-dependent stage transition constraints |
| `test_pipeline_types.py` | 2 | `OSError: Multiple exceptions` — migration test needs DB |
| `test_podcast_concurrency.py` | 3 | Async routing/placeholder endpoint issues |
| `test_podcast_migration.py` | 1 | Migration repair needs live SurrealDB |
| `test_publications.py` | 3 | Migration 35 + CRUD all return 500 |
| `test_publications_publishing.py` | 1 | Publishing sandbox requires live DB |
| `test_publications_tracker.py` | 1 | Metrics tracking needs DB |
| `test_search_compare.py` | 1 | Search comparison endpoint issue |
| `test_sources_api.py` | 3 | Asset persistence requires live DB/storage |
| `test_voice_ai.py` | 2 | Custom voice upload (local/ElevenLabs) |
| `test_voice_ai_stage2.py` | 4 | Multi-engine voice settings — **may be related to TTS fix** |

**Common root cause**: Most test failures are due to integration tests requiring a live SurrealDB instance but running in unit test mode. These are **not production bugs** — they represent a test infrastructure gap (no test database setup).

**Exception**: `test_voice_ai_stage2.py` (4 failures) — these test the multi-engine voice settings API and may be affected by the recent TTS changes to `voice_sessions.py`/`voice_tools.py`.

### Broken Collection (Playwright)

```
tests/test_bento_enhancements.py  — Missing playwright dependency
tests/test_bento_mockup.py        — Missing playwright dependency
tests/test_loom_mockup.py         — Missing playwright dependency
```
These files import `from playwright.sync_api import sync_playwright` but `playwright` is not installed in `.venv`. These files need either `pip install pytest-playwright` or removal from the test suite.

---

## 6. Database (SurrealDB)

| Item | State |
|---|---|
| Migration count | 49 (up to `49.surrealql`) |
| Latest migration | `49.surrealql` — backup/backup_schedule tables |
| Migration registration | All 1–49 registered in `async_migrate.py` |
| Live status | ✅ Running on port 8000 |

---

## 7. Search Architecture

| Component | State |
|---|---|
| pgvector (PostgreSQL) | ✅ Running on port 5433 |
| Hybrid RRF search | ✅ Implemented |
| Research memory | ✅ pgvector index |
| Valyu integration | ✅ Implemented |
| Brave integration | ✅ Implemented |
| Perplexity integration | ✅ Implemented |
| Reranker toggle (search page) | ❓ **Status unknown** — documented as needed |

---

## 8. Podcast System

| Item | State |
|---|---|
| SpeakerProfile | ✅ DB-driven voice_id per speaker |
| EpisodeProfile | ✅ outline_llm/transcript_llm model references |
| Kokoro TTS integration | ✅ OpenAI-compatible API |
| Episode migration | ✅ `migrate_podcast_profiles()` on startup |
| Podcast TTS hardcode bug | ✅ **Not affected** (separate architecture from voice chat) |
| Target duration UI | ✅ Added in commit `505dc17` |

---

## 9. Git / Version Control

| Item | State |
|---|---|
| Working tree | 🔴 5 modified files not committed |
| Untracked files | 6 untracked files at root |
| Uncommitted work | TTS fix + landing page cleanup |
| Open Dependabot PRs | 2 (uv bump, npm bump) |
| Upstream sync | 67 commits ahead — no merge plan documented |
