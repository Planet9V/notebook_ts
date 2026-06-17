# Agent Execution Prompts

> Self-contained prompts for future agent execution sessions.  
> Each prompt is designed to be copy-pasted as the first message to a new agent.  
> Each prompt contains all required context; no memory of prior sessions needed.

---

## AGENT-PROMPT-A: Execute Path A Tasks

```
You are a senior full-stack engineer executing Path A of the Tetrel v4 upgrade plan.

CONTEXT:
- Repository: /Users/jimmcknney/notebook_tetrel
- Branch: feat/unified-researcher-social-creator (or create a new feat/path-a branch)
- Stack: Python 3.12, FastAPI, SurrealDB v2, Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Tests: .venv/bin/pytest tests/ -q (must pass before each commit)
- TypeScript: cd frontend && npx tsc --noEmit (must be 0 errors before each commit)
- Karpathy rules: P1 simple, P3 TDD, P4 no faking, P7 no drift, P8 Docker portable

YOUR TASKS (in order):

1. MIGRATION 51 — Add content_format field to note table
   File to create: open_notebook/database/migrations/51.surrealql
   File to create: open_notebook/database/migrations/51_down.surrealql
   File to modify: open_notebook/database/async_migrate.py (register migration 51)
   Test to write first: tests/test_migration_51.py (see 02-PATH-A-PLAN.md for exact test code)
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a1

2. COMMANDPALETTE — Add Contacts, Sources, Projects groups
   File to modify: frontend/src/components/common/CommandPalette.tsx
   Pattern: follow existing Notebooks and Customers groups exactly
   Hooks to add: useContacts, useSources, useProjects (check if hooks exist first)
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a2

3. CUSTOMER BENTO LINK — Add "Bento Overview" button to customer detail page
   File to modify: frontend/src/app/(dashboard)/customers/[id]/page.tsx
   Add button to header action area: href="/customers/{id}/bento"
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a3

4. SOCIAL BUILDER — Replace setTimeout fake with real LLM API call
   File to modify: frontend/src/app/(dashboard)/media/page.tsx
   Check if endpoint exists first: grep -n "run.inline" api/routers/transformations.py
   If endpoint missing: add to api/routers/transformations.py (see 06-API-CONTRACTS.md)
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a4

5. RESEARCH AUTO-NOTE — Create note in notebook when research completes
   File to modify: open_notebook/domain/scheduled_search_worker.py
   Add note creation after source.relate("reference", notebook_id) on line 186
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a5

6. ACTIVITY FEED — Wire ActivityTimeline to Customer pages
   File to create: frontend/src/components/activities/ActivityTimeline.tsx
   File to create: frontend/src/lib/hooks/use-activities.ts
   File to modify: frontend/src/app/(dashboard)/customers/[id]/page.tsx (use the component)
   File to modify: api/routers/notebooks.py (emit activity on stage change)
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a6

7. DELIVERY TREE ON PIPELINE — Add DeliveryTree to Pipeline projects tab
   File to modify: frontend/src/app/(dashboard)/pipeline/page.tsx
   Component already exists: frontend/src/components/delivery/DeliveryTree.tsx
   Full spec: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a7

AFTER EACH TASK:
- Run: .venv/bin/pytest tests/ -q (0 failures required)
- Run: cd frontend && npx tsc --noEmit (0 errors required)
- Commit with conventional commit message

GATE A8 (after all tasks):
- Run: git status --short (must be empty)
- Run: graphify update .
- Report to user with all test results

DO NOT start Path B until user explicitly approves.
Full plan context at: open_notebook/update_v4_plan/
```

---

## AGENT-PROMPT-B: Execute Path B Tasks

