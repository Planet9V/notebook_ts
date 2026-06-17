# Migrations Reference — Path A, B, C

> All migrations follow SurrealDB v2 schema. Each has a corresponding `_down.surrealql`.  
> Register each in `open_notebook/database/async_migrate.py` after writing the file.  
> Current count: **50 migrations** (verified: `ls migrations/*.surrealql | grep -v down | wc -l` → 50).

---

## Path A Migrations

### Migration 51 — content_format on note table

```sql
-- 51.surrealql
DEFINE FIELD IF NOT EXISTS content_format ON TABLE note
  TYPE option<string>
  DEFAULT 'markdown';
-- Allowed values: 'markdown' | 'block'
-- 'block' = Tiptap JSON (Path C, opt-in conversion only)
```

```sql
-- 51_down.surrealql
REMOVE FIELD IF EXISTS content_format ON TABLE note;
```

**Registration in `async_migrate.py`**:
```python
# Add to the migrations list:
{"version": 51, "up": "51.surrealql", "down": "51_down.surrealql",
 "description": "Add content_format field to note table for Tiptap Path C prep"},
```

---

## Path B Migrations

### Migration 52 — task table

```sql
-- 52.surrealql
DEFINE TABLE IF NOT EXISTS task SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS title         ON TABLE task TYPE string;
DEFINE FIELD IF NOT EXISTS description   ON TABLE task TYPE option<string>;
DEFINE FIELD IF NOT EXISTS status        ON TABLE task TYPE string DEFAULT 'todo';
DEFINE FIELD IF NOT EXISTS priority      ON TABLE task TYPE option<string> DEFAULT 'medium';
DEFINE FIELD IF NOT EXISTS due_date      ON TABLE task TYPE option<string>;
DEFINE FIELD IF NOT EXISTS project_id    ON TABLE task TYPE option<record<project>>;
DEFINE FIELD IF NOT EXISTS customer_id   ON TABLE task TYPE option<record<customer>>;
DEFINE FIELD IF NOT EXISTS notebook_id   ON TABLE task TYPE option<record<notebook>>;
DEFINE FIELD IF NOT EXISTS assigned_to   ON TABLE task TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS created_by    ON TABLE task TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS tags          ON TABLE task TYPE option<array<string>>;
DEFINE FIELD IF NOT EXISTS created       ON TABLE task TYPE string DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated       ON TABLE task TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_task_project   ON TABLE task FIELDS project_id;
DEFINE INDEX IF NOT EXISTS idx_task_customer  ON TABLE task FIELDS customer_id;
DEFINE INDEX IF NOT EXISTS idx_task_status    ON TABLE task FIELDS status;
DEFINE INDEX IF NOT EXISTS idx_task_assigned  ON TABLE task FIELDS assigned_to;
DEFINE INDEX IF NOT EXISTS idx_task_due       ON TABLE task FIELDS due_date;
```

```sql
-- 52_down.surrealql
REMOVE TABLE IF EXISTS task;
```

---

### Migration 53 — campaign table

```sql
-- 53.surrealql
DEFINE TABLE IF NOT EXISTS campaign SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name             ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS description      ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS theme            ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS status           ON TABLE campaign TYPE string DEFAULT 'draft';
DEFINE FIELD IF NOT EXISTS start_date       ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS end_date         ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS target_audience  ON TABLE campaign TYPE option<string>;
DEFINE FIELD IF NOT EXISTS channels         ON TABLE campaign TYPE option<array<string>>;
DEFINE FIELD IF NOT EXISTS customer_id      ON TABLE campaign TYPE option<record<customer>>;
DEFINE FIELD IF NOT EXISTS notebook_id      ON TABLE campaign TYPE option<record<notebook>>;
DEFINE FIELD IF NOT EXISTS created          ON TABLE campaign TYPE string DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated          ON TABLE campaign TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_campaign_customer ON TABLE campaign FIELDS customer_id;
DEFINE INDEX IF NOT EXISTS idx_campaign_status   ON TABLE campaign FIELDS status;
```

```sql
-- 53_down.surrealql
REMOVE TABLE IF EXISTS campaign;
```

---

### Migration 54 — user table SCHEMAFULL

```sql
-- 54.surrealql
DEFINE TABLE IF NOT EXISTS user SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS first_name    ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS last_name     ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS email         ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS role          ON TABLE user TYPE option<string> DEFAULT 'viewer';
DEFINE FIELD IF NOT EXISTS username      ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS password_hash ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS is_active     ON TABLE user TYPE bool DEFAULT true;
DEFINE FIELD IF NOT EXISTS last_login    ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created       ON TABLE user TYPE string DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated       ON TABLE user TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_user_email    ON TABLE user FIELDS email UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_user_username ON TABLE user FIELDS username UNIQUE;
```

