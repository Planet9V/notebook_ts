# Review Gates — Mandatory Checkpoints

> These gates are non-negotiable stops. No work continues past a gate until USER approves.  
> Each gate has: verification commands, expected outputs, and a decision point.

---

## Gate A8 — Path A Complete

**When**: After all 7 Path A tasks are done.  
**Who approves**: USER.  
**What to present**: Test results, TypeScript status, screenshots of changed pages.

### Verification Commands

```bash
# 1. Backend tests (must be 0 failures)
cd /Users/jimmcknney/notebook_tetrel
.venv/bin/pytest tests/ -q 2>&1 | tail -5
# Expected: "X passed, Y skipped in Z.XXs" (0 failed)

# 2. TypeScript (must be 0 errors)
cd frontend && npx tsc --noEmit
# Expected: no output (silence = success)

# 3. Git status (must be clean)
git status --short
# Expected: empty output

# 4. Verify Migration 51 applied
.venv/bin/python -c "
import asyncio
from open_notebook.database.repository import repo_query
result = asyncio.run(repo_query('INFO FOR TABLE note'))
print(result)
"
# Expected: output contains 'content_format'

# 5. Manual verification checklist (browser screenshots required)
# A2: Press Ctrl+K → type a contact name → should appear in CommandPalette
# A3: Go to /customers/{any_id} → "Bento Overview" button should be visible
# A4: Go to /media → Generate content → should call real API (check network tab)
# A5: Wait for research item completion → check notebook for auto-created note
# A6: Go to /customers/{any_id} → Activity tab → should show timeline
# A7: Go to /pipeline?tab=projects → DeliveryTree should appear on left
```

### Expected Outputs

| Check | Expected |
|-------|----------|
| pytest | 0 failed |
| tsc | 0 errors |
| git status | empty |
| Migration 51 | content_format field visible |
| CommandPalette | contacts, projects, sources searchable |
| Bento link | visible on customer detail page |
| Social Builder | no fake setTimeout (check dev tools network) |
| Activity feed | renders on customer page |

### User Decision

Present results. User must say **"proceed to Path B"** or **"fix [specific issue] first"**.

---

## Gate B14 — Path B Complete

**When**: After all Path B tasks are done.  
**Who approves**: USER.  
**What to present**: Test results, TypeScript status, Docker build status, new page screenshots.

### Verification Commands

```bash
# 1. Backend tests
.venv/bin/pytest tests/ -q 2>&1 | tail -10
# Expected: 0 failed

# 2. TypeScript
cd frontend && npx tsc --noEmit
# Expected: 0 errors

# 3. Docker build
docker compose up -d --build open_notebook
docker compose ps
# Expected: all services "Up" and "healthy"

# 4. New tables exist
curl -s http://localhost:5055/api/tasks | jq 'length'
# Expected: number ≥ 0 (table exists, may be empty)

curl -s http://localhost:5055/api/campaigns | jq 'length'
# Expected: number ≥ 0

# 5. Verify migrations 52–56 applied
.venv/bin/python -c "
import asyncio
from open_notebook.database.repository import repo_query
for table in ['task', 'campaign', 'task_relation']:
    r = asyncio.run(repo_query(f'INFO FOR TABLE {table}'))
    print(f'{table}: OK' if r else f'{table}: MISSING')
"

# 6. Git status
git status --short
# Expected: empty

# 7. Manual page verification
# /tasks → page loads with kanban board
# /campaigns → page loads with 3-phase layout
# /operations → DeliveryTree visible as persistent left panel
# /pipeline (sales tab) → revenue forecast bar visible above kanban
# Home page (research perspective) → TodayDigest widget visible
```

### Expected Outputs

| Check | Expected |
|-------|----------|
| pytest | 0 failed |
| tsc | 0 errors |
| docker compose ps | all healthy |
| /api/tasks | HTTP 200, array |
| /api/campaigns | HTTP 200, array |
| Migrations 52–56 | all tables exist |
| /tasks page | loads, shows kanban |
| /campaigns page | loads, shows 3 phases |

### User Decision

Present results. User must say **"proceed to Path C re-assessment (C0)"** or **"fix [issue] first"**.

---

## Gate C0 — Re-Assessment Complete

