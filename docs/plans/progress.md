# Progress Log
Started: 2026-06-15 07:42 CDT | Branch: feat/unified-researcher-social-creator

## Session State
- Committed: 74eedb3 (chat+nav+context fixes, sidebar nav, test event loop fix)
- Uncommitted: frontend/src/app/(dashboard)/page.tsx (601-line bento dashboard)
- Starlette: 0.50.0 (needs 1.2.1 for CVE)

## Key Discovery: The Real Root Cause of 116 Failures

The 116 test failures are NOT infrastructure failures. They are a **single systemic bug**:

```
99×  RuntimeError: Runner.run() cannot be called from a running event loop
60×  Playwright sync API inside asyncio loop
```

### The Bug Pattern
Tests mix two incompatible execution models:
1. `@pytest.mark.asyncio` → pytest-asyncio creates an asyncio event loop runner
2. Inside that runner, code calls `asyncio.run()` or `TestClient` (which also creates a runner)
3. Nested runners = `RuntimeError: Runner.run() cannot be called from a running event loop`

### Affected Test Pattern
```python
# BAD: asyncio.run() inside @pytest.mark.asyncio
@pytest.mark.asyncio
async def test_something():
    client = TestClient(app)  # TestClient creates its own event loop → CRASH
    await some_async_call()
    asyncio.run(cleanup())    # Also crashes
```

### The Fix
Two options per test:
- **Option A**: Make test `def` (sync), use `asyncio.run()` for any async calls
- **Option B**: Make test fully `async`, use `async with AsyncClient(app) as client` (httpx), await all async calls

We already applied Option A to `test_canvas_quiz_linkage`. Same fix needed across ~30 test files.

## Completed Steps
- [x] Fixed chat.py default context_size short→long
- [x] Fixed sources.py limit 100→1000  
- [x] Fixed use-sources.ts page size 30→1000
- [x] Fixed notebooks/[id]/page.tsx source mode default
- [x] Fixed AppSidebar.tsx — 8 new nav items
- [x] Fixed context_builder.py — truncate restored with warning
- [x] Fixed test_canvas_quiz_linkage — async/sync event loop fix (prototype of the fix pattern)
- [x] Committed as 74eedb3

## Errors Log
| Error | Context | Resolution |
|-------|---------|------------|
| truncate_to_fit removed | Broke podcast path | Restored with logger.warning |
| test_canvas_quiz_linkage async/sync | Full suite event loop poisoning | sync def + asyncio.run() |
| 116 test failures | Thought it was DB infra | ROOT CAUSE: asyncio.run() inside @pytest.mark.asyncio |
