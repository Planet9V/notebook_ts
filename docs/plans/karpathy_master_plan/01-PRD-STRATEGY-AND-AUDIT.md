# Open Notebook / Enterprise Nexus — PRD, Audit & Anti-Drift Strategy

> **Project Root:** `/Users/jimmcknney/notebook_tetrel`  
> **Framework:** Karpathy First-Principles Software Engineering (P1–P8)  
> **Document Version:** 3.0.0 (Codebase Rationalization & Consolidated Architecture)  

---

## 1. Executive Summary & Codebase Context

This strategic plan establishes the roadmap for transforming the existing **Open Notebook (`notebook_tetrel`)** codebase into the **Enterprise Codebase Nexus & Autonomous AI Engine**.

Rather than creating divergent shadow codebases or reinventing solved abstractions, this plan enforces **codebase rationalization**: re-using and expanding the existing 53 FastAPI routers, SurrealDB 60-migration database, PostgreSQL pgvector hybrid search, and Next.js 16 frontend.

---

## 2. Karpathy Core Rules (P1–P8) — Mandatory Enforcement

All development tasks, AI agent behaviors, and code changes in this repository MUST comply with these 8 principles:

| Rule | Principle | Enforcement Mechanism |
| :--- | :--- | :--- |
| **P1** | **Simple, Readable Code**: No over-engineering. No premature abstractions. | Strict code review & AST linting |
| **P2** | **Skills & Packages First**: Check existing routers (`api/routers/`), domain modules (`open_notebook/domain/`), and MCP tools before writing custom code. | Pre-implementation skill check |
| **P3** | **Test-Driven Development (TDD)**: Write failing tests (`tests/`) before writing feature implementations. | `.venv/bin/pytest tests/` |
| **P4** | **Zero Faking**: Zero stubs, dummy fallbacks, or committed `TODO`/`FIXME` items. | `npx tsc --noEmit` & CI gate |
| **P5** | **Full Observability**: All parameters adjustable in UI/admin runtime (`api/routers/settings.py`). | Runtime verification |
| **P6** | **Full Traceability**: Every state mutation audit-logged and versioned. | SurrealDB audit logs & `async_migrate.py` |
| **P7** | **No Architectural Drift**: Reference this plan and update documentation atomically with code edits. | Git pre-commit hooks |
| **P8** | **Docker Portability**: `docker compose up -d` is the single command for full stack startup. | Container health checks |

---

## 3. Current Codebase Audit & Baseline Analysis

### A. Current Capability State (80% Built)
1. **Backend Infrastructure (`api/routers/`)**: 53 registered FastAPI router files covering:
   - **Research & Knowledge**: `search.py`, `research_memory.py`, `sources.py`, `notes.py`, `notebooks.py`, `market_analysis.py`.
   - **CRM & Pipeline**: `customers.py`, `contacts.py`, `organizations.py`, `pipeline.py`, `projects.py`, `tasks.py`, `campaigns.py`.
   - **Voice AI & Speech**: `voice.py`, `voice_tools.py`, `voice_sessions.py`, `podcasts.py`, `episode_profiles.py`.
   - **Integrations & Platform**: `credentials.py` (encrypted store), `models.py`, `skills.py`, `oxot.py`, `publications.py`.
2. **Database Engine**:
   - **SurrealDB v2**: 60 schema migrations registered in `open_notebook/database/async_migrate.py`.
   - **PostgreSQL 17 + pgvector**: Hybrid Reciprocal Rank Fusion (RRF) search in `open_notebook/search/research_memory.py`.
3. **Frontend Application (`frontend/`)**:
   - Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS + shadcn/ui.
   - **Type Safety Status**: `npx tsc --noEmit` passes with **0 errors**.

### B. Anti-Drift & Component Rationalization Matrix

To prevent duplicated or shadow codebases, all new features MUST reuse existing foundation files:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   SHARED COMPONENT RATIONALIZATION MATRIX                │
├───────────────────────┬────────────────────────┬─────────────────────────┤
│ Target Feature        │ DO NOT CREATE          │ REUSE & EXTEND EXISTING │
├───────────────────────┼────────────────────────┼─────────────────────────┤
│ Outbound Outreach     │ Shadow CRM services    │ api/routers/contacts.py │
│                       │                        │ api/routers/oxot.py     │
├───────────────────────┼────────────────────────┼─────────────────────────┤
│ Knowledge Search      │ Custom vector scripts  │ open_notebook/search/   │
│                       │                        │ research_memory.py      │
├───────────────────────┼────────────────────────┼─────────────────────────┤
│ Database Schemas      │ Inline SQL scripts     │ open_notebook/database/ │
│                       │                        │ async_migrate.py        │
├───────────────────────┼────────────────────────┼─────────────────────────┤
│ Voice & Audio Engine  │ Ad-hoc TTS scripts     │ open_notebook/podcasts/ │
│                       │                        │ api/routers/voice.py    │
└───────────────────────┴────────────────────────┴─────────────────────────┘
```

---

## 4. Citations & Core References

1. **Graphify AST Knowledge Graph**: `10,225 nodes · 13,722 links` indexed across `/Users/jimmcknney/notebook_tetrel`.
2. **SurrealDB Migrations**: 60 SurrealQL migration scripts in `open_notebook/database/migrations/`.
3. **Model Context Protocol (MCP) Specification**: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
