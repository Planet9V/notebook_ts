# Multi-Agent Collaboration Framework

*Last Updated: June 8, 2026*

---

## 1. Multi-Agent Framework Core Roles

Tetrel Notebook incorporates an autonomous, team-based agent architecture to execute background tasks, research topics, verify compliance, and run system health checks. This framework is inspired by **teamwork-preview** and isolates responsibilities across four specialized agent roles:

```
            ┌─────────────────────────────────────────┐
            │           Orchestrator Agent            │
            │  Coordinates schedules, splits tasks    │
            └────────────────────┬────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Explorer Agent  │     │  Worker Agent   │     │ Reviewer Agent  │
│ Scans codebase, │     │ Writes logic,   │     │ Audits code,    │
│ checks schemas  │     │ runs migrations │     │ checks visual   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Auditor Agent  │
                        │ Runs test suites│
                        │ verifies output │
                        └─────────────────┘
```

1.  **Explorer Agent:** Performs pre-task discovery. It audits directories, parses database schemas (SurrealQL & PostgreSQL SQL), scans codebase configs, and identifies structural gaps.
2.  **Worker Agent:** The builder. It writes backend Python logic, compiles TypeScript/Next.js frontend assets, executes database migrations, and updates configuration files.
3.  **Reviewer Agent:** The lint/visual gatekeeper. It audits the Worker's changes, verifies that components conform to style standards (such as desaturated colors and clear typography), and runs compile-time checks (`npx tsc --noEmit`).
4.  **Auditor (Victory Auditor) Agent:** The independent validator. It runs Python pytest integration suites, verifies API responses (e.g. curling endpoints), and reviews execution logs to confirm success.

---

## 2. Collaboration Protocol & State-Machine Workflow

The agents coordinate sequentially using a handoff-driven state machine. The execution workflow is strictly phased to prevent configuration drift:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Phase 1:   │     │  Phase 2:   │     │  Phase 3:   │     │  Phase 4:   │
│ Discovery   ├────►│ Development ├────►│ Review Gate ├────►│ Validation  │
│ (Explorer)  │     │  (Worker)   │     │ (Reviewer)  │     │  (Auditor)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

*   **Step 1: Context Initialization:** The Orchestrator creates a task record in SurrealDB and sets up a clean workspace folder.
*   **Step 2: Handoff to Explorer:** The Explorer scans the current state and writes findings to a markdown file (e.g. `findings.md`).
*   **Step 3: Handoff to Worker:** The Worker references `findings.md`, writes code changes, and updates database migration scripts.
*   **Step 4: Review Gate:** The Reviewer verifies code quality, checks for linting errors, and ensures visual consistency.
*   **Step 5: Validation Gate:** The Auditor runs verification scripts. If any test fails, the state machine rolls back and alerts the Orchestrator with the logs.

---

## 3. Objective Verification & Acceptance Criteria

Every task executed by the agent framework must include **objective verification mechanisms** to prevent self-certification of half-baked work:

### Programmatic Verification
*   **Backend Code:** Verified by executing `pytest` on target test files.
*   **Frontend Code:** Verified by running `npx tsc --noEmit` and matching component specs in Playwright tests.
*   **Database Migrations:** Verified by spinning up a local test instance of SurrealDB/Postgres, running migration scripts, and checking schemas.

### Example Project Prompt Template

When delegating a task to the multi-agent team, the Orchestrator generates a structured markdown prompt in [prompt_draft.md](file:///Users/jimmcknney/notebook_tetrel/docs/plans/prompt_draft.md):

```markdown
# Teamwork Project Prompt — Draft

> Status: Ready for launch
> Goal: Implement valyu search routing and pgvector cache

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements
### R1. Unified Valyu Search
Route search queries dynamically to Valyu API or fallback to Brave search.

### R2. pgvector cache
Store query-result tuples in PostgreSQL (port 5433) with HNSW cosine similarity matching.

## Acceptance Criteria
- [ ] Pytest integration suite passes for search routing.
- [ ] Playwright E2E tests verify "/research-memory" stats render successfully.
- [ ] No compilation errors when executing `npx tsc --noEmit`.
```
This structured approach guarantees that the agent team has clear requirements, is bound by objective criteria, and cannot prematurely declare success.
