# Open Notebook / Enterprise Nexus — Phased Development Stages

> **Project Root:** `/Users/jimmcknney/notebook_tetrel`  
> **Document Version:** 3.0.0 (Codebase Rationalization & Consolidated Architecture)  

---

## Stage 1: Foundation Baseline & Shared Component Consolidation

### Description
Validate the existing application stack (`notebook_tetrel`), verify database migrations, resolve port collisions, enforce Karpathy test-driven development rules, and consolidate shared data models to prevent shadow codebase creation.

### Key Deliverables & Target Files
1. **Docker Container Launch & Port Alignment**:
   - Update `docker-compose.yml` (Postgres mapped to `5434:5432` to avoid collisions).
   - Verify `surrealdb` (8000), `livekit-server` (7880/7881), `kokoro-tts` (8880), and `whisper-stt` (8881).
2. **Environment & Security Gate**:
   - Validate `.env` configuration for `OPEN_NOTEBOOK_ENCRYPTION_KEY`.
   - Run type safety verification (`cd frontend && npx tsc --noEmit`).
3. **Shared Model Consolidation**:
   - Rationalize CRM & Research schemas in `open_notebook/domain/` to ensure no duplicated model definitions.

### Stage 1 Verification Gate Commands
```bash
# 1. Frontend Type Safety (MUST pass with 0 errors)
cd frontend && npx tsc --noEmit

# 2. Backend Pytest Unit Suite
.venv/bin/pytest tests/ -m "unit"

# 3. Service Health Check
curl -i http://localhost:8000/health
docker compose ps
```

---

## Stage 2: Nexus Graph & Multi-DB Intelligence Integration

### Description
Hook up Graphify’s global knowledge graph (`10,225 nodes`), PostgreSQL 17 pgvector hybrid search, Neo4j Cypher APOC graph, and Context7 live API documentation indexing to eliminate obsolete syntax hallucinations.

### Key Deliverables & Target Files
1. **Graphify Global Graph Nexus**:
   - Register project graph into central global graph: `graphify global add graphify-out/graph.json --as notebook_tetrel`.
   - Expose GitNexus HTTP MCP Gateway on port `4747`.
2. **PostgreSQL pgvector & Neo4j Integration**:
   - Verify hybrid Reciprocal Rank Fusion search in `open_notebook/search/research_memory.py`.
   - Connect Neo4j APOC procedures to `api/routers/oxot.py` and `api/routers/market_analysis.py`.
3. **Context7 Real-Time API Indexing**:
   - Wire Context7 documentation fetching into `.claude-flow/data/ranked-context.json` for Next.js 16 and React 19.

### Stage 2 Verification Gate Commands
```bash
# 1. Test GitNexus HTTP MCP Gateway
curl -i http://localhost:4747/health

# 2. Query Knowledge Graph
graphify query "How does podcast worker integrate with SurrealDB?" --budget 2000

# 3. Test pgvector Search
.venv/bin/pytest tests/test_search_compare.py
```

---

## Stage 3: Autonomous Outbound & GTM App Integrations

### Description
Deploy OAuth-bypass MCP gateways and headless Chrome automation (port 9222) to enable automated market research, LinkedIn carousel generation, X (Twitter) publishing, Gmail outreach, and Google Calendar scheduling with Human-in-the-Loop (HITL) approval gates.

### Key Deliverables & Target Files
1. **OAuth-Bypass & Chrome DevTools MCP**:
   - Configure Chrome headless remote debugging on port `9222`.
   - Wire `api/routers/credentials.py` to store cached OAuth tokens.
2. **Social Media & Outreach Automation**:
   - Enable `linkedin-pdf-carousel` and `x-article-publisher-skill`.
   - Wire `api/routers/oxot.py` and `api/routers/contacts.py` for automated Gmail outreach drafting.
3. **Human-in-the-Loop (HITL) Approval Queue**:
   - Create draft approval queue in `scratch/outbound_drafts/` requiring 1-click human sign-off before publishing.

### Stage 3 Verification Gate Commands
```bash
# 1. Verify Headless Chrome Debugging Port
curl -i http://localhost:9222/json/version

# 2. Run Social & Credentials API Tests
.venv/bin/pytest tests/test_credentials_api.py tests/test_social_media_api_calls.py
```

---

## Stage 4: 3D WebGPU Canvas & Compounding Flywheel

### Description
Incorporate Babylon.js 3D WebGPU canvas rendering into the Next.js 16 frontend, connect Unreal Engine 5 Docker MCP tools, and establish a self-improving feedback flywheel where analytics auto-tune prompt libraries and codebase AST graphs.

### Key Deliverables & Target Files
1. **Babylon.js 3D WebGPU Frontend Integration**:
   - Add `@babylonjs/core` canvas component in `frontend/src/components/dashboard/`.
   - Render interactive 3D node graphs and digital twin visualizations.
2. **Unreal Engine 5 MCP Bridge**:
   - Enable Docker MCP tools (`manage_level`, `control_actor`, `manage_material_authoring`).
3. **Compounding Feedback Flywheel**:
   - Record conversion analytics (PostHog/Mixpanel) back into `ruflo memory store --namespace patterns`.
   - Run hourly `consolidate` daemon worker to update PageRank context weights.

### Stage 4 Verification Gate Commands
```bash
# 1. Full Production Build Verification
cd frontend && npm run build

# 2. Run All Backend Tests against Container Stack
.venv/bin/pytest tests/

# 3. Check Swarm Daemon Diagnostics
npx -y ruflo@latest doctor --fix
```
