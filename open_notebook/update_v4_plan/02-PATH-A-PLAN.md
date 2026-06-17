# Path A — "Tighten the Core" — Detailed Implementation Plan

> **Duration**: Weeks 1–4  
> **Goal**: Wire existing built components, eliminate dead ends, deliver visible value to all 5 personas before any new tables are added.  
> **Gate**: A8 — all tests pass, tsc --noEmit clean, git status empty, USER approves before Path B.

---

## Task A1 — Migration 51: Add content_format to note table

**Why now**: Architecture decision from Option C analysis. Locks in the Tiptap path for Path C without requiring a second migration later. 30 minutes of work.

**Karpathy**: P7 (no drift — document the format decision now); P3 (TDD — test default value).

### Files to create

**`open_notebook/database/migrations/51.surrealql`** (NEW):
```sql
-- Migration 51: Add content_format discriminator to note table
-- Locks in future Tiptap (block JSON) support without schema breakage.
-- Default 'markdown' ensures all existing notes are unaffected.
DEFINE FIELD IF NOT EXISTS content_format ON TABLE note
  TYPE option<string>
  DEFAULT 'markdown';

-- Allowed values: 'markdown' | 'block' (Tiptap JSON in Path C)
```

**`open_notebook/database/migrations/51_down.surrealql`** (NEW):
```sql
REMOVE FIELD IF EXISTS content_format ON TABLE note;
```

**`open_notebook/database/async_migrate.py`** (MODIFY):
- Register migration 51 in the migrations list.
- Citation: file currently has 50 migrations; add entry for `51`.

### Test to write first (Karpathy P3)

**`tests/test_migration_51.py`** (NEW):
```python
"""Test that content_format defaults to 'markdown' on new notes."""
import asyncio
from open_notebook.database.repository import repo_create, repo_delete, repo_query

def test_note_content_format_defaults_to_markdown():
    """Migration 51: content_format field defaults to 'markdown'."""
    # Create a note without specifying content_format
    note_id = asyncio.run(repo_create("note", {"title": "test", "content": "hello"}))
    try:
        results = asyncio.run(repo_query("SELECT content_format FROM $id", {"id": note_id}))
        assert results[0]["content_format"] == "markdown", (
            f"Expected 'markdown', got {results[0]['content_format']}"
        )
    finally:
        asyncio.run(repo_delete(note_id))
```

### Verification
```bash
.venv/bin/pytest tests/test_migration_51.py -v
```

---

## Task A2 — CommandPalette: Add Contacts, Sources, Projects groups

**Why**: CommandPalette is mounted in `layout.tsx` and already searches notebooks and customers. Missing: contacts, sources, research items, projects. ICE 648 (highest on the board).

**Citation**: `frontend/src/components/common/CommandPalette.tsx` — has groups for `Notebooks` and `Customers`, but NOT `Contacts`, `Sources`, or `Projects`.

**Karpathy**: P1 (simple — follow exact same pattern as existing groups); P4 (no fake data).

### Files to modify

**`frontend/src/components/common/CommandPalette.tsx`** (MODIFY):

Add these imports (follow existing pattern):
```tsx
import { useContacts } from '@/lib/hooks/use-contacts'
import { useSources } from '@/lib/hooks/use-sources'
import { useProjects } from '@/lib/hooks/use-projects'
```

Add state hooks (after existing `useNotebooks`):
```tsx
const { data: contacts = [] } = useContacts({ enabled: open })
const { data: sources = [] } = useSources({ enabled: open, limit: 20 })
const { data: projects = [] } = useProjects({ enabled: open })
```

Add CommandGroup sections (after the Customers group, before Create):
```tsx
{/* Contacts */}
{contacts.length > 0 && (
  <CommandGroup heading="Contacts">
    {contacts.slice(0, 10).map((c) => (
      <CommandItem
        key={c.id}
        value={`contact ${c.name} ${c.email || ''} ${c.title || ''}`}
        onSelect={() => handleNavigate(`/contacts/${c.id}`)}
      >
        <User className="h-4 w-4" />
        <span>{c.name}</span>
        {c.title && <span className="text-muted-foreground text-xs ml-1">— {c.title}</span>}
      </CommandItem>
    ))}
  </CommandGroup>
)}

{/* Projects */}
{projects.length > 0 && (
  <CommandGroup heading="Projects">
    {projects.slice(0, 10).map((p) => (
      <CommandItem
        key={p.id}
        value={`project ${p.name} ${p.stage || ''} ${p.customer_id || ''}`}
        onSelect={() => handleNavigate(`/pipeline?tab=projects&project=${p.id}`)}
      >
        <ClipboardList className="h-4 w-4" />
        <span>{p.name}</span>
        {p.stage && <Badge variant="outline" className="ml-1 text-xs">{p.stage}</Badge>}
      </CommandItem>
    ))}
  </CommandGroup>
)}

{/* Sources */}
{sources.length > 0 && (
  <CommandGroup heading="Sources">
    {sources.slice(0, 8).map((s) => (
      <CommandItem
        key={s.id}
        value={`source ${s.title || ''} ${s.url || ''}`}
        onSelect={() => handleNavigate(`/sources/${s.id}`)}
      >
        <FileText className="h-4 w-4" />
        <span className="truncate">{s.title || s.url || 'Untitled source'}</span>
      </CommandItem>
    ))}
  </CommandGroup>
)}
```

