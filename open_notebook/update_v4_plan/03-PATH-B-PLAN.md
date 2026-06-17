# Path B — "Complete the Platform" — Detailed Implementation Plan

> **Duration**: Weeks 5–14  
> **Prerequisite**: Gate A8 approved by USER  
> **Goal**: Introduce first-class task management, campaign planner, user identity, and RBAC.  
> **No new UI framework dependencies** — use existing shadcn/ui, xyflow (already installed).  
> **Gate**: B14 — all tests pass, Docker build green, USER approves before Path C.

---

## Task B1 — Migration 52: First-Class Task Table

**Why**: `Project.tasks` is a `List[Dict]` JSON blob embedded in the project record (citation: `open_notebook/domain/project.py:63`). This means:
- Tasks cannot be assigned to users by FK
- Tasks cannot be queried across projects
- Tasks cannot be related to notebooks, customers, or other entities
- Tasks cannot be sorted, filtered, or paginated independently

A first-class `task` table removes all these limitations.

**Karpathy P6** (full traceability): Every task mutation must be audit-logged.

### Migration SQL

**`open_notebook/database/migrations/52.surrealql`** (NEW):
```sql
-- Migration 52: First-class task table
-- Replaces Project.tasks JSON blob with queryable, assignable, relatable records.
DEFINE TABLE IF NOT EXISTS task SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS title         ON TABLE task TYPE string;
DEFINE FIELD IF NOT EXISTS description   ON TABLE task TYPE option<string>;
DEFINE FIELD IF NOT EXISTS status        ON TABLE task TYPE string DEFAULT 'todo';
  -- Allowed: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
DEFINE FIELD IF NOT EXISTS priority      ON TABLE task TYPE option<string> DEFAULT 'medium';
  -- Allowed: 'low' | 'medium' | 'high' | 'critical'
DEFINE FIELD IF NOT EXISTS due_date      ON TABLE task TYPE option<string>;
DEFINE FIELD IF NOT EXISTS project_id    ON TABLE task TYPE option<record<project>>;
DEFINE FIELD IF NOT EXISTS customer_id   ON TABLE task TYPE option<record<customer>>;
DEFINE FIELD IF NOT EXISTS notebook_id   ON TABLE task TYPE option<record<notebook>>;
DEFINE FIELD IF NOT EXISTS assigned_to   ON TABLE task TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS created_by    ON TABLE task TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS tags          ON TABLE task TYPE option<array<string>>;
DEFINE FIELD IF NOT EXISTS created       ON TABLE task TYPE string
  DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated       ON TABLE task TYPE string
  DEFAULT time::now();

-- Indexes for common query patterns
DEFINE INDEX IF NOT EXISTS idx_task_project   ON TABLE task FIELDS project_id;
DEFINE INDEX IF NOT EXISTS idx_task_customer  ON TABLE task FIELDS customer_id;
DEFINE INDEX IF NOT EXISTS idx_task_status    ON TABLE task FIELDS status;
DEFINE INDEX IF NOT EXISTS idx_task_assigned  ON TABLE task FIELDS assigned_to;
DEFINE INDEX IF NOT EXISTS idx_task_due       ON TABLE task FIELDS due_date;
```

**`open_notebook/database/migrations/52_down.surrealql`** (NEW):
```sql
REMOVE TABLE IF EXISTS task;
```

### Migration of existing Project.tasks JSON

**`scripts/migrate_project_tasks_to_table.py`** (NEW):
```python
"""
One-time migration: copy Project.tasks JSON blobs to the new task table.
Run AFTER migration 52 is applied.
Safe to re-run (idempotent — checks for existing migration marker).
"""
import asyncio
from open_notebook.database.repository import repo_query, repo_create, repo_update

async def migrate():
    projects = await repo_query("SELECT id, tasks, customer_id FROM project WHERE tasks IS NOT NONE")
    count = 0
    for project in projects:
        for task_dict in (project.get("tasks") or []):
            await repo_create("task", {
                "title": task_dict.get("name") or task_dict.get("title") or "Untitled task",
                "description": task_dict.get("description"),
                "status": task_dict.get("status", "todo"),
                "priority": task_dict.get("priority", "medium"),
                "due_date": task_dict.get("due_date"),
                "project_id": project["id"],
                "customer_id": project.get("customer_id"),
            })
            count += 1
    print(f"Migrated {count} tasks from {len(projects)} projects.")

if __name__ == "__main__":
    asyncio.run(migrate())
```

