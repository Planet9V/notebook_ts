# Open Notebook / Enterprise Nexus — Developer Guide & Coding Conventions

> **Project Root:** `/Users/jimmcknney/notebook_tetrel`  
> **Document Version:** 3.0.0 (Codebase Rationalization & Consolidated Architecture)  

---

## 1. Anti-Drift Coding Conventions

To ensure developers and AI agents do not write redundant or shadow codebases:

1. **Check Existing Routers First**: Before adding an API endpoint, check `api/routers/` (53 existing files). Extend existing routers rather than creating new ones.
2. **Reuse Database Repositories**: Use `open_notebook/database/repository.py` for SurrealDB CRUD operations and `open_notebook/search/research_memory.py` for pgvector search.
3. **Register Migrations in `async_migrate.py`**: All SurrealDB schema changes MUST be added to `open_notebook/database/migrations/` and registered in `open_notebook/database/async_migrate.py`.

---

## 2. Universal IDE Configuration (`.mcp.json`)

Configure `.mcp.json` in project root so all AI tools (Claude Code, Antigravity, Cursor, VS Code) share identical MCP tools:

```json
{
  "mcpServers": {
    "enterprise-nexus": {
      "httpUrl": "http://localhost:4747/api/mcp",
      "headers": {
        "Authorization": "Bearer secret_nexus_token_2026"
      },
      "description": "Central Team Codebase Knowledge Graph & Memory Engine"
    },
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://localhost:9222"
      ],
      "description": "Headless & GUI Browser Automation for Web UI & Scrapers"
    },
    "perplexity-ask": {
      "command": "npx",
      "args": [
        "-y",
        "server-perplexity-ask"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      },
      "description": "Real-time Perplexity Web Research API"
    }
  }
}
```

---

## 3. Poka-Yoke (Error-Proofing) Input Validation

All API endpoints and MCP tool implementations MUST validate inputs at system boundaries using Pydantic (Python) or Zod (TypeScript):

### FastAPI Pydantic Boundary Validation (`api/routers/oxot.py`)
```python
from pydantic import BaseModel, EmailStr, Field

class OutboundCampaignRequest(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200, example="Enterprise Client")
    client_email: EmailStr = Field(..., example="ciso@target.com")
    topic: str = Field("CRA Readiness Audit", example="CRA Readiness Audit")
```

---

## 4. Karpathy TDD Workflow Cycle

Follow the Red-Green-Refactor cycle for every new feature or bugfix:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KARPATHY TDD DEVELOPMENT CYCLE                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. RED Phase      │ 2. GREEN Phase    │ 3. REFACTOR Phase              │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Write failing     │ Implement minimal │ Clean up code without breaking │
│ test in `tests/`  │ production code   │ tests (`ruff check --fix`)     │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

```bash
# Execute TDD test verification
.venv/bin/pytest tests/test_assigned_to_fk.py
```