Add missing Lucide imports:
```tsx
import { User, ClipboardList } from 'lucide-react'
```

### Hooks verification (confirm they exist)
```bash
# Verify hooks exist before modifying CommandPalette
ls frontend/src/lib/hooks/use-contacts.ts
ls frontend/src/lib/hooks/use-sources.ts
ls frontend/src/lib/hooks/use-projects.ts
```

If any hook is missing, create it following the pattern of `use-customers.ts`.

### Test
```bash
cd frontend && npx tsc --noEmit
# Must: 0 errors
```
Manual: Open app, press Ctrl+K, type "Jim" — should see matching contacts. Type a project name — should see projects.

---

## Task A3 — Customer Bento Navigation Link (1 hour)

**Why**: `/customers/[id]/bento` page exists with zero navigation paths to it. ICE 500.

**Citation**: `find frontend/src -path "*customers*bento*"` — page exists at `frontend/src/app/(dashboard)/customers/[id]/bento/page.tsx`. Zero references from any navigation component.

### Files to modify

**`frontend/src/app/(dashboard)/customers/[id]/page.tsx`** (MODIFY):

Find the tabs section (look for `<TabsList>` or `<TabsTrigger>`). Add a new tab:
```tsx
<TabsTrigger value="bento">
  <LayoutGrid className="h-4 w-4 mr-1.5" />
  Overview
</TabsTrigger>
```

And the corresponding panel (navigate to bento or embed it inline):
```tsx
<TabsContent value="bento">
  <Link href={`/customers/${customerId}/bento`} className="...">
    Open full bento view →
  </Link>
</TabsContent>
```

OR (simpler, per P1): Add a button in the customer page header:
```tsx
<Button variant="outline" size="sm" asChild>
  <Link href={`/customers/${customer.id}/bento`}>
    <LayoutGrid className="h-4 w-4 mr-1.5" />
    Bento Overview
  </Link>
</Button>
```

**Decision**: Use the button approach (P1 — simpler, 15 minutes vs. 1 hour for tab). Renders immediately, no tab state management.

### Test
```bash
cd frontend && npx tsc --noEmit
```
Manual: Navigate to any customer detail page. Click "Bento Overview" button. Should reach the bento page.

---

## Task A4 — SocialBuilder: Replace setTimeout with Real LLM API Call

**Why**: `media/page.tsx:77` — `setTimeout(() => { ... hardcoded strings }, 1500)` — this is explicitly tagged `// Simulate LLM agent generation`. ICE 504.

**Karpathy P4**: "No faking." The current implementation is a fake. It must be replaced with a real transformation API call.

**Architecture**: The `transformations` domain already supports `Transformation.run(input_text)`. The SocialBuilder should call `POST /api/transformations/{id}/run` with the selected note content and channel as context.

### Files to modify

**`frontend/src/app/(dashboard)/media/page.tsx`** (MODIFY):

Replace the `handleGenerate` function:

```tsx
const handleGenerate = async () => {
  if (!selectedNoteId || !selectedStyleguideId) {
    toast.error('Select a note and style guide first.')
    return
  }
  const note = notes.find((n) => n.id === selectedNoteId)
  if (!note) {
    toast.error('Selected note not found.')
    return
  }

  setGenerating(true)
  try {
    const styleguide = styleguides.find((g) => g.id === selectedStyleguideId)
    const prompt = `
Channel: ${selectedChannel}
Tone: ${selectedTone}
Style Guide: ${styleguide?.name || 'Default'}
Source Content:
${note.content || ''}