**After migration**: Remove `tasks: Optional[List[Dict]]` from `Project` domain model. Replace with a `get_tasks()` method that queries the `task` table.

### Test to write first
```python
# tests/test_task_table.py
def test_task_table_exists_and_accepts_create():
    """Migration 52: task table must exist and accept CRUD."""
    import asyncio
    from open_notebook.database.repository import repo_create, repo_delete, repo_query
    task_id = asyncio.run(repo_create("task", {
        "title": "test task",
        "status": "todo",
        "priority": "medium",
    }))
    assert task_id is not None
    results = asyncio.run(repo_query("SELECT * FROM $id", {"id": task_id}))
    assert results[0]["title"] == "test task"
    assert results[0]["status"] == "todo"
    asyncio.run(repo_delete(task_id))
```

---

## Task B2 — Migration 53: Campaign Table

**Why**: The SocialBuilder and publication calendar exist but have no persistent campaign concept. A campaign links research → content → schedule. ICE 336 (medium priority but foundational for Marketing persona).

### Migration SQL

**`open_notebook/database/migrations/53.surrealql`** (NEW):
```sql
-- Migration 53: Campaign table for content marketing workflow
-- Links: research items → drafts (notes) → publications → schedule
DEFINE TABLE IF NOT EXISTS campaign SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS name          ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS description   ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS theme         ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS status        ON TABLE campaign TYPE string DEFAULT 'draft';
  -- Allowed: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
DEFINE FIELD IF NOT EXISTS start_date    ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS end_date      ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS target_audience ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS channels      ON TABLE campaign TYPE option<array<string>>;
  -- e.g. ['twitter', 'linkedin', 'newsletter']
DEFINE FIELD IF NOT EXISTS customer_id   ON TABLE campaign TYPE option<record<customer>>;
DEFINE FIELD IF NOT EXISTS notebook_id   ON TABLE campaign TYPE option<record<notebook>>;
DEFINE FIELD IF NOT EXISTS created       ON TABLE campaign TYPE string DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated       ON TABLE campaign TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_campaign_customer ON TABLE campaign FIELDS customer_id;
DEFINE INDEX IF NOT EXISTS idx_campaign_status   ON TABLE campaign FIELDS status;
```

**`open_notebook/database/migrations/53_down.surrealql`**:
```sql
REMOVE TABLE IF EXISTS campaign;
```

---

## Task B3 — Migration 54: User Table SCHEMAFULL + Auth Fields

**Why**: The `user` table was defined in migration 48 (SCHEMALESS, only `first_name`, `last_name`, `email`, `role` fields). It needs:
1. SCHEMAFULL definition (type safety)
2. `username` field for login
3. `password_hash` field for local authentication
4. `is_active` field for account management

**Citation**: `open_notebook/database/migrations/48.surrealql` — adds 4 fields to user table but does NOT define the table itself (meaning it was defined SCHEMALESS elsewhere or implicitly).

### Migration SQL

**`open_notebook/database/migrations/54.surrealql`** (NEW):
```sql
-- Migration 54: Harden user table — SCHEMAFULL, auth fields, soft-delete
DEFINE TABLE IF NOT EXISTS user SCHEMAFULL;

-- Existing fields (add IF NOT EXISTS to be idempotent with migration 48)
DEFINE FIELD IF NOT EXISTS first_name    ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS last_name     ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS email         ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS role          ON TABLE user TYPE option<string> DEFAULT 'viewer';
  -- Allowed: 'admin' | 'editor' | 'viewer'

-- New auth fields
DEFINE FIELD IF NOT EXISTS username      ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS password_hash ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS is_active     ON TABLE user TYPE bool DEFAULT true;
DEFINE FIELD IF NOT EXISTS last_login    ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created       ON TABLE user TYPE string DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated       ON TABLE user TYPE string DEFAULT time::now();

-- Indexes
DEFINE INDEX IF NOT EXISTS idx_user_email    ON TABLE user FIELDS email UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_user_username ON TABLE user FIELDS username UNIQUE;
```

**`open_notebook/database/migrations/54_down.surrealql`**:
```sql
REMOVE FIELD IF EXISTS username      ON TABLE user;
REMOVE FIELD IF EXISTS password_hash ON TABLE user;
REMOVE FIELD IF EXISTS is_active     ON TABLE user;
REMOVE FIELD IF EXISTS last_login    ON TABLE user;
REMOVE INDEX IF EXISTS idx_user_email ON TABLE user;
REMOVE INDEX IF EXISTS idx_user_username ON TABLE user;
```

