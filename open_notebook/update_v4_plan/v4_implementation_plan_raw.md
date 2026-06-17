mplementation Plan: Full Fix Pass
Background
Branch feat/unified-researcher-social-creator — 10 commits ahead of origin, 31 behind upstream. Last commit: 74eedb3 (chat+nav+context fixes).

Karpathy Rule Violations
Rule	Violation	Fix
P3 TDD	116 test failures — all RuntimeError: Runner.run() cannot be called from a running event loop	Fix the async/sync mixing in 30 test files
P4 No faking	asyncio.run() inside @pytest.mark.asyncio silently lies about test coverage	All tests must be either fully sync or fully async
P7 No drift	31 upstream commits behind — includes 1 CVE, 1 podcast bug, 1 data-corruption bug	Cherry-pick 3 targeted commits
P8 Docker portable	Test suite reports 116 FAILED without Docker instead of SKIPPED	True root cause is event loop bug, not missing infra
Root Cause: The One Bug Behind 116 Failures

99×  RuntimeError: Runner.run() cannot be called from a running event loop
60×  playwright._impl._errors.Error: Playwright Sync API inside asyncio loop
All from the same pattern across ~30 test files:

python

# BROKEN — asyncio.run() nested inside pytest-asyncio's loop
@pytest.mark.asyncio
async def test_something():
    client = TestClient(app)   # ← TestClient creates its own runner → CRASH
    asyncio.run(repo_delete()) # ← Also crashes
Fix pattern (already proven on test_canvas_quiz_linkage):

python

# FIXED — fully sync, asyncio.run() for cleanup only
def test_something():
    client = TestClient(app)   # ✅ Works in sync context
    asyncio.run(repo_delete()) # ✅ Works — no outer loop running
IMPORTANT

The Playwright failures are the same root cause — sync_playwright() cannot be used inside an asyncio loop. The tests are fine architecturally; they just need the @pytest.mark.asyncio decoration removed.

Open Questions
WARNING

Decision needed: For tests that ARE truly async (they await real async functions), should we:

Option A (P1 simple): Convert all to sync + asyncio.run() — consistent, simple, no httpx dependency
Option B (P3 correct): Convert to fully async with httpx.AsyncClient — more faithful to the async app, but requires adding httpx as a test dependency
Recommendation: Option A for now (Karpathy P1 — simpler). Mark as tech debt to convert to Option B when httpx is added.

Proposed Changes
Phase 1 — Fix the Async/Sync Test Bug
Root cause: @pytest.mark.asyncio + TestClient/asyncio.run() nested runner conflict. Fix: Remove @pytest.mark.asyncio from all tests that use TestClient; replace await cleanup() with asyncio.run(cleanup()).

[MODIFY] 
conftest.py
Add asyncio_mode = "strict" to prevent pytest-asyncio from auto-decorating sync tests as async, and add --run-e2e CLI option for Playwright tests.

python

# Add to conftest.py
def pytest_addoption(parser):
    parser.addoption("--run-e2e", action="store_true", default=False,
                     help="Run Playwright E2E tests (requires browser)")
def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-e2e"):
        skip_e2e = pytest.mark.skip(reason="Pass --run-e2e to run Playwright tests")
        for item in items:
            if "test_loom_mockup" in item.nodeid or "test_e2e" in item.nodeid:
                item.add_marker(skip_e2e)
[MODIFY] Affected test files — async/sync fix
Pattern: remove async keyword + @pytest.mark.asyncio; replace await cleanup() with asyncio.run(cleanup()).

Files that mix TestClient + asyncio (confirmed from error log):

tests/test_skills_api.py
tests/test_search_engines.py
tests/test_search_compare.py
tests/test_scheduled_search.py
tests/test_sources_api.py
tests/test_social_media_api_calls.py
tests/test_recurring_search_worker.py
tests/test_episode_scheduler.py
tests/test_publications_publishing.py
tests/test_pipeline_preconditions.py
tests/test_regulations_api.py
any others in the 99× error group
Acceptance: pytest -q with no Docker → 156+ passed, 0 failed, N skipped (Playwright skipped by default)

