# Enterprise Codebase Nexus — CI/CD, Guardrails & Operations

> **Document Version:** 2.0.0 (CI/CD Guardrails & Multi-DB Operations)  
> **Target Audience:** DevOps Engineers, Platform Engineers, SREs  

---

## 1. CI/CD Pipeline with Karpathy Guardrails (`.github/workflows/nexus-sync.yml`)

The enterprise CI/CD pipeline enforces Karpathy P3/P4 code quality checks before merging code and refreshing the central knowledge graph:

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
          pytest tests/ -m "unit"

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
            -d "{\"repo\": \"${{ github.event.repository.name }}\", \"graph_data\": $(cat graphify-out/graph.json)}"
```

---

## 2. Multi-Database Operational Maintenance Runbook

### A. PostgreSQL pgvector Re-Indexing
Rebuild hybrid Reciprocal Rank Fusion (RRF) vector indices weekly:

```sql
-- Connect to PostgreSQL 17
\c enterprise_nexus

-- Re-index pgvector HNSW index
REINDEX INDEX CONCURRENTLY idx_research_memory_embedding;

-- Run VACUUM ANALYZE to update statistics
VACUUM ANALYZE research_memory;
```

### B. Neo4j Graph Database Maintenance
Execute APOC procedures to verify node/relationship counts:

```cypher
// Check graph schema & node count
CALL db.labels() YIELD label
RETURN label, apoc.meta.type(label) AS type;

// Verify edge call relationships
MATCH (a:Function)-[r:CALLS]->(b:Function)
RETURN a.name, b.name LIMIT 50;
```

---

## 3. Autonomous Swarm Health & Self-Repair

To run automated health checks and repair local native bindings or sqlite pools:

```bash
# 1. Run diagnostic sweep
npx -y ruflo@latest doctor

# 2. Auto-repair broken dependencies or node module ABI mismatches
npx -y ruflo@latest doctor --fix

# 3. Restart local daemon
npx -y ruflo@latest daemon restart
```

---

## 4. Operational Troubleshooting Matrix

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`Pytest failure in CI`** | Un-tested code pushed (Karpathy P3 violation) | Write failing unit test in `tests/`, then fix function contract |
| **`tsc --noEmit type error`** | Missing interface prop or mismatch | Update React component props or TypeScript definition file |
| **`Neo4j connection error`** | Bolt port 7687 or authentication failure | Verify `NEO4J_AUTH` env in `docker-compose.yml` |
| **`Chrome DevTools MCP connection failed`** | Headless Chrome on port 9222 not listening | Run `docker compose up -d chrome-headless` |
