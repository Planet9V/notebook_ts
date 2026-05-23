# 📘 Tetrel DevOps Operations Guide & Troubleshooting Runbook

This runbook serves as the definitive reference for the production operations, configuration, health monitoring, and incident response for the **Tetrel (Open Notebook)** application stack.

---

## 🏗️ 1. Architecture & Service Topology

Tetrel is built as a split-frontend, split-backend containerized system, managed in production by `supervisord` inside the application container, connecting to an external or sidecar **SurrealDB** instance.

```mermaid
graph TD
    User([👤 End User / Web Browser]) -->|Port 8502| Proxy[🌐 Reverse Proxy / Load Balancer]
    
    subgraph "Application Container (runtime)"
        Proxy -->|Port 8502| FE[🌐 Next.js Standalone Frontend]
        Proxy -->|Port 5055| API[🐍 FastAPI Backend API]
        
        Supervisor[⚙️ Supervisord Process Manager] -.->|Manages| FE
        Supervisor -.->|Manages| API
        Supervisor -.->|Manages| Worker[⚙️ Surreal-Commands Worker]
        
        FE -->|Internal Network Call| API
    end
    
    subgraph "Database Container / Service"
        API -->|Port 8000 (WebSocket/RPC)| DB[(SurrealDB v2 - RocksDB)]
        Worker -->|Port 8000 (WebSocket/RPC)| DB
    end

    classDef container fill:#f9f,stroke:#333,stroke-width:2px;
    classDef external fill:#bbf,stroke:#333,stroke-width:2px;
```

### Component Breakdown
1. **Next.js Standalone Frontend (Port 8502)**: Built in Next.js standalone mode, running directly on Node.js to serve the UI statically and handle server-side rendering (SSR) / API routing.
2. **FastAPI Backend API (Port 5055)**: Powered by Uvicorn, serving all core assistant API endpoints, handling authentication, and orchestrating RAG pipelines.
3. **Surreal-Commands Worker (Background)**: A Python consumer that processes background commands and task queues.
4. **SurrealDB (Port 8000)**: Pinned to version `v2`, using the high-performance RocksDB storage engine for fast vector search and relational-graph persistence.

---

## ⚙️ 2. Runtime Configurations & Environment Variables

All runtime behavior is controlled by environment variables. Ensure these are injected into the container at startup.

### Core Variables

| Variable | Description | Default / Example | Importance |
| :--- | :--- | :--- | :--- |
| `OPEN_NOTEBOOK_ENCRYPTION_KEY` | Key to encrypt stored API keys in SurrealDB. | *Generate a secure random string* | **CRITICAL** (Security) |
| `SURREAL_URL` | WebSocket RPC URL for SurrealDB. | `ws://surrealdb:8000/rpc` | **CRITICAL** (Database) |
| `SURREAL_USER` | SurrealDB admin username. | `root` | **CRITICAL** (Database) |
| `SURREAL_PASSWORD` | SurrealDB admin password. | `root` | **CRITICAL** (Database) |
| `SURREAL_NAMESPACE` | Database namespace. | `open_notebook` | Standard |
| `SURREAL_DATABASE` | Database name. | `open_notebook` | Standard |
| `API_URL` | Public endpoint for the FastAPI Backend. | `https://api.tetrel.domain.com` or `http://localhost:5055` | **CRITICAL** (Frontend-API routing) |
| `TIKTOKEN_CACHE_DIR` | Directory containing offline cached tiktoken wheels. | `/app/tiktoken-cache` | **CRITICAL** (Offline Operation) |
| `HOSTNAME` | Next.js bind interface. | `0.0.0.0` | Container Networking |
| `NODE_ENV` | Mode for Next.js execution. | `production` | Performance |

---

## 🎛️ 3. Manual Override Controls

Inside the main container, all services are managed by `supervisord`. In case of issues, operations engineers can bypass normal control loops and run manual overrides.

### Entering the Container
```bash
docker exec -it <container_id_or_name> bash
```

### Supervisor Controls
Use `supervisorctl` to monitor, stop, start, or restart specific sub-processes without restarting the whole container:

```bash
# Check status of all processes
supervisorctl status

# Restart only the Backend API
supervisorctl restart api

# Stop the background worker
supervisorctl stop worker

# Start the frontend
supervisorctl start frontend

# View live stderr/stdout of a process
supervisorctl tail -f api
```

### Database Backups and Restores (SurrealDB)

#### 1. SQL Export (Logical Backup)
Run this command from the host or within the network to export database tables, relationships, and vector schemas to a flat SQL script:
```bash
docker exec -it <surrealdb_container_id> surreal export \
  --conn http://localhost:8000 \
  --user root \
  --pass root \
  --ns open_notebook \
  --db open_notebook \
  /mydata/backup_$(date +%F).sql
```

