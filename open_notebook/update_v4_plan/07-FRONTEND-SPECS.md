# Frontend Component Specifications

> All components use existing design system: shadcn/ui, Tailwind CSS, Lucide icons.  
> No new UI dependencies for Path A or B.  
> Path C adds Tiptap (see 04-PATH-C-PLAN.md).

---

## Path A Components

### A2 — CommandPalette Extensions

**File**: `frontend/src/components/common/CommandPalette.tsx`  
**Change type**: MODIFY  
**Pattern**: Follow existing `CommandGroup` structure for Notebooks and Customers.

**New groups to add** (in order, after Customers):
1. `Contacts` — link to `/contacts/{id}` — shows `name`, `title`
2. `Projects` — link to `/pipeline?tab=projects&project={id}` — shows `name`, `stage` badge
3. `Sources` — link to `/sources/{id}` — shows `title || url`

**Icon assignments**:
- Contacts → `User` (already in lucide)
- Projects → `ClipboardList` (already in lucide)
- Sources → `FileText` (already in lucide)

**UX rule**: Each group limited to 10 items max (matches existing Notebooks limit of 10).

**Lazy loading**: All hooks enabled only when `open === true` (prevents background API calls).

---

### A3 — Customer Bento Button

**File**: `frontend/src/app/(dashboard)/customers/[id]/page.tsx`  
**Change type**: MODIFY  
**Pattern**: Add a `Button` with `asChild` + `Link` in the customer page header action bar.

```tsx
// In the header action buttons area (next to Edit, Delete buttons)
<Button variant="outline" size="sm" asChild>
  <Link href={`/customers/${customer.id}/bento`}>
    <LayoutGrid className="h-4 w-4 mr-1.5" />
    Bento Overview
  </Link>
</Button>
```

**Icon**: `LayoutGrid` from lucide-react (already present in the app).

---

### A6 — ActivityTimeline Component

**File**: `frontend/src/components/activities/ActivityTimeline.tsx` (NEW)

**Props interface**:
```typescript
interface ActivityTimelineProps {
  customerId: string
  limit?: number        // default: 20
  showHeader?: boolean  // default: true (shows "Activity" heading)
}
```

**Visual design**:
- Vertical timeline with left border
- Each item: timestamp (relative), description, activity_type badge
- Empty state: "No activity recorded yet."
- Loading state: skeleton animation (2-3 rows)
- Activity type badges use consistent colors:
  - `stage_changed` → amber
  - `note_added`, `source_added` → blue
  - `email_sent`, `meeting_logged` → green
  - `contact_added`, `contact_updated` → purple
  - `custom` → slate

**Where used**:
- `customers/[id]/page.tsx` — in the "Activity" tab content
- `notebooks/[id]/page.tsx` (if page exists) — sidebar widget

**Hook**: `use-activities.ts` (NEW, see 06-API-CONTRACTS.md)

---

### A4 — SocialBuilder (media/page.tsx)

**Change type**: MODIFY (replace fake `setTimeout` with real API call)  
**No new component** — modify the existing `handleGenerate` function in place.

**UI additions**:
- Loading state already exists (`setGenerating(true)`)
- Add error state display: `if (error) toast.error(error.message)`
- Add model selection dropdown (optional stretch — use default model for now)

---

### A7 — DeliveryTree on Pipeline Page

**File**: `frontend/src/app/(dashboard)/pipeline/page.tsx`  
**Change type**: MODIFY

**Layout change**:
- Add a `w-56 flex-shrink-0 border-r` left panel
- Panel only appears when `activeTab === 'projects'`
- Panel is collapsible with a toggle button (`ChevronLeft` / `ChevronRight` icon)

**State needed**:
```typescript
const [treeCollapsed, setTreeCollapsed] = useState(false)
```

---

## Path B Components

### B8 — /tasks Page

**File**: `frontend/src/app/(dashboard)/tasks/page.tsx` (NEW)

**Layout**: Three tabs (tabs reuse existing `<Tabs>` + `<TabsList>` pattern):
1. **My Tasks** — filtered board showing only `assigned_to = current_user`
2. **By Project** — accordion list, each project header collapses/expands its tasks
3. **All Tasks** — full kanban (4 columns: todo / in_progress / review / done)

**Task Card component** (`frontend/src/components/tasks/TaskCard.tsx` — NEW):
```typescript
interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: string) => void
  onAssign: (id: string, userId: string) => void
  compact?: boolean
}
```

**Quick-add inline form**: A `+` button at the top of each kanban column opens an inline input for fast task creation.

**Priority colors**:
- `critical` → red badge
- `high` → orange badge  
- `medium` → yellow badge
- `low` → slate badge

**Sidebar link**: Add `{ name: 'Tasks', href: '/tasks', icon: CheckSquare }` to `AppSidebar.tsx` navigation items after `Operations`.

---

### B9 — /campaigns Page

**File**: `frontend/src/app/(dashboard)/campaigns/page.tsx` (NEW)

**Layout**: Three-phase workflow (horizontal phases):
```
[Phase 1: Research] → [Phase 2: Drafts] → [Phase 3: Schedule]
```

