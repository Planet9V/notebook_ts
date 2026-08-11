# CRITICAL ISOLATION DIRECTIVE: OXOT-ADMIN & PRODUCTION INFRASTRUCTURE

> **CLASSIFICATION:** STRICT DO-NOT-TOUCH / ISOLATION BOUNDARY  
> **APPLIES TO:** All AI Agents, Automation Scripts, Docker Operations, and CI Pipelines  
> **DATE ENFORCED:** 2026-08-10  

---

## 🛑 MANDATORY RULE & ISOLATION BOUNDARY

The project **`oxot-admin`** (and all associated microservice containers, databases, networks, and persistent volumes) is a **standalone, critical production application**. 

### **STRICT DIRECTIVE:**
> **NEVER stop, restart, modify, reconfigure, migrate, export, import, or interfere with ANY container, port, database, volume, or network belonging to `oxot-admin` or `OXOT` infrastructure.**

---

## 🔒 Protected OXOT Container & Infrastructure Exclusion List

The following 12 containers are **STRICTLY PROTECTED AND EXCLUDED** from all cleanup, consolidation, or management scripts:

| Protected Container Name | Image / Service | Description | Protected Ports |
| :--- | :--- | :--- | :--- |
| **`oxot-admin`** | `oxot-admin-oxot-admin` | Main OXOT Admin Production Core | `4000:4000` |
| **`oxot-ner`** | `oxot-admin-oxot-ner` | Named Entity Recognition Engine | `5002:5002` |
| **`oxot-postgres`** | `pgvector/pgvector:pg17` | Production OXOT PostgreSQL DB | `5432:5432` |
| **`oxot-neo4j`** | `neo4j:2026.05.0` | Production OXOT Neo4j DB | `7474:7474`, `7687:7687` |
| **`oxot-docling`** | `docling-serve:latest` | Document Serving Service | `5001:5001` |
| **`oxot-worldmonitor`** | `oxot-worldmonitor:local` | World Monitor Service | Internal 8080 |
| **`oxot-globalthreatmap`**| `oxot-globalthreatmap:local`| Global Threat Map UI | Internal 3000 |
| **`wm-redis-rest`** | `oxot-wm-redis-rest:local` | Threat Map Redis REST Proxy | Internal 80 |
| **`wm-redis`** | `redis:7-alpine` | Threat Map Caching Engine | Internal 6379 |
| **`netbox` / `netbox-worker`**| `netboxcommunity/netbox` | Network Infrastructure CMDB | `8100:8080` |
| **`bloodhound` / `bloodhound-postgres` / `bloodhound-neo4j`** | `specterops/bloodhound` | Active Directory Security Graph | `8081:8080`, `7484`, `7697` |

---

## 🛡️ Enforcement Safeguards

1. **Docker Command Isolation**:
   All Docker commands executed for `notebook_tetrel` MUST use explicit compose scopes:
   ```bash
   # ALWAYS use explicitly scoped docker compose commands:
   docker compose -f /Users/jimmcknney/notebook_tetrel/docker-compose.yml [cmd]
   ```
   **NEVER run system-wide destructive commands** like `docker system prune -a` or blanket `docker stop $(docker ps -q)`.

2. **Port Isolation Matrix**:
   - `notebook_tetrel` PostgreSQL runs strictly on port **`5434`** (never `5432` which belongs to `oxot-postgres`).
   - `notebook_tetrel` SurrealDB runs strictly on port **`8000`**.
   - `notebook_tetrel` API runs strictly on port **`5055`**.

3. **Database Dump & Import Isolation**:
   Consolidation scripts only operate on `claude-mem-pg` (Port 5442) and `gbrain-postgres` (Port 5433). `oxot-postgres` and `oxot-neo4j` are completely excluded.