Generate a ${selectedChannel} post following the style guide and tone above.
Return JSON with keys: title (string), content (string).
    `.trim()

    // Use the existing transformations run endpoint
    const res = await fetch('/api/transformations/run-inline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_text: note.content || '',
        instruction: prompt,
        model_id: null, // uses default model
      }),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()

    // Parse structured output if JSON, otherwise use as content
    try {
      const parsed = JSON.parse(data.output)
      setGeneratedTitle(parsed.title || `${selectedChannel} post`)
      setGeneratedContent(parsed.content || data.output)
    } catch {
      setGeneratedTitle(`${selectedChannel} post about ${note.title || 'research'}`)
      setGeneratedContent(data.output)
    }
    toast.success('Content generated.')
  } catch (err) {
    toast.error(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  } finally {
    setGenerating(false)
  }
}
```

**Backend requirement**: Check if `POST /api/transformations/run-inline` exists.
```bash
grep -n "run.inline\|run_inline\|/run" api/routers/transformations.py | head -10
```
If it doesn't exist, add it (see `06-API-CONTRACTS.md`).

### Test to write first
```python
# tests/test_social_builder_api.py
def test_transformations_run_inline_endpoint_exists():
    """Social builder requires /api/transformations/run-inline endpoint."""
    from fastapi.testclient import TestClient
    from api.main import app
    client = TestClient(app)
    # Test the endpoint exists (returns non-404)
    res = client.post('/api/transformations/run-inline', json={
        'input_text': 'test content',
        'instruction': 'Generate a LinkedIn post',
        'model_id': None,
    })
    # 422 is OK (validation error from test env with no model config)
    # 404 means endpoint is missing — that's the failure we're testing against
    assert res.status_code != 404, "run-inline endpoint must exist"
```

---

## Task A5 — Research → Notebook: Auto-Create Note on Completion

**Why**: When a `ResearchItem` completes a search run, results are stored as a `Source` (via `scheduled_search_worker.py:186 — source.relate("reference", notebook_id)`), but NO note is created summarizing the result. Researchers must manually find the source. ICE 576.

**Approach**: After `source.relate("reference", notebook_id)`, create a summary `Note` in the notebook with `note_type='ai'` and `content` = the research summary.

### Files to modify

**`open_notebook/domain/scheduled_search_worker.py`** (MODIFY):

After line 186 (`await source.relate("reference", notebook_id)`), add:

```python
# Auto-create a summary note in the linked notebook
if notebook_id and results_text:
    try:
        from open_notebook.domain.notebook import Note
        summary_note = Note(
            title=f"Research: {scheduled_search.name} — {datetime.now().strftime('%Y-%m-%d')}",
            content=results_text[:4000],  # cap at 4000 chars for note
            note_type="ai",
        )
        await summary_note.save()
        await summary_note.relate("note", notebook_id)
        logger.info(f"Auto-created research note {summary_note.id} in notebook {notebook_id}")
    except Exception as e:
        logger.warning(f"Auto-note creation failed (non-blocking): {e}")
```

**Why non-blocking**: Note creation failure must not fail the research run (P1 resilience).

### Test to write first
```python
# tests/test_research_auto_note.py
def test_scheduled_search_creates_note_in_notebook():
    """After research run, a summary note should exist in the linked notebook."""
    # This is an integration test requiring Docker
    pytest.importorskip("surreal")  # skip if no DB
    # ... full test implementation in test file
```

---

## Task A6 — Activity Feed: Wire ActivityTimeline to Customer + Notebook Pages

**Why**: `api/routers/activities.py` is complete with `GET /activities?customer_id=...` and `POST /activities`. Frontend has NO `ActivityTimeline` component. ICE 448.

**Citation**: `activities.py` has 14 activity types including `notebook_created`, `stage_changed`, `meeting_logged`. Zero frontend components consume it.

### Files to create

**`frontend/src/components/activities/ActivityTimeline.tsx`** (NEW):
```tsx
'use client'
import { useActivities } from '@/lib/hooks/use-activities'
import { Clock, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityTimelineProps {
  customerId: string
  limit?: number
}

export function ActivityTimeline({ customerId, limit = 20 }: ActivityTimelineProps) {
  const { data: activities = [], isLoading } = useActivities(customerId, limit)

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded" />
  if (activities.length === 0) return (
    <div className="text-center text-muted-foreground py-8 text-sm">
      No activity recorded yet.
    </div>
  )

  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {activities.map((activity) => (
        <li key={activity.id} className="ml-4">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary/40 border border-primary" />
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created), { addSuffix: true })}
            {activity.actor !== 'system' && ` · ${activity.actor}`}
          </p>
          <p className="text-sm font-medium">{activity.description}</p>
          <p className="text-xs text-muted-foreground capitalize">{activity.activity_type.replace(/_/g, ' ')}</p>
        </li>
      ))}
    </ol>
  )
}
```