#### 2. SQL Import (Logical Restore)
Restore a schema and database structure using an exported file:
```bash
docker exec -i <surrealdb_container_id> surreal import \
  --conn http://localhost:8000 \
  --user root \
  --pass root \
  --ns open_notebook \
  --db open_notebook \
  /mydata/backup_to_restore.sql
```

#### 3. RocksDB Hot Volume Backup
Since SurrealDB uses RocksDB persisted to a bind mount `./surreal_data` on the host, you can perform physical folder level snapshots for instant backup:
```bash
# 1. Temporarily pause writes if possible or copy safely
tar -czvf surreal_physical_backup_$(date +%s).tar.gz ./surreal_data/
```

---

## 🏥 4. Health Check & Load Balancer Integrations

### Health Endpoints

#### 1. Backend Liveness Check
* **Endpoint**: `GET /health`
* **Response**: `{"status": "healthy"}` (Status Code `200`)
* **Usage**: Ideal for Load Balancer/Proxy (Nginx, ALB, Caddy) target health verification. Very low CPU overhead.

#### 2. Database & Version Integrity Check
* **Endpoint**: `GET /api/config`
* **Response**:
  ```json
  {
    "version": "1.8.5",
    "latestVersion": "1.8.5",
    "hasUpdate": false,
    "dbStatus": "online"
  }
  ```
* **Usage**: Used for deep liveness/readiness probes (Kubernetes readiness probes). If `"dbStatus"` is `"offline"`, the backend cannot communicate with SurrealDB.

### Load Balancer Configuration Examples

#### Nginx Configuration
```nginx
upstream backend_api {
    server 127.0.0.1:5055;
    keepalive 32;
}

upstream frontend_ui {
    server 127.0.0.1:8502;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name tetrel.domain.com;

    # Frontend routes
    location / {
        proxy_pass http://frontend_ui;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # API Health Check Bypass
    location /health {
        proxy_pass http://backend_api/health;
        proxy_set_header Host $host;
    }
}
```

#### Traefik (v2+) Label Configurations
Configure these labels on your compose file for automatic TLS termination and routing:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.tetrel-fe.rule=Host(`tetrel.domain.com`)"
  - "traefik.http.routers.tetrel-fe.entrypoints=websecure"
  - "traefik.http.routers.tetrel-fe.tls.certresolver=myresolver"
  - "traefik.http.services.tetrel-fe.loadbalancer.server.port=8502"
  
  - "traefik.http.routers.tetrel-api.rule=Host(`tetrel.domain.com`) && PathPrefix(`/api`)"
  - "traefik.http.routers.tetrel-api.entrypoints=websecure"
  - "traefik.http.routers.tetrel-api.tls.certresolver=myresolver"
  - "traefik.http.services.tetrel-api.loadbalancer.server.port=5055"
```

---

## 📈 5. Observability & Log Analysis

Log streams are outputted straight to standard output (`/dev/stdout` and `/dev/stderr`) by supervisor, which lets standard container agents (AWS CloudWatch, Datadog Agent, Vector, FluentBit) scrape them easily.

### Internal Log Directory
If logs need to be audited from within the container filesystem, find them here:
* **Supervisor Daemon Log**: `/var/log/supervisor/supervisord.log`
* **Sub-process logs** (if redirection is configured): `/var/log/supervisor/`

### Critical Log Signatures to Watch
* `Database health check timed out after 2 seconds` ⚠️: Indicates high database latency. RocksDB under severe load or complex query execution blockages.
* `Pre-baked tiktoken cached files detected` ✅: App is running cleanly with optimized offline tokenizer loads.
* `uv run --no-sync uvicorn` 🚀: Indicates standard application server boots successfully without attempting network scans.

---

## 🚨 6. Incident Response Playbooks

### Playbook A: SurrealDB Connection Failure ("dbStatus": "offline")
**Symptom**: User sees infinite loading, or browser console throws HTTP 500 errors on API calls. `/api/config` has `"dbStatus": "offline"`.

1. **Verify SurrealDB container status**:
   ```bash
   docker ps | grep surrealdb
   ```
2. **Ping SurrealDB from inside application container**:
   ```bash
   docker exec -it <app_container> curl -v http://surrealdb:8000/status
   ```
3. **If connection fails**:
   - Check if Docker bridge network is healthy.
   - Verify `SURREAL_URL` environment variable uses the correct network hostname (e.g. `ws://surrealdb:8000/rpc`).