Phase 2 — Cherry-Pick 3 Upstream Commits
2a. CVE-2026-48710 — starlette BadHost injection
Upstream commit: 1d9001b — bumps fastapi 0.128.0 → 0.136.3 / starlette 0.50.0 → 1.2.1

bash

git cherry-pick 1d9001b
uv sync
What changes: uv.lock gets updated hashes. pyproject.toml may need fastapi>=0.136.3 pin.

CAUTION

Our pyproject.toml pins fastapi>=0.104.0. After cherry-pick, check if uv resolves to 0.136.3+ automatically or if we need to tighten the pin to fastapi>=0.136.3.

[MODIFY] 
notebook.py
Upstream commit ee77654 — adds three changes to our Notebook class:

python

# 1. get_sources() gets optional full_text flag
async def get_sources(self, include_full_text: bool = False) -> List["Source"]:
    source_projection = "" if include_full_text else " omit source.full_text"
    # query changes: f"select *{source_projection} from ..."
# 2. get_notes() gets optional content flag  
async def get_notes(self, include_content: bool = False) -> List["Note"]:
    note_projection = " omit note.embedding" if include_content else " omit note.content, note.embedding"
# 3. NEW METHOD — Notebook.get_context() for podcast generation
async def get_context(self) -> str:
    sources = await self.get_sources(include_full_text=True)
    notes = await self.get_notes(include_content=True)
    # builds formatted string of all content
    ...
WARNING

Our Notebook class has many extra fields (stage, pipeline_type, customer_id, etc.) compared to upstream's base class. The cherry-pick will apply cleanly to the domain model but may conflict if upstream's test file references a simpler Notebook schema. Resolve by keeping our field set and adding only the method changes.

[MODIFY] Episode + Speaker Profile PUT handlers
Upstream commit 1337098 — model_dump(exclude_unset=True) fix:

python

# BEFORE (overwrites all fields including unset ones)
profile.name = profile_data.name
profile.description = profile_data.description
# ... 10 more fields
# AFTER (only updates what the client sent)
for field, value in profile_data.model_dump(exclude_unset=True).items():
    setattr(profile, field, value)
Files affected: api/routers/episode_profiles.py, api/routers/speaker_profiles.py

Phase 3 — Commit page.tsx Bento Dashboard
[MODIFY] 
page.tsx
601-line diff. Already TS-clean. No TODOs. Contains:

DashboardPage (renamed from MockupsPage)
4 persona views: Researcher, Marketing, Delivery PM, Admin
Live data hooks: usePublicationsCalendar, useResearchMemoryStats, useVoiceRegistry
Active project selector, new customer dialog, compliance override confirmation
bash

git add "frontend/src/app/(dashboard)/page.tsx"
git commit -m "feat(dashboard): bento perspectives dashboard with 4 persona views
- Rename MockupsPage → DashboardPage (the page.tsx at /app route)
- Researcher view: notebook scoping, research memory stats, transformations
- Marketing view: publications calendar, voice registry, episode scheduler  
- Delivery PM view: active project selector, kanban, customer compliance
- Admin view: new customer dialog, voice config, embedding rebuild
- All views use live API hooks — zero mock data"
Phase 4 — Push and Verify
bash

git push origin feat/unified-researcher-social-creator
git status --short  # must be empty
Verification Plan
Automated Tests
bash

# Must pass with no Docker:
.venv/bin/pytest tests/ -q  
# Expected: 156+ passed, 0 failed, N skipped (playwright skipped)
# Must pass with Docker:
make start-all  # waits for SurrealDB
.venv/bin/pytest tests/ -q --run-e2e
# Expected: all tests pass or skip (no failures)
# TypeScript must be clean:
cd frontend && npx tsc --noEmit
Security Verification
bash

python -c "import starlette; print(starlette.__version__)"
# Must print: 1.2.1 or higher
Podcast Fix Verification
python

# In Python REPL with Docker running:
from open_notebook.domain.notebook import Notebook
nb = await Notebook.get("notebook:someId")
context = await nb.get_context()  # Must not AttributeError
print(len(context))  # Must be > 0
