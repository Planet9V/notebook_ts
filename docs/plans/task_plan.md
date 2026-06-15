# Task Plan: Full Fix Pass — Root Cause + Upstream Sync
Created: 2026-06-15 | Branch: feat/unified-researcher-social-creator

## Goal
Fix all remaining issues using proper root cause, Karpathy rule compliance, and upstream sync.
No stubs. No workarounds. Commit clean and push to origin.

## Karpathy Rule Violations Found

| Rule | Violation | Severity |
|------|-----------|----------|
| P3 (TDD) | 116 test failures - 63 are Playwright (need browser), most others need live SurrealDB | HIGH |
| P3 (TDD) | 10 pure unit tests pass — this is the ONLY honest baseline | INFO |
| P4 (No faking) | Playwright tests run against a static HTML mockup, not the real app | HIGH |
| P7 (No drift) | We are 31 upstream commits behind — includes 1 security CVE + 1 podcast bug | HIGH |
| P8 (Docker portable) | Tests require `docker compose up` but run without it — fail silently on DB ops | MEDIUM |
| P1 (Simple code) | chat.py = 738 lines, context_builder.py = 506 lines — both at limit | MEDIUM |

## Root Cause Analysis

### RC-1: Test Suite Lies (116 "failures" that are really infra-missing)
- **Real cause**: Tests call SurrealDB/Playwright without `pytest.mark.skip` guards when infra is down
- **Evidence**: All 116 failures are DB connection errors or Playwright browser-not-found
- **Fix**: Add `@pytest.mark.skipif` decorators based on `SURREAL_ADDRESS` env var check; skip Playwright tests unless `--run-e2e` flag passed
- **Karpathy**: P3 — tests must be runnable; P8 — must work with and without Docker

### RC-2: Security CVE (starlette 0.50.0 → 1.2.1)
- **Real cause**: We pin `fastapi>=0.104.0` with no upper bound — uv resolved 0.128.0/starlette 0.50.0 before upstream patched
- **CVE**: CVE-2026-48710 BadHost header injection in starlette < 1.2.1
- **Fix**: Cherry-pick upstream commit `1d9001b` (fastapi 0.136.3) + update uv.lock
- **Karpathy**: P7 — must not drift from upstream security patches

### RC-3: Podcast Gets Empty Context
- **Real cause**: `Notebook.get_sources()` always omits `full_text` (hardcoded `omit source.full_text`) — podcast generation calls `get_sources()` and sees no document content
- **Upstream fix**: commit `ee77654` adds `include_full_text=True` param + new `Notebook.get_context()` method
- **Fix**: Cherry-pick `ee77654` — adds `include_full_text` flag and `get_context()` to Notebook class
- **Karpathy**: P3 — upstream had a failing test that exposed this; P5 — silent empty content

### RC-4: model_dump PUT handlers send extra fields
- **Real cause**: PUT profile handlers use `model.model_dump()` which includes ALL fields (including unset defaults), causing SurrealDB to overwrite fields the user didn't change
- **Upstream fix**: commit `1337098` changes to `model_dump(exclude_unset=True)`
- **Fix**: Cherry-pick `1337098`
- **Karpathy**: P6 — mutations must be traceable; P4 — no hidden side effects

### RC-5: page.tsx bento dashboard uncommitted
- **Real cause**: 601-line diff left unstaged — represents perspectives dashboard work
- **Fix**: Review, commit with clean message
- **Karpathy**: P7 — no drift between code and committed state

### RC-6: Upstream dep bumps (aiohttp, tornado, axios security)
- **Real cause**: Security bumps in transitive deps — aiohttp 3.14.0, tornado 6.5.6, axios 1.16.0
- **Fix**: `uv sync` after cherry-picking relevant upstream commits that update uv.lock
- **Karpathy**: P7

## Phases

### Phase 1: Honest Test Baseline [PRIORITY: HIGH]
**Goal**: Make `pytest` tell the truth — pass if infra missing, skip correctly, never lie.

- [ ] 1a. Add `conftest.py` fixture: `surreal_available` — checks if SurrealDB is reachable
- [ ] 1b. Add `@pytest.mark.skipif(not surreal_available, reason="SurrealDB not running")` to all 36 DB-dependent test files
- [ ] 1c. Add `--run-e2e` pytest option; all Playwright tests auto-skip without it
- [ ] 1d. Run `pytest` — expect **all 10 pure unit tests pass, all infra tests SKIPPED**
- [ ] 1e. Run `pytest --run-e2e` with Docker up — expect full suite passing

**Files**:
- `tests/conftest.py` — add skip markers and `--run-e2e` flag
- `tests/test_loom_mockup.py` — add e2e skip decorator
- All 36 SurrealDB-dependent test files — add skip decorator

**Acceptance**: `pytest -q` with no Docker = 10 passed, 0 failed, N skipped

---

### Phase 2: Security + Upstream Fixes [PRIORITY: HIGH]
**Goal**: Apply upstream security patch and bug fixes without merge conflicts.

- [ ] 2a. Cherry-pick `1d9001b` (fastapi 0.136.3 / starlette CVE fix) — resolve any conflicts
- [ ] 2b. Cherry-pick `ee77654` (Notebook.get_context() + include_full_text param) — our Notebook model has extra fields so may have conflicts
- [ ] 2c. Cherry-pick `1337098` (model_dump exclude_unset) — check if our PUT handlers are affected
- [ ] 2d. Run `uv sync` to update lock file
- [ ] 2e. Run unit tests to confirm nothing broke
- [ ] 2f. Confirm starlette version is now >= 1.2.1

**Files**:
- `open_notebook/domain/notebook.py` — get_sources(), get_notes(), get_context() methods
- `pyproject.toml` (may need fastapi version bump)
- `uv.lock` — regenerated
- Profile router files (model_dump fix)

**Acceptance**: `starlette.__version__ >= "1.2.1"`, unit tests pass, podcast test passes

---

### Phase 3: Commit page.tsx bento dashboard [PRIORITY: MEDIUM]
**Goal**: Clean commit of the bento perspectives work — no stubs, TS clean.

- [ ] 3a. Review `frontend/src/app/(dashboard)/page.tsx` diff — identify any stubs/TODOs
- [ ] 3b. Confirm TS type-checks clean
- [ ] 3c. Confirm all hooks referenced in page.tsx exist and export correctly
- [ ] 3d. Commit with proper message

**Files**: `frontend/src/app/(dashboard)/page.tsx`

**Acceptance**: `npx tsc --noEmit` exits 0, git status clean

---

### Phase 4: Push to origin [PRIORITY: MEDIUM]
- [ ] 4a. `git push origin feat/unified-researcher-social-creator`
- [ ] 4b. Confirm CI passes (if configured)
- [ ] 4c. `git status --short` = clean

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| truncate_to_fit removal broke podcast path | 1 | Restored with warning log |
| test_canvas_quiz_linkage mixed async/sync | 1 | Changed to sync def + asyncio.run() |

## Decision Log
- 2026-06-15: Do NOT merge all 31 upstream commits — cherry-pick only the 3 that matter (security CVE, podcast fix, model_dump fix)
- 2026-06-15: Do NOT attempt to fix Playwright tests without Docker — add skip guards instead
- 2026-06-15: page.tsx bento gets its own commit — separate from navigation/context fixes