```
You are a senior full-stack engineer executing Path B of the Tetrel v4 upgrade plan.

PREREQUISITE: Path A Gate A8 must be approved by the user before you start.

CONTEXT:
- Repository: /Users/jimmcknney/notebook_tetrel
- Stack: Python 3.12, FastAPI, SurrealDB v2, Next.js 16, React 19, TypeScript
- Current migration count: verify with: ls open_notebook/database/migrations/*.surrealql | grep -v down | wc -l
  → Should be 51 after Path A. Path B adds migrations 52–56.
- Karpathy rules enforced throughout.

READ FIRST:
- open_notebook/update_v4_plan/03-PATH-B-PLAN.md (detailed specs)
- open_notebook/update_v4_plan/05-MIGRATIONS.md (all migration SQL)
- open_notebook/update_v4_plan/06-API-CONTRACTS.md (task + campaign API specs)
- open_notebook/update_v4_plan/07-FRONTEND-SPECS.md (component specs)

YOUR TASKS (in strict dependency order):

PHASE B-SCHEMA (do first, in order):
1. Migration 52: task table (no dependencies)
2. Migration 53: campaign table (no dependencies)
3. Migration 54: user table SCHEMAFULL (no dependencies)
4. Migration 55: task_relation RELATION (depends on migration 52)
5. Migration 56: assigned_to_user FK on project + notebook (depends on migration 54)
6. Run project.tasks → task table data migration script: python scripts/migrate_project_tasks_to_table.py

PHASE B-DOMAIN (after schema):
7. Create open_notebook/domain/task.py (full domain model with get_by_project, get_board, etc.)
8. Create open_notebook/domain/campaign.py (basic CRUD domain model)
9. Modify open_notebook/domain/project.py: deprecate embedded tasks field, add get_tasks() method

PHASE B-API (after domain):
10. Create api/routers/tasks.py (full CRUD + board + my endpoints)
11. Create api/routers/campaigns.py (CRUD endpoints)
12. Modify api/main.py: register tasks and campaigns routers
13. Modify api/routers/notebooks.py: emit activity on stage change

PHASE B-FRONTEND (after API):
14. Create frontend/src/types/index.ts additions: Task, Campaign, Activity types
15. Create frontend/src/lib/hooks/use-tasks.ts
16. Create frontend/src/lib/hooks/use-campaigns.ts
17. Create frontend/src/components/tasks/TaskCard.tsx
18. Create frontend/src/app/(dashboard)/tasks/page.tsx (3-tab board)
19. Create frontend/src/app/(dashboard)/campaigns/page.tsx (3-phase workflow)
20. Create frontend/src/components/dashboard/TodayDigest.tsx
21. Modify frontend/src/components/layout/AppSidebar.tsx: add Tasks + Campaigns nav links
22. Modify frontend/src/app/(dashboard)/operations/page.tsx: DeliveryTree persistent left panel
23. Modify frontend/src/app/(dashboard)/pipeline/components/KanbanBoard.tsx: RevenueBar component
24. Modify frontend/src/app/(dashboard)/page.tsx: add TodayDigest to research perspective

PHASE B-RBAC (after all above):
25. Modify api/auth.py: add require_role() dependency
26. Apply require_role("admin") to DELETE endpoints in: customers, projects, contacts routers
27. Apply require_role("editor") to POST/PUT on campaigns and tasks

GATE B14:
- .venv/bin/pytest tests/ -q → 0 failures
- cd frontend && npx tsc --noEmit → 0 errors
- docker compose up -d --build open_notebook → services healthy
- git status --short → empty
- graphify update .
- Report to user

DO NOT start Path C until user explicitly approves AND runs C0 re-assessment.
```

---

## AGENT-PROMPT-C0: Path C Re-Assessment

