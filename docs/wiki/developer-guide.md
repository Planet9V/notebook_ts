# Developer Guide

## Prerequisites

- **Docker Desktop** (with Docker Compose v2)
- **Node.js** ≥ 18 (for frontend development)
- **Python** 3.12 (for backend development)

## First-Time Setup

### 1. Clone and Configure

```bash
git clone <repo-url>
cd notebook_tetrel
cp .env.example .env
# Edit .env — set OPEN_NOTEBOOK_ENCRYPTION_KEY to a secure random string
```

### 2. Start Services

```bash
# Start all Docker services (database, voice AI)
docker compose up -d

# Verify services are running
docker ps --format '{{.Names}}\t{{.Status}}'
# Expected: surrealdb (healthy), livekit-server, kokoro-tts, whisper-stt
```

### 3. Backend Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Run backend tests
.venv/bin/pytest tests/ -v
# Expected: 331 tests passing
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:8502
```

## Development Workflow

### Karpathy Rules (CLAUDE.md)

All development MUST follow these principles from [CLAUDE.md](file:///Users/jimmcknney/notebook_tetrel/CLAUDE.md):

1. **Think Before Coding** — State assumptions, find root cause before writing code
2. **Simplicity First** — Simple > clever. Reuse proven patterns
3. **Surgical Changes** — Touch minimum files. Small, verifiable diffs
4. **Goal-Driven Execution** — Define success criteria, loop until verified

### Test-Driven Development

```bash
# 1. RED: Write a failing test
# 2. GREEN: Write minimum code to pass
# 3. REFACTOR: Clean up, verify all tests still pass

# Run specific test file
.venv/bin/pytest tests/test_notebooks_api.py -v

# Run all tests
.venv/bin/pytest tests/ -v

# Run frontend tests
cd frontend && npx vitest run
```

### Adding a New Router

1. Create `api/routers/my_feature.py` following the pattern in [auth.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/auth.py)
2. Add Pydantic models to `api/models.py`
3. Register in [main.py](file:///Users/jimmcknney/notebook_tetrel/api/main.py#L346-L379):
   ```python
   from api.routers import my_feature
   app.include_router(my_feature.router, prefix="/api", tags=["my-feature"])
   ```
4. Write tests in `tests/test_my_feature_api.py`
5. Run: `.venv/bin/pytest tests/test_my_feature_api.py -v`

### Adding a Frontend Page

1. Create `frontend/src/app/(dashboard)/my-page/page.tsx`
2. Add navigation link in the sidebar component
3. Create API client in `frontend/src/lib/api/`
4. Run TypeScript check: `cd frontend && npx tsc --noEmit`

## Project Structure

### Backend Router Pattern

```python
# Every router follows this pattern:
from fastapi import APIRouter, HTTPException
from open_notebook.database.repository import repo_query

router = APIRouter()

@router.get("/my-endpoint")
async def my_endpoint():
    try:
        result = await repo_query("SELECT * FROM my_table")
        return result
    except HTTPException:
        raise  # IMPORTANT: re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Test Pattern

```python
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from api.main import app
    return TestClient(app)

class TestMyFeatureAPI:
    @patch("api.routers.my_feature.repo_query", new_callable=AsyncMock)
    def test_my_endpoint(self, mock_query, client):
        mock_query.return_value = [{"id": "1", "name": "test"}]
        response = client.get("/api/my-endpoint")
        assert response.status_code == 200
```

## Test Coverage Summary

| Component | Tests | Status |
|-----------|-------|--------|
| Auth API | 3 | ✅ |
| Chat API | 10 | ✅ |
| Notebooks API | 14 | ✅ |
| Contacts API | 10 | ✅ |
| Config API | 4 | ✅ |
| Customers API | 40 | ✅ |
| Assessments API | 30 | ✅ |
| Voice AI | 20 | ✅ |
| Domain Logic | 50+ | ✅ |
| **TOTAL** | **331** | ✅ |