**`frontend/src/lib/hooks/use-activities.ts`** (NEW):
```ts
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useActivities(customerId: string, limit = 20) {
  return useQuery({
    queryKey: ['activities', customerId, limit],
    queryFn: async () => {
      const { data } = await axios.get('/api/activities', {
        params: { customer_id: customerId, limit }
      })
      return data
    },
    enabled: Boolean(customerId),
  })
}
```

### Wire into Customer page

**`frontend/src/app/(dashboard)/customers/[id]/page.tsx`** (MODIFY):

Find the "Activity" tab content (it exists but shows a placeholder). Replace with:
```tsx
import { ActivityTimeline } from '@/components/activities/ActivityTimeline'
// ...
<TabsContent value="activity">
  <ActivityTimeline customerId={customer.id} />
</TabsContent>
```

### Auto-emit activity on key events

In `api/routers/notebooks.py` (MODIFY) — when a notebook `stage` changes via PUT:
```python
# After saving the updated notebook, if stage changed:
if updated_notebook.stage != original_stage and updated_notebook.customer_id:
    await repo_create("activity", {
        "customer_id": updated_notebook.customer_id,
        "activity_type": "stage_changed",
        "description": f"Deal moved from {original_stage} → {updated_notebook.stage}",
        "actor": "system",
        "metadata": {"notebook_id": str(updated_notebook.id)},
    })
```

### Test
```python
# tests/test_activity_feed.py
def test_activity_timeline_endpoint_returns_list():
    from fastapi.testclient import TestClient
    from api.main import app
    client = TestClient(app)
    res = client.get('/api/activities?customer_id=customer:test')
    assert res.status_code == 200
    assert isinstance(res.json(), list)
```

---

## Task A7 — DeliveryTree: Add to Pipeline Page

**Why**: `DeliveryTree` is used in `operations/page.tsx:484` and `customers/[id]/page.tsx:696`, but is missing from the Pipeline page where Project Delivery happens. ICE 576.

**Citation**: `frontend/src/app/(dashboard)/pipeline/page.tsx` — no import of `DeliveryTree`. `frontend/src/components/delivery/DeliveryTree.tsx` exists and accepts `customers`, `projects`, `notebooks`, `researchItems` props.

### Files to modify

**`frontend/src/app/(dashboard)/pipeline/page.tsx`** (MODIFY):

Add import:
```tsx
import { DeliveryTree } from '@/components/delivery/DeliveryTree'
```

In the `projects` tab content, add the DeliveryTree as a collapsible left panel:
```tsx
{activeTab === 'projects' && (
  <div className="flex h-full gap-4">
    {/* Left: Hierarchy Tree */}
    <div className="w-64 flex-shrink-0 border-r pr-4">
      <DeliveryTree
        customers={customers}
        projects={projects}
        notebooks={notebooks}
        researchItems={[]}
        onSelect={(type, id) => {
          if (type === 'project') {
            // filter project board to this project
            setSelectedProjectId(id)
          } else if (type === 'customer') {
            router.push(`/customers/${id}`)
          }
        }}
      />
    </div>
    {/* Right: Existing project kanban/list */}
    <div className="flex-1 min-w-0">
      {/* existing project board content */}
    </div>
  </div>
)}
```

### Test
```bash
cd frontend && npx tsc --noEmit
# No errors
```
Manual: Navigate to `/pipeline?tab=projects`. DeliveryTree should appear on the left.

---

## Gate A8 — Path A Completion Checklist

```bash
# 1. All backend tests pass
.venv/bin/pytest tests/ -q
# Expected: all pass or skip (0 failures)

# 2. TypeScript clean
cd frontend && npx tsc --noEmit
# Expected: 0 errors

# 3. No uncommitted changes
git status --short
# Expected: empty output

# 4. Graphify update (required by GEMINI.md)
graphify update .

# 5. Memory store (required by GEMINI.md)
npx -y ruflo@latest memory store \
  --namespace patterns \
  --key "path_a_complete_2026" \
  --value "CommandPalette+contacts+sources+projects wired. SocialBuilder real LLM. Research auto-note. ActivityTimeline. DeliveryTree on Pipeline. content_format migration 51."
```

**USER APPROVAL REQUIRED** before starting Path B.