```sql
-- 54_down.surrealql
REMOVE FIELD IF EXISTS username      ON TABLE user;
REMOVE FIELD IF EXISTS password_hash ON TABLE user;
REMOVE FIELD IF EXISTS is_active     ON TABLE user;
REMOVE FIELD IF EXISTS last_login    ON TABLE user;
REMOVE INDEX IF EXISTS idx_user_email    ON TABLE user;
REMOVE INDEX IF EXISTS idx_user_username ON TABLE user;
```

---

### Migration 55 — task_relation

```sql
-- 55.surrealql
DEFINE TABLE IF NOT EXISTS task_relation TYPE RELATION
  FROM task
  TO notebook | customer | project | research_item | campaign;

DEFINE INDEX IF NOT EXISTS idx_task_relation_in  ON TABLE task_relation FIELDS in;
DEFINE INDEX IF NOT EXISTS idx_task_relation_out ON TABLE task_relation FIELDS out;
```

```sql
-- 55_down.surrealql
REMOVE TABLE IF EXISTS task_relation;
```

---

### Migration 56 — assigned_to_user FK

```sql
-- 56.surrealql
DEFINE FIELD IF NOT EXISTS assigned_to_user ON TABLE project  TYPE option<record<user>>;
DEFINE FIELD IF NOT EXISTS assigned_to_user ON TABLE notebook TYPE option<record<user>>;

DEFINE INDEX IF NOT EXISTS idx_project_assigned  ON TABLE project  FIELDS assigned_to_user;
DEFINE INDEX IF NOT EXISTS idx_notebook_assigned ON TABLE notebook FIELDS assigned_to_user;
```

```sql
-- 56_down.surrealql
REMOVE FIELD IF EXISTS assigned_to_user ON TABLE project;
REMOVE FIELD IF EXISTS assigned_to_user ON TABLE notebook;
```

---

## Path C Migrations (Intent — subject to C0 re-assessment)

### Migration 57 — Universal entity_link RELATION

```sql
-- 57.surrealql (Path C, subject to C0 re-assessment)
DEFINE TABLE IF NOT EXISTS entity_link TYPE RELATION
  FROM notebook | note | source | task | project | customer | contact | campaign | research_item
  TO   notebook | note | source | task | project | customer | contact | campaign | research_item;

DEFINE FIELD IF NOT EXISTS link_type ON TABLE entity_link TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created   ON TABLE entity_link TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_entity_link_in  ON TABLE entity_link FIELDS in;
DEFINE INDEX IF NOT EXISTS idx_entity_link_out ON TABLE entity_link FIELDS out;
```

### Migration 58 — Notification table

```sql
-- 58.surrealql (Path C, subject to C0 re-assessment)
DEFINE TABLE IF NOT EXISTS notification SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS user_id    ON TABLE notification TYPE record<user>;
DEFINE FIELD IF NOT EXISTS type       ON TABLE notification TYPE string;
DEFINE FIELD IF NOT EXISTS title      ON TABLE notification TYPE string;
DEFINE FIELD IF NOT EXISTS body       ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS entity_id  ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS entity_type ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS is_read    ON TABLE notification TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS created    ON TABLE notification TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_notif_user ON TABLE notification FIELDS user_id;
DEFINE INDEX IF NOT EXISTS idx_notif_read ON TABLE notification FIELDS is_read;
```

---

## Registration Pattern for async_migrate.py

```python
# Each new migration requires this entry format:
MIGRATIONS = [
    # ... existing 1-50 ...
    {"version": 51, "up": "51.surrealql", "down": "51_down.surrealql",
     "description": "content_format field on note table"},
    {"version": 52, "up": "52.surrealql", "down": "52_down.surrealql",
     "description": "First-class task table"},
    {"version": 53, "up": "53.surrealql", "down": "53_down.surrealql",
     "description": "Campaign table for content marketing workflow"},
    {"version": 54, "up": "54.surrealql", "down": "54_down.surrealql",
     "description": "User table SCHEMAFULL with auth fields"},
    {"version": 55, "up": "55.surrealql", "down": "55_down.surrealql",
     "description": "task_relation RELATION table"},
    {"version": 56, "up": "56.surrealql", "down": "56_down.surrealql",
     "description": "assigned_to_user FK on project and notebook"},
    # Path C (pending C0):
    {"version": 57, "up": "57.surrealql", "down": "57_down.surrealql",
     "description": "Universal entity_link RELATION"},
    {"version": 58, "up": "58.surrealql", "down": "58_down.surrealql",
     "description": "Notification table"},
]
```

---

## Migration Safety Rules

1. **Always write the `_down.surrealql`** before running `_up.surrealql`
2. **Test down migration** on a test database before committing
3. **`IF NOT EXISTS` on every DEFINE** — migrations must be idempotent
4. **Indexes named with `idx_<table>_<field>` pattern** — matches existing convention
5. **No data-modifying migrations without a `scripts/` migration script** — see Task B1 for the Project.tasks → task table data migration
6. **Add migration description** to the async_migrate.py registration immediately after writing the file