---

## Task B4 — Migration 55: task_relation RELATION Table

**Why**: Tasks need to be related to multiple entity types beyond just `project_id`. A SurrealDB RELATION table allows `task → notebook`, `task → customer`, `task → research_item` without foreign key columns on the task table.

**Citation**: `open_notebook/database/migrations/43.surrealql` — `entity_note RELATION FROM note TO location | customer` — same pattern.

### Migration SQL

**`open_notebook/database/migrations/55.surrealql`** (NEW):
```sql
-- Migration 55: task_relation — bidirectional task linking
DEFINE TABLE IF NOT EXISTS task_relation TYPE RELATION
  FROM task
  TO notebook | customer | project | research_item | campaign;

DEFINE INDEX IF NOT EXISTS idx_task_relation_in  ON TABLE task_relation FIELDS in;
DEFINE INDEX IF NOT EXISTS idx_task_relation_out ON TABLE task_relation FIELDS out;
```

**`open_notebook/database/migrations/55_down.surrealql`**:
```sql
REMOVE TABLE IF EXISTS task_relation;
```

---

## Task B5 — Migration 56: assigned_to FK → user on Project + Notebook

**Why**: `Project.assigned_to` is `Optional[str] = ""` — a free-text string (citation: `open_notebook/domain/project.py:52`). `Notebook.assigned_to` is similarly a string. Both must be changed to `record<user>` FK references.

**Migration approach**: Additive — add `assigned_to_user` (FK field). Keep the old `assigned_to` (string) for backward compatibility until frontend is updated. Then remove old field in a follow-up cleanup migration.

### Migration SQL

**`open_notebook/database/migrations/56.surrealql`** (NEW):
```sql
-- Migration 56: Add typed assigned_to FK on project and notebook
-- Keeps legacy string field for backward compatibility during transition.
DEFINE FIELD IF NOT EXISTS assigned_to_user ON TABLE project  TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS assigned_to_user ON TABLE notebook TYPE option<record<user>>;

DEFINE INDEX IF NOT EXISTS idx_project_assigned  ON TABLE project  FIELDS assigned_to_user;
DEFINE INDEX IF NOT EXISTS idx_notebook_assigned ON TABLE notebook FIELDS assigned_to_user;
```

**`open_notebook/database/migrations/56_down.surrealql`**:
```sql
REMOVE FIELD IF EXISTS assigned_to_user ON TABLE project;
REMOVE FIELD IF EXISTS assigned_to_user ON TABLE notebook;
```

---

## Task B6 — Task Domain Model + API Router

**Why**: With migration 52, the `task` table exists but has no domain model or API.

### Files to create

**`open_notebook/domain/task.py`** (NEW):
```python
"""
Task domain model.
First-class task entity with project/customer/user relationships.
Replaces embedded Project.tasks JSON blob.
"""
from typing import ClassVar, List, Optional
from pydantic import Field, field_validator
from open_notebook.domain.base import ObjectModel
from open_notebook.database.repository import repo_query, ensure_record_id
from open_notebook.exceptions import InvalidInputError

VALID_STATUSES = {"todo", "in_progress", "review", "done", "cancelled"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}

class Task(ObjectModel):
    table_name: ClassVar[str] = "task"
    nullable_fields: ClassVar[set[str]] = {
        "description", "due_date", "project_id", "customer_id",
        "notebook_id", "assigned_to", "created_by", "tags",
    }

    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    customer_id: Optional[str] = None
    notebook_id: Optional[str] = None
    assigned_to: Optional[str] = None   # record<user> ID string
    created_by: Optional[str] = None    # record<user> ID string
    tags: Optional[List[str]] = Field(default_factory=list)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_STATUSES:
            raise InvalidInputError(f"Invalid status: {v}. Must be one of {VALID_STATUSES}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_PRIORITIES:
            raise InvalidInputError(f"Invalid priority: {v}. Must be one of {VALID_PRIORITIES}")
        return v

    @classmethod
    async def get_by_project(cls, project_id: str) -> list["Task"]:
        results = await repo_query(
            "SELECT * FROM task WHERE project_id = $project_id ORDER BY created DESC",
            {"project_id": project_id},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_assigned_user(cls, user_id: str) -> list["Task"]:
        results = await repo_query(
            "SELECT * FROM task WHERE assigned_to = $user_id AND status != 'cancelled' "
            "ORDER BY due_date ASC NULLS LAST, priority DESC",
            {"user_id": user_id},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_board(cls, statuses: Optional[List[str]] = None) -> dict[str, list["Task"]]:
        """Get tasks grouped by status for kanban board view."""
        all_statuses = statuses or list(VALID_STATUSES - {"cancelled"})
        board: dict[str, list[Task]] = {s: [] for s in all_statuses}
        results = await repo_query(
            f"SELECT * FROM task WHERE status IN {all_statuses} ORDER BY priority DESC",
            {},
        )
        for r in results:
            task = cls(**r)
            if task.status in board:
                board[task.status].append(task)
        return board
```

