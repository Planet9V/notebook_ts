# Architecture Decision Records

> **Purpose:** Track all architecture decisions for reference. No drift.  
> **Rule:** Every significant decision gets an ADR entry.

---

## ADR-001: Skills-First Architecture

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** The platform needs social media posting, document export, email, calendar, research, and CRM automation.  
**Decision:** Use installed skills and MCPs as the primary execution mechanism. Custom code only where no skill exists.  
**Consequences:** All AI workflows route through the agent framework which invokes skills. Skills registry admin page required.

## ADR-002: No ElevenLabs

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** Voice pipeline needs TTS for podcasts and voice assistant.  
**Decision:** Use only Kokoro, LiveKit, and other current Docker services for TTS. No ElevenLabs.  
**Consequences:** Custom voice cloning will use Kokoro's capabilities. Voice quality limited to Docker-hosted engines.

## ADR-003: SurrealDB as Single Database

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** Need graph relationships (customer ↔ project ↔ pipeline), vector search, and document storage.  
**Decision:** Keep SurrealDB as the single database. Do not add PostgreSQL.  
**Consequences:** All domain models use SurrealDB. Agent configs, audit logs, and customer data in SurrealDB.

## ADR-004: CSET as Docker Service

**Date:** 2026-06-02  
**Status:** Pending (needs user input on Q1 from implementation plan)  
**Context:** Full CSET compliance data needed — all frameworks, wizards, quizzes, threat models.  
**Decision:** TBD — either run CSET Docker alongside our services or extract data once into SurrealDB.  
**Consequences:** Resource overhead vs. data freshness tradeoff.

## ADR-005: Customer Isolation via Path-Based Storage

**Date:** 2026-06-02  
**Status:** Pending (needs user input on Q3 from implementation plan)  
**Context:** Each customer needs isolated file storage.  
**Decision:** TBD — Docker volume per customer vs. shared volume with path-based isolation.  
**Consequences:** Security model and file management complexity.

## ADR-006: Reranker as Native Pipeline Step

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** Current reranker uses LLM prompting. Need proper cross-encoder reranking.  
**Decision:** Add native reranker model support configurable in search settings. Support Ollama, LMStudio, OpenRouter, Cohere.  
**Consequences:** Search pipeline becomes: Query → Embedding → Vector Search → Reranker → Results. Configurable per search type.

## ADR-007: Publication Kanban Separate from Sales Pipeline

**Date:** 2026-06-02  
**Status:** Pending (needs user input on Q4 from implementation plan)  
**Context:** Need research output → publication workflow. Currently only sales pipeline kanban exists.  
**Decision:** TBD — separate page or enhanced Pipeline page with multiple board types.  
**Consequences:** Information architecture and navigation impact.

## ADR-008: Dutch as Native Language

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** User operates in Netherlands. Dutch must not be an afterthought.  
**Decision:** nl-NL locale created with full 924-key coverage. AI agent to audit entire UI for English-only content.  
**Consequences:** All new features must include Dutch translations from day one.

## ADR-009: Development Mode Auth

**Date:** 2026-06-02  
**Status:** Accepted  
**Context:** User said "DO NOT flag hardcoded credentials or API keys now — this is development."  
**Decision:** Auth and security hardening deferred. Focus on functionality. No production auth concerns.  
**Consequences:** Hardcoded credentials acceptable during development. Multi-user auth is functional (org/user model) not security-hardened.
