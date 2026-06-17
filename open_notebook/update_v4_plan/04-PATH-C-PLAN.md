# Path C — "Knowledge OS" — High-Level Plan

> **Duration**: Weeks 15–24  
> **Prerequisite**: Gate B14 approved + C0 full re-assessment completed  
> **⚠️ WARNING**: Do NOT begin ANY Path C work until C0 re-assessment is complete.  
> Path C will be re-scoped after C0. The tasks below are **intent**, not commitments.

---

## C0 — Mandatory Re-Assessment Gate

Before writing a single line of Path C code, a new agent must:

1. Read all files changed in Path A and Path B
2. Run `graphify update .` and query the updated graph
3. Run the full test suite and record the baseline
4. Take browser screenshots of all 12 pages
5. Count actual notes/tasks/campaigns in the running system
6. Re-evaluate which Path C items are still needed vs. already solved by A+B
7. Present findings to USER before proceeding

**This re-assessment may result in Path C being partially or fully re-scoped.**

---

## C1 — Tiptap Block Editor (Notes WYSIWYG)

**Trigger**: Only if C0 re-assessment confirms users want block-based editing.

**Dependencies**: 
- `content_format` field added in Migration 51 (Path A)
- React 19 + Next.js 16 + Tiptap 2.x compatibility verified

**Installation**:
```bash
cd frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-character-count
# Optional for markdown export compatibility:
npm install @tiptap/extension-code-block-lowlight
```

**New component**: `frontend/src/components/ui/block-editor.tsx` — NOT replacing `markdown-editor.tsx`. Two separate components. `NoteEditorDialog.tsx` switches to `BlockEditor`. `TransformationEditorDialog.tsx` keeps `MarkdownEditor` (split-pane, per finding U4 from brainstorm).

**Content storage**: Tiptap HTML string initially (preserves BM25 index). JSON block storage is a stretch goal, requires Migration 57 (`content_text` computed field for search).

---

## C2 — SplitEditor Component (Prompts)

Dedicated editor for LLM prompt templates. Keeps the split-pane live preview behavior of `@uiw/react-md-editor` but extracted into its own component. `TransformationEditorDialog.tsx` uses this.

---

## C3 — Note Content Migration Script

Optional: migrate existing Markdown notes to Tiptap block format. 

**Only run if**: `content_format` field exists (Path A migration 51) AND user opts in.

Migration approach: parse Markdown string → Tiptap JSON using `@tiptap/extension-markdown` on the server side. Set `content_format = 'block'` after successful conversion.

**Safety**: Keep original Markdown in a `content_markdown_backup` field for 30 days.

---

## C4 — Migration 57: Universal entity_link RELATION

**Pattern**: Extends `entity_note` RELATION (Migration 43) to allow ANY entity type to link to ANY other.

```sql
-- Migration 57: Universal entity linking
DEFINE TABLE IF NOT EXISTS entity_link TYPE RELATION
  FROM notebook | note | source | task | project | customer | contact | campaign | research_item
  TO   notebook | note | source | task | project | customer | contact | campaign | research_item;

DEFINE FIELD IF NOT EXISTS link_type ON TABLE entity_link TYPE option<string>;
  -- e.g. 'references', 'blocks', 'informs', 'parent', 'sibling'
DEFINE FIELD IF NOT EXISTS created   ON TABLE entity_link TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_entity_link_in  ON TABLE entity_link FIELDS in;
DEFINE INDEX IF NOT EXISTS idx_entity_link_out ON TABLE entity_link FIELDS out;
```

---

## C5 — Migration 58: Notification Table

```sql
-- Migration 58: In-app notifications
DEFINE TABLE IF NOT EXISTS notification SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS user_id      ON TABLE notification TYPE record<user>;
DEFINE FIELD IF NOT EXISTS type         ON TABLE notification TYPE string;
  -- 'mention' | 'task_assigned' | 'task_due' | 'research_complete' | 'stage_changed'
DEFINE FIELD IF NOT EXISTS title        ON TABLE notification TYPE string;
DEFINE FIELD IF NOT EXISTS body         ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS entity_id    ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS entity_type  ON TABLE notification TYPE option<string>;
DEFINE FIELD IF NOT EXISTS is_read      ON TABLE notification TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS created      ON TABLE notification TYPE string DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_notif_user ON TABLE notification FIELDS user_id;
DEFINE INDEX IF NOT EXISTS idx_notif_read ON TABLE notification FIELDS is_read;
```

---

## C6 — Relations Graph Panel (xyflow)

**Trigger**: C0 re-assessment confirms entity linking is actively needed.

**Key fact**: `@xyflow/react ^12.10.2` is ALREADY in `package.json`. `CSETNetworkCanvas` component EXISTS at `frontend/src/app/(dashboard)/notebooks/test-canvas/`. Path C builds ON this existing component.

**Implementation**: Add a "Relations" panel to the Notebook detail page. Shows the notebook's connections to: sources, notes, tasks, projects, customers, research items.

---

## C7 — AI Co-Pilot Sidebar

**Trigger**: C0 re-assessment confirms the current context chat is insufficient.

**Architecture**: A persistent right-panel sidebar that:
1. Knows which page you're on (context from URL + current entity ID)
2. Can search the entire knowledge base (`/api/search/hybrid`)
3. Can create tasks, notes, activities from conversation
4. Uses streaming via `useServerSentEvents` (already implemented in chat)

This is a significant feature. Scope fully in C0 re-assessment.

---

## C8 — Notification System (@mention)

Detect `@username` patterns in note content. On save, create `notification` records for mentioned users. Deliver via a bell icon in AppSidebar.

**Depends on**: C5 (notification table) + B3 (user table SCHEMAFULL).

---

## C9 — Mobile-Responsive Audit + PWA

Full mobile pass: viewport testing at 375px, 768px, 1024px. Fix any overflow or unusable UI. Add `manifest.json` for PWA installability.

---

## C10 — Gate: Path C Complete

```bash
# Full regression suite
.venv/bin/pytest tests/ -q --run-e2e
# Performance audit (Lighthouse via Chrome DevTools MCP)
# All Core Web Vitals green
# Docker build green
git status --short
```

**USER APPROVAL**: Path C final sign-off.
