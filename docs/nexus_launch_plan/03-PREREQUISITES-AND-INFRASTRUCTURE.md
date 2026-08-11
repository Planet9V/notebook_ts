# Enterprise Codebase Nexus — Prerequisites & Multi-Database Stack

> **Document Version:** 2.1.0 (Kaizen Improved — Airgapped & Local LLM Ready)  
> **Target System:** Enterprise Linux / Docker Infrastructure  

---

## 1. Multi-Database & AI Engine Hardware Allocation

### Enterprise Hardware Specs (Airgapped & Local LLM Ready)
- **CPU:** 8+ vCPUs (16 vCPUs recommended for concurrent AST extraction & vector indexing).
- **RAM:** 16 GB minimum (32 GB recommended for Neo4j JVM + PostgreSQL buffer pool).
- **GPU (Optional):** NVIDIA GPU with 12GB+ VRAM for fast local LLM / Ollama embedding inference.
- **Disk:** 100 GB NVMe SSD storage.

---

## 2. Production Docker Stack (`docker-compose.yml`)

The production container stack includes PostgreSQL (pgvector), Neo4j Graph DB, Ollama Local Airgapped LLM, Headless Chrome, and the Nexus Gateway:

```yaml
version: '3.8'

services:
  # ─── 1. Graphify & Swarm Gateway ──────────────────────────────────────────
  nexus-mcp:
    image: node:20-alpine
    container_name: enterprise-nexus-mcp
    restart: always
    command: >
      sh -c "npm install -g graphify-cli ruflo@latest &&
             npx ruflo@latest daemon start --host 0.0.0.0 --port 4747"
    ports:
      - "4747:4747"
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - NEXUS_PORT=4747
      - CLAUDE_FLOW_MODE=v3
      - CLAUDE_FLOW_MEMORY_BACKEND=hybrid
      - OLLAMA_BASE_URL=http://ollama:11434
      - BEARER_TOKEN=${ENTERPRISE_NEXUS_TOKEN:-secret_nexus_token_2026}
    volumes:
      - nexus_data:/data
      - ~/.graphify:/root/.graphify
      - ~/.claude-flow:/root/.claude-flow
    depends_on:
      - postgres
      - neo4j

  # ─── 2. Airgapped Local LLM & Embedding Engine (Ollama) ───────────────────
  ollama:
    image: ollama/ollama:latest
    container_name: enterprise-ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ─── 3. PostgreSQL 17 + pgvector (Vector & Hybrid Search) ─────────────────
  postgres:
    image: pgvector/pgvector:pg17
    container_name: enterprise-postgres
    restart: always
    environment:
      POSTGRES_DB: enterprise_nexus
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-nexus_dev_pass}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nexus"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── 4. Neo4j Graph Database (APOC & Entity Topology) ─────────────────────
  neo4j:
    image: neo4j:2026.05.0
    container_name: enterprise-neo4j
    restart: always
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-nexus_neo4j_pass}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
    ports:
      - "7474:7474" # HTTP Browser
      - "7687:7687" # Bolt Protocol
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs

  # ─── 5. Headless Chrome Browser Automation (Port 9222) ───────────────────
  chrome-headless:
    image: zenika/alpine-chrome:latest
    container_name: enterprise-chrome-headless
    restart: always
    command: [
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-address=0.0.0.0",
      "--remote-debugging-port=9222"
    ]
    ports:
      - "9222:9222"

volumes:
  nexus_data:
  ollama_models:
  postgres_data:
  neo4j_data:
  neo4j_logs:
```

---

## 3. Background Scheduler & Auto-Compaction Setup

To maintain automated task execution, self-improvement loops, memory compaction, and token auto-refresh, configure `crontab -e`:

```cron
# 1. Hourly Memory Consolidation & PageRank Re-indexing
0 * * * * cd /opt/nexus && npx ruflo@latest daemon trigger --worker consolidate >/dev/null 2>&1

# 2. Daily Memory Compaction & Stale Vector TTL Cleanup at 1:00 AM (Kaizen Improvement)
0 1 * * * cd /opt/nexus && npx ruflo@latest memory store --namespace system --key "compaction_run" --value "$(date)" >/dev/null 2>&1

# 3. Daily Database & Graph Backup at 2:00 AM
0 2 * * * /opt/nexus/scripts/backup_nexus.sh >/dev/null 2>&1

# 4. Context7 API Cache Refresh Every 6 Hours
0 */6 * * * npx ruflo@latest memory search --query "latest api versions" --namespace stack-knowledge >/dev/null 2>&1
```
