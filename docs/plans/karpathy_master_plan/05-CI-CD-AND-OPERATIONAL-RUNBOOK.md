# Open Notebook / Enterprise Nexus — CI/CD & Operational Runbook

> **Project Root:** `/Users/jimmcknney/notebook_tetrel`  
> **Document Version:** 3.0.0 (Codebase Rationalization & Consolidated Architecture)  

---

## 1. Automated CI/CD Pipeline (`.github/workflows/nexus-sync.yml`)

The CI/CD pipeline enforces Karpathy P3/P4 code quality checks before allowing code merges and graph updates:

```yaml
name: Enterprise Nexus CI/CD & Karpathy Guardrails

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    types: [ opened, synchronize, closed ]

jobs:
  validate-and-sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # ─── Karpathy Guardrail 1: Run Pytest Suite (P3) ───────────────────────
      - name: Run Backend Pytest Suite
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install -r pyproject.toml pytest
          pytest tests/ -m "not integration and not docker"

      # ─── Karpathy Guardrail 2: Type-Safety Check (P4) ──────────────────────
      - name: Frontend TypeScript Typecheck
        run: |
          cd frontend
          npm ci
          npx tsc --noEmit

      # ─── Karpathy Guardrail 3: Update Central Knowledge Graph (P7) ──────────
      - name: Extract Code AST & Sync Nexus Graph
        if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.pull_request.merged == true)
        env:
          NEXUS_SERVER_URL: ${{ secrets.NEXUS_SERVER_URL }}
          ENTERPRISE_NEXUS_TOKEN: ${{ secrets.ENTERPRISE_NEXUS_TOKEN }}
        run: |
          npm install -g graphify-cli
          npx graphify extract . --no-cluster
          curl -X POST "${NEXUS_SERVER_URL}/api/mcp/merge" \
            -H "Authorization: Bearer ${ENTERPRISE_NEXUS_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"repo\": \"notebook_tetrel\", \"graph_data\": $(cat graphify-out/graph.json)}"
```

---

## 2. Multi-Database Operational Maintenance Runbook

### A. SurrealDB Database Migrations
To run or check SurrealDB migrations:

```bash
# Execute SurrealDB async migration runner
uv run python -m open_notebook.database.async_migrate
```

### B. PostgreSQL pgvector Re-Indexing
Rebuild hybrid Reciprocal Rank Fusion (RRF) vector indices:

```sql
\c tetrel_research
REINDEX INDEX CONCURRENTLY idx_research_memory_embedding;
VACUUM ANALYZE research_memory;
```

---

## 3. Operational Troubleshooting Matrix

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`Pytest failure`** | Code contract changed without updating tests | Run `.venv/bin/pytest tests/` and fix broken test assertions |
| **`tsc --noEmit error`** | Next.js/React 19 prop mismatch | Run `cd frontend && npx tsc --noEmit` and resolve interface definition |
| **`PostgreSQL 5433 port collision`** | `gbrain-postgres` container running on 5433 | `docker-compose.yml` updated to port `5434:5432` |
| **`SurrealDB connection error`** | SurrealDB container down | Run `docker compose up -d surrealdb` |
