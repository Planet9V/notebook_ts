---
title: "Troubleshooting & Debugging Guide"
description: "Resolving port conflicts, SurrealDB connection failures, Voice AI timeouts, and container execution errors."
---

# Troubleshooting & Debugging Guide

This guide describes known error states and provides step-by-step resolution pathways.

---

## 🚦 Common Problems & Diagnostics Flow

Use this flow to isolate container issues:

```mermaid
graph TD
    classDef nodeStyle fill:#2d333b,stroke:#6d5dfc,color:#e6edf3;
    
    Issue["System Issue Detected"]:::nodeStyle
    CheckPorts{"Are Ports 8502, 5055, 8000 Free?"}:::nodeStyle
    CheckDB{"Can API connect to surrealdb:8000?"}:::nodeStyle
    CheckVoice{"Are Voice Services Healthy?"}:::nodeStyle
    
    PortFix["Free port (lsof -i :8502)"]:::nodeStyle
    DBFix["Check docker compose up surrealdb"]:::nodeStyle
    VoiceFix["Check WHISPER__MODEL env config"]:::nodeStyle
    Ok["System Healthy"]:::nodeStyle
    
    Issue --> CheckPorts
    CheckPorts -->|No| PortFix
    CheckPorts -->|Yes| CheckDB
    CheckDB -->|No| DBFix
    CheckDB -->|Yes| CheckVoice
    CheckVoice -->|No| VoiceFix
    CheckVoice -->|Yes| Ok
```

---

## 🚫 Specific Error Resolution Pathways

### 1. Port Conflicts (Address Already In Use)
If Docker or Python host servers fail to bind sockets:
* **SurrealDB (Port 8000):** Conflict with existing SurrealDB or local webservers `(docker-compose.yml:7)`.
* **FastAPI Backend (Port 5055):** Conflict with local development processes `(docker-compose.yml:28)`.
* **Next.js Frontend (Port 8502):** Conflict with parallel Node servers `(docker-compose.yml:27)`.

**Resolution Command:**
```bash
# Locate PID blocking port 8502
lsof -i :8502
# Terminate blocking process
kill -9 <PID>
```

---

## 🔌 Database Connection Failure

If FastAPI starts but logs `connection refused` or `database offline` errors:
* **Root Cause:** The database address environment parameter `SURREAL_URL` `(docker-compose.yml:35)` is incorrect or the DB is initializing slowly.
* **Troubleshooting Command:**
  ```bash
  # Check SurrealDB health status
  docker compose ps surrealdb
  
  # Connect to database shell to verify schemas
  docker compose exec surrealdb /surreal sql --endpoint http://localhost:8000 --ns open_notebook --db open_notebook
  ```

---

## 🎙️ Voice Service Timeouts (Kokoro & Whisper)

If Voice Lab pages return `504 Gateway Timeout` or generation fails:
* **Kokoro TTS Offline:** Kokoro TTS container fails to download model weights or CPU execution times out `(docker-compose.yml:71)`.
* **Whisper Model Mismatch:** Whisper STT fails to load the specified faster-whisper model `(docker-compose.yml:86)`.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Browser UI
    participant Gateway as open_notebook API
    participant Engine as kokoro-tts / whisper-stt
    
    Client->>Gateway: POST /api/voice/tts/synthesize
    Note over Gateway,Engine: Check connection config
    Gateway->>Engine: Forward request
    alt Connection Offline
        Engine--xGateway: Connection Refused / Timeout
        Gateway-->>Client: HTTP 500 Service Unavailable
    else Connection Ok
        Engine-->>Gateway: Return raw audio buffer
        Gateway-->>Client: HTTP 200 Audio WAV Blob
    end
```

**Resolution Action:**
1. Check configured Whisper model environment variables `(docker-compose.yml:42)`.
2. Inspect supervisor logs for Voice API checks: `(api/routers/voice.py:989)`.
3. Restart audio service containers:
   ```bash
   docker compose restart kokoro-tts whisper-stt
   ```