**Phase 1 — Research**: Shows research items tagged to this campaign. `+ Add Research` opens research item picker.

**Phase 2 — Drafts**: Shows notes/publications linked to this campaign. `+ Generate Draft` calls the SocialBuilder API.

**Phase 3 — Schedule**: Shows scheduled publications with dates. Reads from publications calendar.

**Campaign Card** (list view, top of page):
```typescript
interface CampaignCardProps {
  campaign: Campaign
  researchCount: number
  draftCount: number
  scheduledCount: number
}
```

**Sidebar link**: Add `{ name: 'Campaigns', href: '/campaigns', icon: Megaphone }` to `AppSidebar.tsx` after Tasks.

---

### B10 — DeliveryTree Persistent Left Panel (Operations)

**File**: `frontend/src/app/(dashboard)/operations/page.tsx` (MODIFY)

**Before**:
```tsx
<Tabs>
  <TabsList>...</TabsList>
  <TabsContent value="projects">
    <DeliveryTree .../>
    {/* other content */}
  </TabsContent>
</Tabs>
```

**After**:
```tsx
<div className="flex h-full">
  {/* Persistent left panel */}
  <aside className="w-56 border-r flex-shrink-0 overflow-y-auto p-2 bg-sidebar/50">
    <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase">Hierarchy</p>
    <DeliveryTree customers={customers} projects={projects} ... />
  </aside>
  {/* Main content with tabs */}
  <div className="flex-1 min-w-0">
    <Tabs>...</Tabs>
  </div>
</div>
```

---

### B11 — Revenue Forecast Bar (KanbanBoard)

**File**: `frontend/src/app/(dashboard)/pipeline/components/KanbanBoard.tsx` (MODIFY)

**RevenueBar** sub-component (in same file, not extracted):
```typescript
function RevenueBar({ notebooks, pipelineType }: { notebooks: Notebook[], pipelineType: string }) {
  if (pipelineType !== 'sales') return null
  
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won']
  const totals = Object.fromEntries(
    stages.map(s => [s, notebooks
      .filter(n => n.stage === s)
      .reduce((sum, n) => sum + (n.estimated_value || 0), 0)])
  )
  
  return (
    <div className="flex gap-2 mb-4 p-3 bg-card/40 rounded border border-border/40 text-xs backdrop-blur-sm">
      {stages.map(stage => (
        <div key={stage} className="flex-1 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {stage}
          </div>
          <div className="font-bold text-sm">
            {totals[stage] > 0 ? `$${(totals[stage] / 1000).toFixed(0)}K` : '—'}
          </div>
        </div>
      ))}
      <div className="flex-1 text-center border-l border-border/40 pl-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pipeline</div>
        <div className="font-bold text-sm text-emerald-400">
          ${(Object.values(totals).reduce((a, b) => a + b, 0) / 1000).toFixed(0)}K
        </div>
      </div>
    </div>
  )
}
```

---

### B12 — TodayDigest Widget

**File**: `frontend/src/components/dashboard/TodayDigest.tsx` (NEW)

**Props**:
```typescript
interface TodayDigestProps {
  perspective: 'research' | 'delivery' | 'sales'
}
```

**Content by perspective**:
- `research`: Due research items, last 3 results, pending note reviews
- `delivery`: Tasks due today (assigned to user), project deadlines
- `sales`: Follow-ups due, stage progression recommendations

**Data sources** (all from existing hooks):
- `useTasks({ assignedTo: currentUser, status: 'todo' })`
- `useResearchItems({ status: 'due' })`

---

## Sidebar Navigation — Final Order (Path B complete)

```typescript
const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Sources', href: '/sources', icon: FileText },
  { name: 'Notebooks', href: '/notebooks', icon: Book },
  { name: 'Customers', href: '/customers', icon: Building2 },   // ← exists
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },         // ← exists
  { name: 'Operations', href: '/operations', icon: Settings2 }, // ← exists
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },          // ← NEW in B8
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },    // ← NEW in B9
  { name: 'Media', href: '/media', icon: Layers },               // ← exists
  { name: 'Voice', href: '/voice', icon: Mic },                  // ← exists
  { name: 'Settings', href: '/settings', icon: Settings },       // ← exists
]
```

---

## TypeScript Interfaces (Shared)

**`frontend/src/types/index.ts`** (MODIFY — add new types):

```typescript
export interface Task {
  id: string
  title: string
  description?: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'critical' | null
  due_date?: string | null
  project_id?: string | null
  customer_id?: string | null
  notebook_id?: string | null
  assigned_to?: string | null
  tags: string[]
  created: string
  updated: string
}

export interface Campaign {
  id: string
  name: string
  description?: string | null
  theme?: string | null
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  start_date?: string | null
  end_date?: string | null
  target_audience?: string | null
  channels: string[]
  customer_id?: string | null
  notebook_id?: string | null
  created: string
  updated: string
}

export interface Activity {
  id: string
  customer_id: string
  activity_type: string
  description: string
  metadata: Record<string, unknown>
  actor: string
  created: string
  updated: string
}
```