4. **If connection succeeds but auth fails**:
   - Verify `SURREAL_USER` and `SURREAL_PASSWORD` credentials match the admin keys on SurrealDB.
   - Run a process restart on the API to clear connection pool cache:
     ```bash
     supervisorctl restart api
     ```

### Playbook B: Next.js API URL Mismatch (HTTP 404 or Connection Refused)
**Symptom**: Frontend UI renders successfully, but clicking buttons (e.g. login, document upload) fails with network connectivity errors in client console.

1. **Root Cause**: Next.js Standalone handles server-side fetches internally on the container loop, but client-side browser requests must go to the public URL.
2. **Fix**:
   - Inspect the `API_URL` environment variable passed into the container.
   - Ensure `API_URL` resolves to the *publicly accessible routing endpoint* of your FastAPI backend (e.g., `https://tetrel.domain.com/api` or `http://<host-ip>:5055`).
   - If using a reverse proxy, verify that `/api` path is properly rewrote and stripped to proxy to Uvicorn at Port 5055.

### Playbook C: Background Worker Task Starvation
**Symptom**: Long-running generation jobs, podcast synthesis, or notebook processing queues are stuck forever.

1. **Check Worker state**:
   ```bash
   supervisorctl status worker
   ```
2. **Inspect worker errors**:
   - Access container shell and view process logs:
     ```bash
     tail -n 100 /var/log/supervisor/worker-stderr*.log
     ```
3. **Common Worker Crashing issues**:
   - **Out of Disk Space**: podcast synthesis files filling up `/app/data`.
   - **OOM Lockup**: Large document chunking operations exhausting available RAM.
4. **Resolution Action**:
   - Free up disk space on the volume mount.
   - Restart background worker process:
     ```bash
     supervisorctl restart worker
     ```

### Playbook D: Tiktoken Offline Cache Miss (Network Timed Out during boot)
**Symptom**: Container takes extremely long to boot, or FastAPI crashes during a text processing request with `HTTPX Connect Timeout` from `tiktoken`.

1. **Root Cause**: The application is attempting to download the `o200k_base` encoding from public Microsoft/OpenAI repositories but has no outbound internet connection.
2. **Verification**:
   - Run: `ls -la /app/tiktoken-cache` inside the container. It should contain pre-downloaded tokenizers.
3. **Resolution**:
   - Ensure the container environment variable `TIKTOKEN_CACHE_DIR` is set to `/app/tiktoken-cache`.
   - Ensure that the container is built using the optimized Dockerfile which has the pre-baking step `.venv/bin/python -c "import tiktoken; tiktoken.get_encoding('o200k_base')"` in the builder stage.

---

## 🔄 7. Incident Rollbacks & CI/CD Pipeline Overrides

In the event of a corrupt image deployment or faulty main branch merge:

### Hot Rollback Procedure (Docker Compose)
1. **Identify previous working image version** from GHCR (e.g. `v1.8.4` or specific SHA `sha-abcdef`).
2. **Modify `docker-compose.yml` image tag**:
   ```yaml
   image: ghcr.io/lfnovo/open-notebook:v1.8.4
   ```
3. **Re-deploy container instantly**:
   ```bash
   docker compose up -d --force-recreate open_notebook
   ```

### Emergency Single-Container Fallback Mode
If your external database cluster is corrupted or unreachable, you can deploy the **Single Container** variant of Tetrel. This variant runs SurrealDB embedded *inside* the exact same container, storing its state in the persistent `/mydata` directory.

1. **Deploy using `Dockerfile.single` or pre-built single tag**:
   ```bash
   # Run the single container fallback
   docker run -d \
     -p 8502:8502 -p 5055:5055 \
     -v /opt/tetrel/data:/app/data \
     -v /opt/tetrel/db:/mydata \
     -e OPEN_NOTEBOOK_ENCRYPTION_KEY="your-secure-fallback-key" \
     ghcr.io/lfnovo/open-notebook:v1.8.5-single
   ```
2. This will boot SurrealDB internally and connect to it automatically.

### Overriding/Bypassing GitHub Actions CI Validation
If a hot-fix is blocked by TypeScript validation warnings or a flaky python test, bypass the deployment blocks using git triggers:

1. **Force Commit with `[skip ci]` flag** to bypass regular validation builds:
   ```bash
   git commit -m "fix(hotfix): emergency config bypass [skip ci]"
   git push origin main
   ```
2. **Trigger Workflow Dispatch**:
   - Navigate to the GitHub Repository → **Actions** tab.
   - Select **CI/CD Deployment** or **Build and Release** workflow.
   - Click **Run workflow**, choose the branch, and manually launch the build without PR locks.
