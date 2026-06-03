# Taskmaster — Activity A, B, and C Execution Tracker

This tracker acts as our living execution checklist to ensure flawless implementation. We mark progress as `[ ]` (pending), `[/]` (in progress), or `[x]` (completed and verified).

---

## 📋 Checklist

### 1. Dutch i18n Auditing and Ingestion (Task A)
- [x] **A1: Extract all hardcoded strings** from `ComparisonMatrix.tsx` and `MaturityWizard.tsx`.
- [x] **A2: Register en-US compliance locales** under `compliance` namespace inside `frontend/src/lib/locales/en-US/index.ts`.
- [x] **A3: Register nl-NL compliance locales** under `compliance` namespace inside `frontend/src/lib/locales/nl-NL/index.ts`.
- [x] **A4: Translate `ComparisonMatrix.tsx`** (import `useTranslation`, apply `t` hook).
- [x] **A5: Translate `MaturityWizard.tsx`** (import `useTranslation`, apply `t` hook).
- [x] **A6: Run local frontend validation** (`npx tsc --noEmit`) to verify perfect type safety and no missing translation paths.

### 2. Architecture Document Revamp (Task B)
- [x] **B1: Plan architecture additions** for autonomous agent registry, SurrealDB schema designs, skill registry systems, and folder architectures.
- [x] **B2: Revise `docs/7-DEVELOPMENT/architecture.md`** to formally insert high-fidelity sections detailing Layer 1 (Autonomous Agent Framework), Layer 2 (Skills & MCP toolsets), and Phase 2 (Multi-Tenant Org folder structures).
- [x] **B3: Perform syntax and link audits** on the modified Markdown file to verify clean structure.

### 3. Reranker Settings Toggle Addition (Task C)
- [x] **C1: Audit default model hook usage** in `DefaultModelSelectors.tsx`.
- [x] **C2: Formulate settings toggle field** (boolean or drop-down selection) in the Advanced section of `DefaultModelSelectors.tsx`.
- [x] **C3: Implement toggle control component** with full tooltips and explanations of what it manages in the search reranking pipeline.
- [x] **C4: Run frontend validation** (`npx tsc --noEmit`) to confirm perfect compile-time safety.

### 4. Next Phase: Layer 1 Autonomous Agent Framework Setup (Layer 1)
- [x] **L1: Create SQL Migrations** (`27.surrealql` and `27_down.surrealql`) defining agent schema tables.
- [x] **L2: Formulate Pydantic Schemas** (`agent_schemas.py` / `api/models.py`) for type-safe validation.
- [x] **L3: Implement REST Endpoints** (`api/routers/agents.py`) and register inside main FastAPI stack.
- [x] **L4: Create Frontend TS Types & API Connectors** (`src/lib/types/agents.ts`, `src/lib/api/agents.ts` and `src/lib/hooks/use-agents.ts`).

### 5. Next Phase: Layer 2 Skills & MCP Registry (Layer 2)
- [x] **S0: Create SQL Migrations** (`28.surrealql` and `28_down.surrealql`) defining skills registry schema table.
- [x] **S1: Implement Backend Skills Discovery & CRUD** (`open_notebook/domain/skill.py` & `api/routers/skills.py`) and sync directories dynamically.
- [x] **S2: Implement Backend MCP Status Router** (`api/routers/mcp.py`) parsing JSON tool schemas dynamically.
- [x] **S3: Register API Routers** inside main FastAPI stack (`api/main.py`).
- [x] **S4: Create Frontend TS Types & API Connectors** (`src/lib/types/skills.ts` and `src/lib/api/skills.ts`).
- [x] **S5: Create Frontend TanStack Query Hooks** (`src/lib/hooks/use-skills.ts`).
- [x] **S6: Create Pytest Integration Test Suite** (`tests/test_skills_api.py`) verifying CRUD logic.

### 6. Phase 1: CSET Full Integration (Phase 1)
- [/] **P1.1: Spin up CSET Container Service** in Docker Compose and verify container health.
- [ ] **P1.2: Implement programmatical UI auditor** (`scratch/cset_scraper.py`) using Playwright to document CSET fields and schemas.
- [ ] **P1.3: Run CSET Seed Parser** (`scratch/cset_parser.py`) to ingest all 66 markdown blueprints' compliance data into SurrealDB.
- [ ] **P1.4: Ingest OT device SVGs** and configure Next.js routing assets.
- [ ] **P1.5: Write NetworkX backend topological validation tests** (`tests/test_graph_validation.py`).
- [ ] **P1.6: Implement FastAPI graph validation router** (`POST /api/graph/validate`) using NetworkX to identify Purdue zone violations and unmediated threat paths.
- [ ] **P1.7: Build React Flow Drawing Canvas Component** with horizontal swimlanes, drag-and-drop toolbox, Manhattan 90-degree edges, and pulsating red warnings.
- [ ] **P1.8: Connect Real-Time Validation Loop** to automatically answer matching compliance questions on canvas topological validation pass.

---

## 🧪 Verification Log

| Task | Validation Command / Method | Status | Details |
|---|---|---|---|
| A1-A5 (Compliance i18n) | `npx tsc --noEmit` in `/frontend` | Passed | Zero errors, perfect type safety, fully localized |
| Locales Parity & Unused Keys | `npx vitest run src/lib/locales/index.test.ts` | Passed | All 12/12 locale parity and unused key tests passed perfectly |
| B1-B3 (Architecture Docs) | GFM linting & file link checks | Passed | Tables added, diagrams complete, fully integrated |
| C1-C4 (Reranker Toggle) | `npx tsc --noEmit` in `/frontend` | Passed | High-fidelity UI toggle complete, localStorage binding verified |
| L1-L4 (Layer 1 Agents Setup) | `python3 -m py_compile` & `npx tsc --noEmit` & `vitest` | Passed | Type-safe backend + domain + routers + frontend bindings compiles and tests 100% clean |
| S0-S6 (Layer 2 Skills Setup) | `pytest` & `tsc --noEmit` & `vitest` & db check | Passed | 5/5 pytest suite green, 100% TS compiling, SurrealDB schema version 28 successfully migrated on boot |