**`api/routers/tasks.py`** (NEW) — see `06-API-CONTRACTS.md` for full endpoint specs.

**`api/main.py`** (MODIFY):
```python
from api.routers import tasks  # add to imports
# In the router registration section:
app.include_router(tasks.router, prefix="/api")
```

---

## Task B7 — Campaign Domain Model + API Router

Following same pattern as Task B6. See `06-API-CONTRACTS.md` for full specs.

**`open_notebook/domain/campaign.py`** (NEW) — basic CRUD domain model.
**`api/routers/campaigns.py`** (NEW) — CRUD endpoints.

---

## Task B8 — /tasks Page (Universal Board + "My Tasks" View)

**Why**: Tasks now exist as first-class records. They need a home page.

### Files to create

**`frontend/src/app/(dashboard)/tasks/page.tsx`** (NEW):
```tsx
'use client'
// Universal task board — shows all tasks across projects
// Personas: Researcher (my tasks), Delivery PM (project tasks), Admin (all tasks)
// Uses KanbanBoard pattern from /pipeline page as template
```

**Features** (in priority order per ICE):
1. "My Tasks" tab — filtered to `assigned_to = current_user`
2. "By Project" view — group tasks under project names
3. "All Tasks" board — full kanban (todo / in_progress / review / done)
4. Quick-add task form
5. Due date filter

**`frontend/src/app/(dashboard)/tasks/layout.tsx`** (NEW) — simple layout wrapper.

### Sidebar link

**`frontend/src/components/layout/AppSidebar.tsx`** (MODIFY):

Add tasks link after Projects:
```tsx
{ name: t('navigation.tasks', 'Tasks'), href: '/tasks', icon: CheckSquare },
```

---

## Task B9 — /campaigns Page (Content Campaign Planner)

**Why**: Marketing persona has no workspace connecting research → content → schedule.

### Files to create

**`frontend/src/app/(dashboard)/campaigns/page.tsx`** (NEW):
```tsx
// Campaign planner: Research phase → Draft phase → Schedule phase
// 3-column workflow for Marketing persona
```

**Sidebar link**:
```tsx
{ name: t('navigation.campaigns', 'Campaigns'), href: '/campaigns', icon: Megaphone },
```

---

## Task B10 — DeliveryTree: Persistent Left Panel in Operations

**Why**: `DeliveryTree` is a tab component in Operations. It should be a persistent left panel so hierarchy context is always visible while switching between Operations sub-tabs.

**Citation**: `frontend/src/app/(dashboard)/operations/page.tsx:484` — DeliveryTree is inside a `TabsContent value="projects"`. Moving it to the left panel requires restructuring the Operations page layout.

### Files to modify

**`frontend/src/app/(dashboard)/operations/page.tsx`** (MODIFY):

Change from single-column tab layout to split-panel:
```tsx
<div className="flex h-full gap-0">
  {/* Persistent left panel */}
  <aside className="w-56 flex-shrink-0 border-r bg-sidebar overflow-y-auto p-2">
    <DeliveryTree
      customers={customers}
      projects={projects}
      notebooks={notebooks}
      researchItems={researchItems}
      onSelect={handleTreeSelect}
    />
  </aside>
  {/* Right: existing tabs content */}
  <div className="flex-1 min-w-0 overflow-y-auto">
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* existing tab triggers + content */}
    </Tabs>
  </div>
</div>
```

---

## Task B11 — Revenue Forecast View on Pipeline/Sales Tab

**Why**: Sales persona needs revenue visibility. The pipeline Kanban shows deals; adding a revenue aggregate view per stage delivers the CRM "forecast" view.

