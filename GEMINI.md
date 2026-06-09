# Open Notebook — Antigravity / Gemini Configuration

> **This file mirrors CLAUDE.md** — both Gemini and Claude models share the same
> claude-flow daemon, graphify knowledge graph, memory store, and skills. If you
> are reading this, every tool and workflow below works identically regardless of
> which LLM model (Gemini Flash, Claude Opus, Claude Sonnet) is running.

## Mandatory Skill-First Execution Rule

> [!IMPORTANT]
> You MUST invoke the `/using-superpowers` skill at the beginning of all prompts.
> If there is even a 1% chance a skill applies, you MUST load and follow its instructions BEFORE making any code edits, running commands, or asking clarifying questions.

## Karpathy Rules (P1–P8) — ALWAYS ENFORCED

All code changes must satisfy these principles (see [docs/development-rules.md](docs/development-rules.md)):

| Rule | Principle | Enforcement |
|------|-----------|-------------|
| **P1** | Simple, readable code. No over-engineering. No premature abstractions. | Code review |
| **P2** | Skills-first. Check installed skills/MCPs/packages before custom code. | Pre-implementation check |
| **P3** | Test-driven development. No production code without a failing test first. | `.venv/bin/pytest` |
| **P4** | No faking. Zero stubs, fillers, placeholders. No TODO/FIXME in committed code. | CI gate |
| **P5** | Full observability. Every config adjustable in admin UI, changes immediate. | Runtime verification |
| **P6** | Full traceability. Every mutation audit-logged. Every document versioned. | SurrealDB audit log |
| **P7** | No drift. Reference current plan/spec/PRD. Update docs atomically with code. | Pre-commit hook |
| **P8** | Docker portable. `docker compose up` is the single command. | `make dev` |

## Critical Skills — CHECK BEFORE EVERY TASK

Skills live in `~/.gemini/config/skills/`. If there is even a 1% chance a skill applies, you MUST use it.

| Skill | When to Use |
|-------|-------------|
| `/using-superpowers` | **Every prompt** — establishes skill-first workflow |
| `/backend-architect` | Any API, database, or backend changes |
| `/data-engineer` | pgvector, search, embeddings, data pipeline work |
| `/test-driven-development` | Every feature implementation (Karpathy P3) |
| `/docker-expert` | Container, docker-compose, deployment changes |
| `/agent-orchestration-multi-agent-optimize` | When spawning multiple agents |
| `/avoid-ai-writing` | All documentation and user-facing copy |
| Chrome DevTools MCP | All UI changes — test visually before committing |
| `/ui-ux-pro-max` | Frontend design, layout, UX patterns |
| `/teamwork-preview` | Large projects needing multi-agent teams |

## Claude-Flow (RuFlo V3) — SHARED INFRASTRUCTURE

Claude-flow runs as a daemon process in `.claude-flow/`. It is model-agnostic — all commands work from any LLM via Bash.

### Memory (ruflo CLI)

```bash
# BEFORE any task — search for relevant context
npx -y ruflo@latest memory search --query "[task keywords]" --namespace stack-knowledge
npx -y ruflo@latest memory search --query "[task keywords]" --namespace decision-log
npx -y ruflo@latest memory search --query "[task keywords]" --namespace patterns

# AFTER success — store what worked
npx -y ruflo@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx -y ruflo@latest memory store --namespace decision-log --key "[date]_[topic]" --value "Q: ... A: ..."

# List all memories
npx -y ruflo@latest memory list
```

### Daemon Workers

```bash
npx -y ruflo@latest daemon status         # Check worker status
npx -y ruflo@latest daemon trigger --worker [name]  # Trigger a worker
npx -y ruflo@latest doctor --fix          # Run diagnostics
```

Workers: map, audit, optimize, consolidate, testgaps, predict, document.

### Intelligence Engine

The intelligence engine builds a PageRank graph from memory entries and provides
context-ranked pattern matching. It is initialized on session start via the hook
chain in `.claude/helpers/hook-handler.cjs`.

To manually trigger:
```bash
node .claude/helpers/hook-handler.cjs session-restore
```

Data files (auto-populated on session start):
- `.claude-flow/data/auto-memory-store.json` — bridged from ruflo SQLite
- `.claude-flow/data/graph-state.json` — PageRank graph
- `.claude-flow/data/ranked-context.json` — ranked patterns for prompt matching

## Graphify — Codebase Knowledge Graph

10,225 nodes · 13,722 links · 1,000 files indexed. Zero API cost (local AST parsing).

**Link types**: contains (7,411), calls (1,682), imports (1,370), rationale_for (1,257), imports_from (724), uses (536), method (423), inherits (311).

```bash
# BFS query — finds related nodes by label matching
graphify query "<question>" --budget 3000

# Path between two nodes — traces dependency chains
graphify path "generate_podcast()" "hybrid_rrf_search()"

# Explain a node — shows all connections and metadata
graphify explain "async_migrate.py"

# Update after code changes (no LLM cost, ~2-5s)
graphify update .
```

**⚠️ Node labels are file/function names, NOT community names.** Use `async_migrate.py` not `Database Migration Engine`. Use `PodcastsPage()` not `Podcast Service`.

## Behavioral Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/tests`, `/docs`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries

