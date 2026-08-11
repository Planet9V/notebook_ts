# Open Notebook / Enterprise Nexus — System Architecture & Component Mapping

> **Project Root:** `/Users/jimmcknney/notebook_tetrel`  
> **Document Version:** 3.0.0 (Codebase Rationalization & Consolidated Architecture)  

---

## 1. Consolidated C4 Architecture Diagram

The system integrates our existing FastAPI application, SurrealDB, PostgreSQL pgvector, Voice AI containers, and MCP Gateways:

```mermaid
flowchart TD
    subgraph Client & Developer Layer
        WebUI["Next.js 16 App Router UI\n(frontend/src/app)"]
        AI1["Claude Code CLI"]
        AI2["Antigravity / Gemini IDE"]
        AI3["Cursor / VS Code"]
    end

    subgraph FastAPI Application Core (api/main.py)
        RouterLayer["53 Registered Routers\n(api/routers/*.py)"]
        DomainCore["Domain Models & Workers\n(open_notebook/domain/*.py)"]
        SearchEngine["Memory-First Hybrid RRF Search\n(open_notebook/search/research_memory.py)"]
    end

    subgraph Data & Persistence Tier
        Surreal["SurrealDB v2 (Port 8000)\n(open_notebook/database/migrations/)"]
        Postgres["PostgreSQL 17 + pgvector (Port 5434)\n(tetrel_research DB)"]
        Neo4j["Neo4j 2026 Graph DB (Port 7474/7687)\n(APOC Graph Traversals)"]
        GraphifyGraph["Graphify Central Global Graph\n(10,225 Nodes / 13,722 Links)"]
    end

    subgraph Voice AI Subsystem
        LiveKit["LiveKit WebRTC SFU (Port 7880/7881)"]
        Kokoro["Kokoro TTS FastAPI (Port 8880)"]
        Whisper["Faster-Whisper STT (Port 8881 -> 8000)"]
    end

    subgraph Integration & MCP Gateways
        NexusMCP["GitNexus HTTP MCP Gateway (Port 4747)"]
        ChromeMCP["Chrome DevTools MCP (Port 9222)"]
        Context7["Context7 Live API Indexer"]
    end

    WebUI & AI1 & AI2 & AI3 -->|REST / WS / MCP| RouterLayer & NexusMCP
    RouterLayer --> DomainCore & SearchEngine
    DomainCore --> Surreal & Postgres & Neo4j
    SearchEngine --> Postgres
    RouterLayer --> LiveKit & Kokoro & Whisper
    NexusMCP <--> GraphifyGraph & Context7 & ChromeMCP
```

---

## 2. API Router Map (`api/routers/`)

The application routes requests through 53 modular router files:

| Subsystem | Key Router Files | Foundation Purpose |
| :--- | :--- | :--- |
| **Research & Knowledge** | `search.py`, `sources.py`, `notes.py`, `notebooks.py`, `research_memory.py`, `scheduled_search.py`, `market_analysis.py` | Full-text search, pgvector hybrid RRF queries, web source ingestion, market analysis |
| **CRM & Pipeline** | `customers.py`, `contacts.py`, `organizations.py`, `pipeline.py`, `projects.py`, `tasks.py`, `campaigns.py` | Enterprise customer management, sales pipeline, project tasks, campaign workflows |
| **Voice AI & Podcasts** | `voice.py`, `voice_tools.py`, `voice_sessions.py`, `podcasts.py`, `episode_profiles.py`, `speaker_profiles.py` | WebRTC voice sessions, TTS segment generation, whisper validation, MP3 mastering |
| **AI Models & Skills** | `models.py`, `skills.py`, `transformations.py`, `insights.py`, `oxot.py`, `publications.py` | LLM model registry, dynamic skill execution, document transformations, content publishing |
| **System & Credentials** | `auth.py`, `credentials.py`, `config.py`, `settings.py`, `backup.py`, `system_logs.py` | AES encrypted credential vault (`OPEN_NOTEBOOK_ENCRYPTION_KEY`), auth, backup/restore |

---

## 3. Database & Memory Integration

1. **SurrealDB v2 (`surrealdb`)**:
   - Connection URL: `ws://localhost:8000/rpc`
   - Migrations: 60 schemaQL scripts managed via `open_notebook/database/async_migrate.py`.
2. **PostgreSQL 17 + pgvector (`postgres`)**:
   - DSN: `postgresql://tetrel:tetrel_dev@localhost:5434/tetrel_research`
   - Stores `research_memory` vector embeddings and hybrid reciprocal rank fusion indices.
3. **Neo4j 2026 Graph DB (`neo4j`)**:
   - Connections: `http://localhost:7474` / `bolt://localhost:7687`
   - Executes APOC graph traversals for entity topology mapping.

---

## 4. OAuth-Bypass MCP Architecture

To avoid OAuth redirect failures and bot detection in web apps:
- **Chrome DevTools MCP**: Connects to Chrome debugging port `9222` with persistent user profiles (`~/.config/google-chrome/`).
- **Encrypted Credential Vault**: `api/routers/credentials.py` securely stores API tokens, OAuth refresh tokens, and keys encrypted with `OPEN_NOTEBOOK_ENCRYPTION_KEY`.
