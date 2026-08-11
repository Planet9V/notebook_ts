# Project: Gemini Deep Research Emulation

## Architecture
- **Domain Tier**: `open_notebook/domain/research_item.py` contains the `ResearchItem` model representing a research task.
- **API Tier**: `api/routers/research_items.py` exposes CRUD endpoints and execution actions. `api/routers/search.py` performs search execution and LLM-based query synthesis.
- **Frontend Tier**: React Next.js application under `frontend/` featuring Kanban stage visualization and configuration dialogs.
- **Data Flow**:
  1. Frontend submits a research request with `is_deep_research=True` and multiple `engines`.
  2. Backend creates `ResearchItem` with fields stored in SurrealDB.
  3. Execution triggers background worker `background_run_research`.
  4. Worker runs the 5-step Deep Research emulation: Clarifying -> Planning -> Gathering -> Synthesizing -> Reporting.
  5. During execution, status transitions are logged to `deep_research_state` and appended to `deep_research_events`. Activity log events are emitted.
  6. Frontend polls the research item status and updates UI Kanban cards with the active stage.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Schema & Models Update | Add `is_deep_research`, `deep_research_state`, `deep_research_events` to Domain Models and API Schemas. | None | DONE |
| 2 | Backend Emulation Engine | Implement 5-step Deep Research emulation, multi-engine inter-weaving, SurrealDB event logging, error/timeout handling. | M1 | DONE |
| 3 | E2E and Unit Test Suite | Complete robust unit and integration testing inside `tests/test_deep_research.py`. | M2 | DONE |
| 4 | Frontend UI Integration | Implement Deep Research toggle, tooltip, Stage Progress indicator on Kanban card, and markdown/citations rendering. | M2 | DONE |

## Interface Contracts
### `ResearchItem` Schema Update
- Pydantic models in `api/models.py` and domain class in `open_notebook/domain/research_item.py`:
  - `is_deep_research`: `Optional[bool] = False`
  - `deep_research_state`: `Optional[str] = ""`
  - `deep_research_events`: `Optional[List[Dict[str, Any]]] = []`

### Deep Research States
- Emulated stages must transition through:
  1. `clarifying`
  2. `planning`
  3. `gathering`
  4. `synthesizing`
  5. `reporting`
- Transitions stored on `ResearchItem` record in SurrealDB to enable polling.

## Code Layout
- `/open_notebook/domain/research_item.py` - Domain model
- `/api/models.py` - Pydantic DTO definitions
- `/api/routers/research_items.py` - API routing and background executor
- `/api/routers/search.py` - Search streaming logic and engine clients
- `/frontend/src/app/(dashboard)/research/page.tsx` - Frontend UI dialogs and Kanban board