**When**: After the C0 re-assessment agent has run and produced `C0-REASSESSMENT.md`.  
**Who approves**: USER.  
**What to present**: The re-assessment report with PROCEED / DEFER / CANCEL for each C item.

### Re-Assessment Report Location

```
open_notebook/update_v4_plan/C0-REASSESSMENT.md
```

The C0 agent produces this report. USER reads it and decides which Path C items to include.

### User Decision

User must explicitly list which Path C items to include:
- Example: "Proceed with C1 (Tiptap), C4 (entity_link), C7 (AI co-pilot). Cancel C6 (relations graph). Defer C8 (notifications) to a future sprint."

No work begins until this list is approved.

---

## Gate C10 — Path C Complete

**When**: After all approved Path C items are done.  
**Who approves**: USER.  
**What to present**: Full regression test results, Lighthouse performance audit, Docker build.

### Verification Commands

```bash
# 1. Full test suite including E2E
.venv/bin/pytest tests/ -q --run-e2e 2>&1 | tail -20
# Expected: 0 failed

# 2. TypeScript
cd frontend && npx tsc --noEmit

# 3. Docker build
docker compose up -d --build

# 4. Performance audit (Lighthouse via Chrome DevTools MCP)
# Target: LCP < 2.5s, CLS < 0.1, INP < 200ms on all main pages

# 5. Git status
git status --short
# Expected: empty

# 6. Final memory store
npx -y ruflo@latest memory store \
  --namespace decision-log \
  --key "tetrel_v4_complete_$(date +%Y%m%d)" \
  --value "All three paths A+B+C complete. Tiptap editor (C1), entity linking (C4), notifications (C5+C8), AI copilot (C7). All tests passing."
```

---

## Emergency Rollback Procedures

### Roll back a migration

```bash
# Find the down migration
ls open_notebook/database/migrations/*_down.surrealql

# Apply via SurrealDB (using existing migration manager)
.venv/bin/python -c "
import asyncio
from open_notebook.database.async_migrate import AsyncMigrationManager
mgr = AsyncMigrationManager()
asyncio.run(mgr.rollback(target_version=50))  # rolls back to version 50
"
```

### Roll back a frontend change

```bash
git log --oneline -20  # find the commit before the change
git revert HEAD~1      # revert last commit without losing history
```

### Emergency kill a failing migration

```bash
# Connect directly to SurrealDB
docker exec -it notebook_tetrel-surrealdb-1 surreal sql --ns open_notebook --db open_notebook
# Then run the down migration SQL manually
```

---

## Karpathy Rules Enforcement Summary

| Rule | Enforced At | How |
|------|-------------|-----|
| P1 Simple | Every task | "Follow existing pattern exactly" instruction in each task |
| P3 TDD | Every task | Write test first, then implement |
| P4 No faking | Gate A8 | Verify SocialBuilder calls real API (network tab check) |
| P7 No drift | Every commit | Conventional commit messages required; docs updated atomically |
| P8 Docker | Gates B14, C10 | `docker compose up -d --build` must succeed |

---

## Files Written (complete plan)

```
open_notebook/update_v4_plan/
├── 00-PATH-C-MUTUAL-EXCLUSIVITY.md   ✅ Checkpoint 1: Option analysis
├── 01-OPTION-C-BRAINSTORM.md          ✅ Multi-agent brainstorm (REJECT C)
├── 01-ORCHESTRATION.md                ✅ Master dependency graph + ICE table
├── 02-PATH-A-PLAN.md                  ✅ 7 tasks, full specs, citations
├── 03-PATH-B-PLAN.md                  ✅ 13 tasks, migrations, APIs
├── 04-PATH-C-PLAN.md                  ✅ Intent plan (pending C0)
├── 05-MIGRATIONS.md                   ✅ All SQL for migrations 51–58
├── 06-API-CONTRACTS.md                ✅ All endpoints + Pydantic models
├── 07-FRONTEND-SPECS.md               ✅ All components + TypeScript types
├── 08-AGENT-PROMPTS.md                ✅ Self-contained agent execution prompts
├── 09-REVIEW-GATES.md                 ✅ This file
└── v4_implementation_plan_raw.md      ← Your working notes (unchanged)
```
