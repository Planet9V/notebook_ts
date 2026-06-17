# Tetrel v4 — Master Orchestration Plan

> **Decision locked**: Option A (A → B → C in sequence)  
> **Block editor**: Tiptap (target), implemented in Path C. Architecture locked now.  
> **content_format migration**: Path A, Migration 51 (30 min, no data change).  
> **Karpathy rules**: P1 simple, P3 TDD, P4 no faking, P7 no drift, P8 Docker portable.

---

## Dependency Graph (DAG)

```
Path A (Weeks 1–4) ──────────────────────────────────────────────────┐
  [A1] Migration 51 (content_format field)                           │
  [A2] CommandPalette: add Contacts + Sources + Projects             │ ← depends on A1
  [A3] Customer bento nav link (1 link)                              │
  [A4] SocialBuilder: replace setTimeout with real LLM API call      │
  [A5] Research → Notebook auto-note on completion                   │ ← depends on A1
  [A6] Activity feed wired to Customer + Notebook pages              │
  [A7] DeliveryTree: add to Pipeline page (already in Operations)    │
  [A8] Gate: all tests pass, tsc --noEmit clean, git status empty    │
                                                                     │
Path B (Weeks 5–14) ─────────────────────────────────────────────────┼─ depends on A8
  [B1] Migration 52: task table (first-class)                        │
  [B2] Migration 53: campaign table                                  │
  [B3] Migration 54: user table SCHEMAFULL + username/password_hash  │
  [B4] Migration 55: task_relation (task→notebook, task→customer)    │ ← depends on B1
  [B5] Migration 56: assigned_to FK on project/notebook → user       │ ← depends on B3
  [B6] Task domain model + API router (tasks.py)                     │ ← depends on B1
  [B7] Campaign domain model + API router (campaigns.py)             │ ← depends on B2
  [B8] /tasks page (universal board + "my tasks" filtered view)      │ ← depends on B6
  [B9] /campaigns page (planner: research → content → schedule)      │ ← depends on B7
  [B10] DeliveryTree: make persistent left panel in Operations/Pipe  │ ← depends on B8
  [B11] Revenue forecast view on pipeline/sales tab                  │
  [B12] Researcher "Today" digest widget on home page                │
  [B13] RBAC enforcement (role middleware on delete/write routes)     │ ← depends on B3+B5
  [B14] Gate: all tests pass, tsc --noEmit, Docker build green       │
                                                                     │
Path C (Weeks 15–24) ────────────────────────────────────────────────┼─ depends on B14
  [C0] MANDATORY: Full codebase re-assessment before starting C      │
  [C1] Tiptap installation + BlockEditor component (notes WYSIWYG)   │ ← depends on C0
  [C2] SplitEditor component (prompts split-pane, keeps MD preview)  │ ← depends on C1
  [C3] Note content migration script: markdown → Tiptap JSON where   │
        content_format = 'block' (opt-in, not forced)                │ ← depends on C1+A1
  [C4] Migration 57: entity_link RELATION (any→any graph edges)      │
  [C5] Migration 58: notification table                              │
  [C6] Relations graph panel: visual entity linking UI (xyflow)       │ ← depends on C4
  [C7] AI co-pilot sidebar (persistent, context-aware)               │
  [C8] Notification system (@mention in notes → user alerts)         │ ← depends on C5+B3
  [C9] Mobile-responsive audit + PWA manifest                        │
  [C10] Gate: full regression suite, performance audit, Docker build │
```

---

## ICE Priority Table (verified, citations from codebase)

| ID | Feature | ICE | Path | Citation |
|----|---------|-----|------|---------|
| A3 | Customer bento nav link | **500** | A | Zero links to `/customers/[id]/bento` found in codebase |
| A2 | CommandPalette: contacts/sources/projects | **648** | A | `CommandPalette.tsx` mounted in layout; missing contact/source/project groups |
| A4 | SocialBuilder real LLM | **504** | A | `media/page.tsx:77` — `setTimeout` confirmed fake |
| A5 | Research→Notebook auto-note | **576** | A | `scheduled_search_worker.py:186` already relates sources; note creation missing |
| A6 | Activity feed wired to UI | **448** | A | `activities.py` router complete; frontend has no ActivityTimeline component |
| A7 | DeliveryTree on Pipeline page | **576** | A | Used in `operations/page.tsx:484` and `customers/[id]/page.tsx:696`; missing from `/pipeline` |
| B1 | Task table (Migration 52) | **567** | B | No `task` table in all 50 migrations |
| B2 | Campaign table (Migration 53) | **336** | B | No `campaign` table anywhere |
| B3 | User table SCHEMAFULL | **432** | B | `user` table exists SCHEMALESS via migration 48; needs schema + auth fields |
| B8 | /tasks page | **432** | B | Depends on B1+B6 |
| B13 | RBAC enforcement | **189** | B | `user.role` field exists; no middleware reads it |
| C1 | Tiptap block editor | **350** | C | Depends on C0 re-assessment |
| C7 | AI co-pilot sidebar | **400** | C | High value; deferred to C because depends on all entities existing |

---

## Execution Protocol

Each task in each path follows this protocol:

```
1. Read current state of relevant file(s)
2. Write failing test (Karpathy P3)
3. Implement minimal change to make test pass (P1 — simple)
4. Verify: pytest -q (no failures), npx tsc --noEmit (0 errors)
5. Commit atomic change with conventional commit message
6. Update progress.md
```

No task is "done" until steps 4 and 5 are complete.

---

## Review Gates (Mandatory Stops)

| Gate | Condition | Who Approves |
|------|-----------|-------------|
| A8 | Path A complete: all tests pass, tsc clean, git status empty | USER |
| B14 | Path B complete: all tests pass, Docker build green | USER |
| C0 | Full re-assessment of A+B-completed codebase before any Path C work | USER |
| C10 | Path C complete: full regression, perf audit, Docker build | USER |

---

## File Map

```
open_notebook/update_v4_plan/
├── 00-PATH-C-MUTUAL-EXCLUSIVITY.md   ✅ written
├── 01-OPTION-C-BRAINSTORM.md         ✅ written
├── 02-ORCHESTRATION.md               ← this file
├── 03-PATH-A-PLAN.md                 ← next
├── 04-PATH-B-PLAN.md
├── 05-PATH-C-PLAN.md
├── 06-MIGRATIONS.md
├── 07-API-CONTRACTS.md
├── 08-FRONTEND-SPECS.md
├── 09-AGENT-PROMPTS.md
└── 10-REVIEW-GATES.md
```
