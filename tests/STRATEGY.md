# Test Strategy — Open Notebook

## Why Are 53 Tests "Failing"?

Running `pytest tests/` without a live Docker environment will report ~53 failures. This is **expected and by design** — not a code quality problem.

### Breakdown of Failure Categories

| Category | Count | Cause | How to Fix |
|---|---|---|---|
| SurrealDB integration tests | ~45 | `OSError: Cannot connect to SurrealDB` — tests require live DB | Run `docker compose up -d` first |
| Playwright collection errors | 3 files | `playwright` package not installed in test venv | `pip install pytest-playwright` then `playwright install` |
| Voice AI stage 2 | 4 | Requires live Kokoro TTS + Whisper STT containers | Run with all services up |
| Known environment issues | ~1 | Port binding conflicts on CI | Use isolated Docker network |

## How to Run Tests

### Full Suite (requires all Docker services)

```bash
docker compose up -d  # Start all 6 services
.venv/bin/pytest tests/ -v --timeout=30
```

### Unit/mock tests only (no Docker needed)

```bash
.venv/bin/pytest tests/ -v \
  --ignore=tests/test_voice_ai_stage2.py \
  --ignore=tests/test_bento_dossier.py \
  --ignore=tests/test_loom_mockup.py \
  -m "not integration"
```

### Single module

```bash
.venv/bin/pytest tests/test_voice_copilot_tools.py -v
```

### TypeScript check (frontend — no Docker needed)

```bash
cd frontend && npx tsc --noEmit
```

## Test File Classification

| File Pattern | Type | Requires | Status |
|---|---|---|---|
| `test_voice_copilot_tools.py` | Unit (mocked) | None | ✅ 11 passing |
| `test_podcast_*.py` | Integration | SurrealDB + pgvector | Needs docker |
| `test_voice_ai_stage2.py` | Integration | Kokoro TTS + Whisper STT | Needs docker |
| `test_bento_*.py` | E2E (Playwright) | playwright package + browser | Install playwright |
| `test_loom_mockup.py` | E2E (Playwright) | playwright package + browser | Install playwright |
| All others | Integration | SurrealDB | Needs docker |

## Installing Playwright (for E2E tests)

```bash
.venv/bin/pip install pytest-playwright
.venv/bin/playwright install chromium
# Then run E2E tests:
.venv/bin/pytest tests/test_bento_dossier.py tests/test_loom_mockup.py -v
```

## CI/CD Strategy

- **CI pipeline** must run `docker compose up -d --wait` before `pytest`
- **Local dev** can skip integration tests with `--ignore` flags above
- **Pre-commit** only runs `npx tsc --noEmit` and `ruff check` (fast, no Docker)

## Test Naming Conventions

- `test_*_integration.py` — requires live services
- `test_*_unit.py` — can run standalone
- `test_*_e2e.py` — requires Playwright + browser

## Karpathy P3 — TDD Requirement

Per `GEMINI.md` rule P3: **No production code without a failing test first.**

Sequence for new features:
1. Write failing test in `tests/` (RED)
2. Run test — confirm it fails with the right error
3. Implement feature code (GREEN)
4. Refactor (REFACTOR)
5. All tests pass before committing