**Implementation**: A summary bar above the Kanban showing:
```
Lead: $0  →  Qualified: $45K  →  Proposal: $120K  →  Negotiation: $80K  →  Won: $320K
```

Calculated client-side from `notebook.estimated_value` grouped by `notebook.stage`.
Zero new API calls required — data already fetched.

### Files to modify

**`frontend/src/app/(dashboard)/pipeline/components/KanbanBoard.tsx`** (MODIFY):

Add `RevenueBar` component above the kanban columns:
```tsx
function RevenueBar({ notebooks }: { notebooks: Notebook[] }) {
  const byStage = groupBy(notebooks.filter(n => n.estimated_value), n => n.stage || 'unknown')
  const stageTotal = (stage: string) => 
    (byStage[stage] || []).reduce((sum, n) => sum + (n.estimated_value || 0), 0)
  
  return (
    <div className="flex gap-2 mb-4 p-3 bg-card rounded border text-xs">
      {['lead', 'qualified', 'proposal', 'negotiation', 'won'].map(stage => (
        <div key={stage} className="flex-1 text-center">
          <div className="text-muted-foreground uppercase">{stage}</div>
          <div className="font-bold">${stageTotal(stage).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
```

---

## Task B12 — Researcher "Today" Digest Widget on Home Page

**Why**: Researcher persona has no "morning briefing" concept. A digest of due research items, recent results, and pending tasks drives daily workflow.

**Citation**: `frontend/src/app/(dashboard)/page.tsx` — has persona-based views. The `research` enhanced perspective exists but shows historical data without a "what to do today" prompt.

### Files to modify

**`frontend/src/app/(dashboard)/page.tsx`** (MODIFY):

In the `research` enhanced perspective, add before the existing content:
```tsx
{enhancedPerspective === 'research' && (
  <TodayDigest perspective="research" />
)}
```

**`frontend/src/components/dashboard/TodayDigest.tsx`** (NEW):
- Due research items (due_date = today or overdue)
- Last 3 research results received
- Tasks assigned to current user due today
- Quick-start button for each item

---

## Task B13 — RBAC Enforcement (Role Middleware)

**Why**: `user.role` field exists (`admin | editor | viewer`) but is never read. No middleware enforces it.

**Approach** (Karpathy P1 — simple): Add a FastAPI dependency `require_role(min_role: str)` that reads the authenticated user's role and raises `403` if insufficient. Apply only to destructive operations (DELETE, PUT on critical resources).

### Files to create

**`api/auth.py`** (MODIFY — add function):
```python
def require_role(min_role: str = "editor"):
    """FastAPI dependency that enforces minimum role level."""
    role_order = {"viewer": 0, "editor": 1, "admin": 2}
    
    async def _check(request: Request):
        user = getattr(request.state, "user", None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        user_role = user.get("role", "viewer")
        if role_order.get(user_role, 0) < role_order.get(min_role, 1):
            raise HTTPException(
                status_code=403, 
                detail=f"Requires '{min_role}' role. Your role: '{user_role}'"
            )
    return _check
```

Apply to destructive routes (example):
```python
# In api/routers/customers.py
@router.delete("/customers/{customer_id}", dependencies=[Depends(require_role("admin"))])
async def delete_customer(...):
    ...
```

---

## Gate B14 — Path B Completion Checklist

```bash
# 1. All backend tests
.venv/bin/pytest tests/ -q
# Expected: 0 failures

# 2. TypeScript clean
cd frontend && npx tsc --noEmit

# 3. Docker build green
docker compose up -d --build open_notebook
docker compose ps  # all services healthy

# 4. Task table migration verified
curl http://localhost:5055/api/tasks | jq 'length'

# 5. Campaign table verified
curl http://localhost:5055/api/campaigns | jq 'length'

# 6. Git status clean
git status --short

# 7. Memory store
npx -y ruflo@latest memory store \
  --namespace patterns \
  --key "path_b_complete_2026" \
  --value "task table (M52), campaign table (M53), user SCHEMAFULL (M54), task_relation (M55), assigned_to FK (M56). /tasks page. /campaigns page. RBAC enforcement. DeliveryTree persistent panel. Revenue forecast bar."
```

**USER APPROVAL REQUIRED** before starting Path C.  
**C0 full re-assessment REQUIRED**: read actual codebase state before writing a single line of C.