```
You are a senior architect conducting the mandatory C0 re-assessment before Path C begins.

CONTEXT:
- Repository: /Users/jimmcknney/notebook_tetrel
- Path A and Path B are complete. Gate B14 was approved.
- Your job: assess the actual codebase state and re-scope Path C.

TASKS:
1. Run: graphify update . && graphify query "What are the main entities and their relationships?" --budget 3000
2. Run: .venv/bin/pytest tests/ -q (record the baseline test count and pass rate)
3. Take browser screenshots of all main pages using Chrome DevTools MCP
4. Count actual records: query the SurrealDB API for counts of note, task, campaign, notebook, customer
5. Read: open_notebook/update_v4_plan/04-PATH-C-PLAN.md (original Path C intent)
6. Evaluate each Path C item against the actual current state:
   - C1 (Tiptap block editor): Is the current MarkdownEditor still a limitation? How many notes exist?
   - C6 (Relations graph): Are users creating relationships that need visualization?
   - C7 (AI co-pilot): Is the current chat insufficient? What's the usage pattern?
   - C8 (Notifications): Is @mention being used informally? Is multi-user active?
7. Produce a written re-assessment report: open_notebook/update_v4_plan/C0-REASSESSMENT.md

REPORT FORMAT:
For each Path C item: PROCEED | DEFER | CANCEL with rationale based on actual codebase evidence.

DO NOT write any Path C code. Only assess and report. User must approve the re-scoped C plan.
```

---

## AGENT-PROMPT-A4-ONLY: Fix SocialBuilder (Standalone)

```
You are a senior full-stack engineer. One focused task only.

REPOSITORY: /Users/jimmcknney/notebook_tetrel
TASK: Replace the fake setTimeout-based LLM simulation in the Social Builder with a real API call.

EVIDENCE OF THE FAKE (verified):
- File: frontend/src/app/(dashboard)/media/page.tsx, line ~77
- Code: setTimeout(() => { ... hardcoded string templates ... }, 1500)
- Comment in code: "// Simulate LLM agent generation with actual note context"
- This is a Karpathy P4 violation: "No faking."

STEP 1: Check if the inline transformation endpoint exists:
  grep -n "run.inline\|run_inline" api/routers/transformations.py

STEP 2A (if endpoint MISSING): Add to api/routers/transformations.py:
  See exact code at: open_notebook/update_v4_plan/06-API-CONTRACTS.md#post-apitransformationsrun-inline

STEP 2B (if endpoint EXISTS): Skip Step 2A.

STEP 3: Replace the handleGenerate function in media/page.tsx:
  See exact replacement code at: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#task-a4

STEP 4: Write failing test first:
  tests/test_social_builder_api.py
  See test code at: open_notebook/update_v4_plan/02-PATH-A-PLAN.md#test-to-write-first-3

STEP 5: Run .venv/bin/pytest tests/test_social_builder_api.py -v
STEP 6: Implement the fix.
STEP 7: Run .venv/bin/pytest tests/ -q && cd frontend && npx tsc --noEmit
STEP 8: git commit -m "fix(social-builder): replace fake setTimeout with real LLM API call"

DONE. Report results.
```

---

## AGENT-PROMPT-TASK-MIGRATION: Migrate Project.tasks to task Table

```
You are a data engineer executing a one-time data migration.

CONTEXT:
- Migration 52 has been applied (task table exists in SurrealDB)
- Project domain model has tasks: Optional[List[Dict]] embedded JSON blob
- Citation: open_notebook/domain/project.py:63

TASK 1: Create the migration script
  File: scripts/migrate_project_tasks_to_table.py
  See exact code at: open_notebook/update_v4_plan/03-PATH-B-PLAN.md#migration-of-existing-projecttasks-json

TASK 2: Test the script on a single project first (dry run):
  python scripts/migrate_project_tasks_to_table.py --dry-run --project-id "project:test"
  (Add --dry-run flag to the script: print what would be created, don't create)

TASK 3: Run the full migration:
  python scripts/migrate_project_tasks_to_table.py

TASK 4: Verify:
  curl http://localhost:5055/api/tasks | jq 'length'
  # Should be > 0 if any projects had embedded tasks

TASK 5: Modify open_notebook/domain/project.py:
  - Keep tasks field but mark as deprecated: tasks: Optional[List[Dict]] = Field(default_factory=list, deprecated=True)
  - Add get_tasks() method that queries the task table instead of returning self.tasks

TASK 6: Run tests: .venv/bin/pytest tests/ -q

TASK 7: Commit: git commit -m "feat(tasks): migrate embedded project tasks to first-class task table"

DONE. Report results.
```
