# Findings: Full Root Cause Research
Date: 2026-06-15

## The Real Test Baseline

| Category | Count | Truth |
|----------|-------|-------|
| Pure unit tests (no infra) | **156 pass** | This is the HONEST baseline |
| SurrealDB-dependent tests | ~116 fail | Will pass when Docker is running |
| Playwright/browser tests | 63 error | Need `--run-e2e` flag + Chromium |
| Deselected by -k filter | 78 | Voice/podcast/docker keyword excluded |

**10 test FILES have no infra dependency:**
chunking, domain, embedding, encryption, graphs, podcast_path, podcast_worker, search_engines, url_validation, utils

**36 test FILES need live SurrealDB** (connection refused errors — NOT logic failures)

## Root Causes (confirmed)

### RC-1: Test lies — 116 failures are infra-missing, not code bugs
- Every failing test connects to `ws://localhost:8000` or Playwright's Chromium
- When Docker isn't running, tests fail with `ConnectionRefused` — pytest reports FAILED not SKIPPED
- **The test runner should SKIP these, not FAIL**
- Fix: `conftest.py` fixture checks `SURREAL_ADDRESS` env var, marks tests skipped

### RC-2: starlette 0.50.0 — CVE-2026-48710 BadHost
- Our lock: fastapi 0.128.0 / starlette 0.50.0
- Upstream lock: fastapi 0.136.3 / starlette 1.2.1
- CVE is a Host header injection that can bypass middleware (auth, CORS)
- Cherry-pick: upstream commit `1d9001b`
- uv.lock will regenerate automatically with `uv sync`

### RC-3: Podcast gets empty content — Notebook.get_sources() always omits full_text
- `get_sources()` query: `select * omit source.full_text from (...)`
- This is HARDCODED — no way to opt into full text
- Podcast generation calls `get_sources()` → gets sources with NO content → generates empty/hallucinated episode
- Upstream commit `ee77654`:
  - Adds `include_full_text: bool = False` param to `get_sources()`
  - Adds `include_content: bool = False` param to `get_notes()`  
  - Adds new `Notebook.get_context()` async method that fetches full content and returns formatted string
  - The method is called by podcast generation service

### RC-4: PUT profile handlers overwrite all fields (model_dump issue)
- Current code manually assigns each field: `profile.name = profile_data.name` etc.
- Problem: If client sends partial update (only changing `name`), unset fields default to `None` and overwrite existing DB values
- Upstream commit `1337098`:
  - Replaces manual field assignment with `for field, value in profile_data.model_dump(exclude_unset=True).items(): setattr(profile, field, value)`
  - Affects: EpisodeProfile PUT handler, SpeakerProfile PUT handler

### RC-5: page.tsx bento dashboard — 601-line diff uncommitted
- Contains: full perspectives dashboard redesign (Researcher/Marketing/Delivery/Admin views)
- No TODOs in code (only HTML `placeholder=` attributes which are correct)
- TS type-checks clean
- Just needs review and commit

### RC-6: Additional upstream dep bumps available
- aiohttp 3.11.x → 3.14.0 (security)
- tornado 6.5.5 → 6.5.6 (security)
- axios 1.15.2 → 1.16.0 (frontend security)
- These come along when we cherry-pick and run `uv sync`

## File Map for Changes

| File | Change Needed | RC |
|------|---------------|-----|
| `tests/conftest.py` | Add surreal_available skip fixture + --run-e2e option | RC-1 |
| `tests/test_loom_mockup.py` | Add e2e skip decorator | RC-1 |
| All 36 test_*.py with SurrealDB | Add skip marker | RC-1 |
| `open_notebook/domain/notebook.py` | Cherry-pick ee77654 changes | RC-3 |
| `api/routers/episode_profiles.py` | Cherry-pick 1337098 changes | RC-4 |
| `api/routers/speaker_profiles.py` | Cherry-pick 1337098 changes | RC-4 |
| `uv.lock` | Regenerate after security bump | RC-2, RC-6 |
| `frontend/src/app/(dashboard)/page.tsx` | Commit as-is (already clean) | RC-5 |

## What NOT to Do
- Do NOT attempt a full `git merge upstream/main` — we have 76 custom commits that will conflict
- Do NOT fix Playwright tests by installing Chromium — they test a static HTML mockup, not the real app
- Do NOT change the test_loom_mockup.py tests to point at the real app — separate concern
- Do NOT bump pyproject.toml fastapi pin manually — let uv.lock handle resolved versions