## Project Architecture

- **Backend**: Python 3.12 + FastAPI + Pydantic v2 + LangChain/LangGraph
- **Database**: SurrealDB v2 (schema-full, 46+ migrations in `open_notebook/database/migrations/`)
- **Vector Search**: PostgreSQL pg17 + pgvector (hybrid RRF search)
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Voice AI**: LiveKit + Kokoro TTS + Whisper STT + WebRTC
- **Containerization**: Docker Compose (6 services)

### Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `surrealdb` | surrealdb/surrealdb:v2 | 8000 | Main DB (RocksDB, GraphQL experimental) |
| `postgres` | pgvector/pgvector:pg17 | 5433 | Vector search (pgvector + RRF) |
| `open_notebook` | local build | 8502, 5055 | Web UI + REST API |
| `livekit-server` | livekit/livekit-server | 7880, 7881 | WebRTC SFU for voice |
| `kokoro-tts` | kokoro-fastapi-cpu | 8880 | Text-to-speech |
| `whisper-stt` | faster-whisper-server | 8881 | Speech-to-text |

### API Structure (49 Routers)

All FastAPI routers in `api/routers/`. Key groups:
- **CRM**: customers, contacts, organizations, pipeline, projects
- **Research**: sources, notes, notebooks, research_items, research_memory, search, scheduled_search
- **AI/ML**: models, embedding, embedding_rebuild, transformations, insights, mcp
- **Voice**: voice, voice_rag, voice_sessions, voice_tools, speaker_profiles
- **Podcasts**: podcasts, episode_profiles
- **Content**: publications, styleguides, languages, regulations
- **System**: auth, config, settings, platform, containers, system_logs, credentials

### Search Architecture (pgvector + Hybrid RRF)

Two search paths combined via Reciprocal Rank Fusion:
1. **SurrealDB vector search** — embeddings stored with documents
2. **pgvector (PostgreSQL)** — research_memory with hybrid search

External integrations: Valyu, Perplexity, Brave. Reranker applied after fusion.

### Podcast Generation Pipeline

```
Sources → LangGraph chain → Episode script → episode_profiles →
kokoro-tts (per segment) → whisper-stt (verify) → concatenate → MP3
```

Key files: `open_notebook/podcasts/`, `api/routers/podcasts.py`, `api/routers/episode_profiles.py`

### Voice AI

LiveKit WebRTC + LangChain tools. Voice tools: search, summary, query_social.
Key files: `api/routers/voice*.py`, `tests/test_voice_copilot_tools.py` (11 tests passing)

## Build & Test

```bash
# Backend tests (ALWAYS use .venv)
.venv/bin/pytest tests/

# Frontend type check (MUST pass before commit — Karpathy P3/P4)
cd frontend && npx tsc --noEmit

# Full Docker build
docker compose up -d --build open_notebook

# Local dev (all services)
make start-all

# API only
uv run --env-file .env run_api.py

# Frontend dev
cd frontend && npm run dev

# Lint
ruff check . --fix
```

- ALWAYS run tests after making code changes
- ALWAYS verify `npx tsc --noEmit` exits 0 before committing
- ALWAYS verify Docker build succeeds for infrastructure changes
- ALWAYS run `graphify update .` after architectural changes

## Database Migrations

SurrealDB migrations live in `open_notebook/database/migrations/`. Each migration has an up file (`NN.surrealql`) and down file (`NN_down.surrealql`). Register new migrations in `open_notebook/database/async_migrate.py`.

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid (HNSW + MemoryGraph + AgentScopes)
- **Neural**: Enabled
- **Daemon**: Auto-start enabled

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Flash | Simple tasks, low complexity (Gemini 3.5 Flash) |
| 3 | Pro/Thinking | Architecture, security, complex reasoning (Gemini 3.5 Pro/Thinking) |

## Memory & Learning

### Before Any Task
```bash
npx -y ruflo@latest memory search --query "[task keywords]" --namespace stack-knowledge
npx -y ruflo@latest memory search --query "[task keywords]" --namespace patterns
graphify query "[relevant question]" --budget 2000
```

### After Success
```bash
npx -y ruflo@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
graphify save-result --question "[question]" --answer "[what worked]" --type query
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## CLI Quick Reference

```bash
npx -y ruflo@latest init --wizard            # Setup
npx -y ruflo@latest swarm init --v3-mode     # Start swarm
npx -y ruflo@latest memory search --query "" # Vector search
npx -y ruflo@latest memory list              # List all memories
npx -y ruflo@latest hooks route --task ""    # Route to agent
npx -y ruflo@latest doctor --fix             # Diagnostics
npx -y ruflo@latest security scan            # Security scan
npx -y ruflo@latest daemon start             # Start daemon
npx -y ruflo@latest daemon status            # Check daemon
graphify query "<question>" --budget 3000    # Knowledge graph query
graphify path "<NodeA>" "<NodeB>"            # Dependency trace
graphify update .                            # Refresh graph
```

## Setup

```bash
# Add ruflo to your MCP configuration (handled automatically in global configs or via CLI)
npx -y ruflo@latest daemon start
npx -y ruflo@latest doctor --fix
graphify update .
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash. **Graphify** provides structural codebase intelligence.
