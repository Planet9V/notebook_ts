# Open Notebook / Enterprise Nexus — Developer Onboarding & Quickstart Wiki

> **Repository Root:** `/Users/jimmcknney/notebook_tetrel`  
> **GitHub Remote:** `https://github.com/Planet9V/notebook_ts.git`  
> **Last Updated:** 2026-08-10  

---

## 1. Prerequisites & System Setup

Ensure your local machine has the following tools installed:
- **Python 3.12** (managed via `.venv` or `uv`)
- **Node.js 20+** & `npm`
- **Docker Desktop** & `docker compose`

---

## 2. Quickstart Execution Guide

### Step 1: Environment & Virtual Environment
```bash
cd /Users/jimmcknney/notebook_tetrel

# Activate Python Virtual Environment
source .venv/bin/activate

# Verify environment variables
cp .env.example .env # If .env is missing
```

### Step 2: Start Container Stack
```bash
# Launch SurrealDB, PostgreSQL 17 pgvector, LiveKit, Kokoro TTS, Whisper STT
docker compose up -d
```

### Step 3: Run Backend API & Frontend Development Servers
```bash
# Start Backend API (FastAPI on Port 5055)
uv run --env-file .env run_api.py

# Start Frontend (Next.js 16 on Port 3000)
cd frontend && npm run dev
```

---

## 3. Verification & Testing Guardrails

Before pushing any changes to GitHub (`Planet9V/notebook_ts`), run the verification suite:

```bash
# 1. Run Python Pytest Suite (MUST PASS)
.venv/bin/pytest tests/

# 2. Verify Frontend TypeScript Type Safety (MUST RETURN 0 ERRORS)
cd frontend && npx tsc --noEmit

# 3. Check Code Formatting
ruff check . --fix
```

---

## 4. Git & Branching Conventions

- **Main Branch**: `main` (mirrored to `Planet9V/notebook_ts`).
- **Commits**: Atomic, descriptive commits referencing the feature or fix.
- **Untracked Files Check**: Always run `git status --short` before ending a session to ensure no untracked clutter is committed to root.
