'use client'

import { useState, useMemo, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useResearchItems, useCreateResearchItem, useUpdateResearchItem, useDeleteResearchItem, useExecuteResearch } from '@/lib/hooks/use-research-items'
import { useCustomers } from '@/lib/hooks/use-customers'
import type { Customer } from '@/lib/types/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { researchColumns } from '@/components/columns/research-columns'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Search,
  Telescope,
  LayoutGrid,
  Kanban,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  Archive,
  RefreshCw,
  Zap,
  Globe,
  BookOpen,
  Loader2,
  Pencil,
  FileText,
} from 'lucide-react'
import {
  RESEARCH_STAGES,
  RESEARCH_STAGE_LABELS,
  RESEARCH_STAGE_COLORS,
  SEARCH_ENGINES,
  ENGINE_LABELS,
  ENGINE_COLORS,
  RESEARCH_INTERVALS,
  INTERVAL_LABELS,
} from '@/lib/constants/research-stages'
import type { ResearchItem, CreateResearchItemRequest, UpdateResearchItemRequest } from '@/lib/types/research-item'
import { toast } from 'sonner'

const STAGE_ICONS: Record<string, typeof Search> = {
  queued: Clock,
  researching: Loader2,
  analyzing: BookOpen,
  completed: CheckCircle,
  archived: Archive,
}

export default function ResearchIntelligencePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<ResearchItem | null>(null)
  const [engineFilter, setEngineFilter] = useState<string>('all')

  const { data: items = [], isLoading } = useResearchItems()
  const { data: customers = [] } = useCustomers()
  const createMutation = useCreateResearchItem()
  const updateMutation = useUpdateResearchItem()
  const executeMutation = useExecuteResearch()

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.query.toLowerCase().includes(q)
      )
    }
    if (engineFilter !== 'all') {
      result = result.filter((i) =>
        i.engines?.includes(engineFilter) || i.engine === engineFilter
      )
    }
    return result
  }, [items, searchQuery, engineFilter])

  // Group by stage for kanban
  const stageGroups = useMemo(() => {
    const groups: Record<string, ResearchItem[]> = {}
    for (const stage of RESEARCH_STAGES) {
      groups[stage] = filteredItems.filter((i) => i.stage === stage && i.status !== 'cancelled')
    }
    return groups
  }, [filteredItems])

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((i) => i.status === 'active').length,
    recurring: items.filter((i) => i.is_recurring).length,
    completed: items.filter((i) => i.stage === 'completed').length,
  }), [items])

  const handleStageChange = useCallback(async (itemId: string, newStage: string) => {
    try {
      await updateMutation.mutateAsync({ id: itemId, data: { stage: newStage } })
      toast.success('Stage updated')
    } catch {
      toast.error('Failed to update stage')
    }
  }, [updateMutation])

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Telescope className="h-6 w-6 text-sky-500" />
              Research Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered research across Perplexity, Tavily, Valyu and more
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Research
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-cyan-500' },
            { label: 'Active', value: stats.active, color: 'text-emerald-500' },
            { label: 'Recurring', value: stats.recurring, color: 'text-violet-500' },
            { label: 'Completed', value: stats.completed, color: 'text-sky-500' },
          ].map((s) => (
            <div key={s.label} className="bg-background/40 backdrop-blur-md border border-sidebar-border rounded-lg p-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search research items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={engineFilter} onValueChange={setEngineFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All engines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engines</SelectItem>
              {SEARCH_ENGINES.map((engine) => (
                <SelectItem key={engine} value={engine}>{ENGINE_LABELS[engine]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ViewToggle value={viewMode} onChange={setViewMode} showKanban={true} />
        </div>

        {/* Kanban view */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
            {RESEARCH_STAGES.filter(s => s !== 'archived').map((stage) => {
              const StageIcon = STAGE_ICONS[stage] || Clock
              const stageItems = stageGroups[stage] || []
              return (
                <div key={stage} className="flex-shrink-0 w-72 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <StageIcon className={`h-4 w-4 text-${RESEARCH_STAGE_COLORS[stage]}-500`} />
                    <span className="text-sm font-medium text-foreground">{RESEARCH_STAGE_LABELS[stage]}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{stageItems.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                    {stageItems.map((item) => (
                      <ResearchCard
                        key={item.id}
                        item={item}
                        onExecute={() => executeMutation.mutate(item.id)}
                        onEdit={() => setEditItem(item)}
                        onStageChange={handleStageChange}
                        customers={customers}
                      />
                    ))}
                    {stageItems.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-sidebar-border rounded-lg">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Card view */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.filter(i => i.status !== 'cancelled').map((item) => (
              <ResearchCard
                key={item.id}
                item={item}
                onExecute={() => executeMutation.mutate(item.id)}
                onEdit={() => setEditItem(item)}
                onStageChange={handleStageChange}
                customers={customers}
              />
            ))}
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && (
          <DataTable
            columns={researchColumns}
            data={filteredItems}
            searchPlaceholder="Search research items..."
            isLoading={isLoading}
            emptyMessage="No research items"
          />
        )}

        {/* Create dialog */}
        <CreateResearchDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (data) => {
            try {
              await createMutation.mutateAsync(data)
              toast.success('Research item created')
              setCreateOpen(false)
            } catch {
              toast.error('Failed to create research item')
            }
          }}
          customers={customers}
          isLoading={createMutation.isPending}
        />

        {/* Edit dialog */}
        {editItem && (
          <EditResearchDialog
            open={!!editItem}
            onOpenChange={(open) => { if (!open) setEditItem(null) }}
            item={editItem}
            onSubmit={async (data) => {
              try {
                await updateMutation.mutateAsync({ id: editItem.id, data })
                toast.success('Research item updated')
                setEditItem(null)
              } catch {
                toast.error('Failed to update research item')
              }
            }}
            customers={customers}
            isLoading={updateMutation.isPending}
          />
        )}
      </div>
    </AppShell>
  )
}

function ResearchCard({
  item,
  onExecute,
  onEdit,
  onStageChange,
  customers,
}: {
  item: ResearchItem
  onExecute: () => void
  onEdit: () => void
  onStageChange: (id: string, stage: string) => void
  customers: Customer[]
}) {
  const customer = customers.find((c: Customer) => c.id === item.customer_id)
  const enginesList = item.engines?.length ? item.engines : [item.engine]

  return (
    <div className="bg-background/40 backdrop-blur-md border border-sidebar-border rounded-lg p-3 hover:border-sky-500/50 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground truncate flex-1" title={item.name}>{item.name}</h4>
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {item.is_recurring && (
            <RefreshCw className="h-3 w-3 text-violet-500" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.query}</p>

      {/* Engine badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {enginesList.map((eng) => {
          const color = ENGINE_COLORS[eng as keyof typeof ENGINE_COLORS] || 'slate'
          return (
            <Badge key={eng} variant="outline" className={`text-[10px] py-0 border-${color}-500/50 text-${color}-500`}>
              {ENGINE_LABELS[eng as keyof typeof ENGINE_LABELS] || eng}
            </Badge>
          )
        })}
        {customer && (
          <Badge variant="outline" className="text-[10px] py-0">
            {customer.name}
          </Badge>
        )}
      </div>

      {/* Formatting instructions indicator */}
      {item.formatting_instructions && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
          <FileText className="h-3 w-3 text-violet-400" />
          <span className="truncate" title={item.formatting_instructions}>Formatting: {item.formatting_instructions.slice(0, 40)}...</span>
        </div>
      )}

      {item.last_error && (
        <div className="flex items-center gap-1 text-xs text-rose-500 mb-2">
          <AlertTriangle className="h-3 w-3" />
          <span className="truncate" title={item.last_error}>{item.last_error}</span>
        </div>
      )}

      {item.results_summary && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 italic">{item.results_summary}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>{item.run_count} runs</span>
        </div>
        {item.stage !== 'completed' && item.stage !== 'archived' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onExecute}
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Edit Research Dialog
// =============================================================================

function EditResearchDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  customers,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ResearchItem
  onSubmit: (data: UpdateResearchItemRequest) => Promise<void>
  customers: Customer[]
  isLoading: boolean
}) {
  const [form, setForm] = useState<UpdateResearchItemRequest>({
    name: item.name,
    query: item.query,
    description: item.description || '',
    engines: item.engines?.length ? [...item.engines] : (item.engine ? [item.engine] : ['perplexity']),
    formatting_instructions: item.formatting_instructions || '',
    is_recurring: item.is_recurring,
    interval: item.interval,
    customer_id: item.customer_id,
  })

  const toggleEngine = (engine: string) => {
    const current = form.engines || []
    if (current.includes(engine)) {
      setForm({ ...form, engines: current.filter((e) => e !== engine) })
    } else {
      setForm({ ...form, engines: [...current, engine] })
    }
  }

  const handleSubmit = async () => {
    const engines = form.engines || []
    await onSubmit({
      ...form,
      engine: engines[0] || 'perplexity',
      engines,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-sky-500" />
            Edit Research Item
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Research item name"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of this research task"
              rows={2}
            />
          </div>

          {/* Research Prompt */}
          <div>
            <Label>Research Prompt</Label>
            <Textarea
              value={form.query || ''}
              onChange={(e) => setForm({ ...form, query: e.target.value })}
              placeholder="What would you like to research?"
              rows={3}
            />
          </div>

          {/* Search Engines — checkbox grid */}
          <div>
            <Label className="mb-2 block">Search Engines</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select one or more engines. Each selected engine will run an individual search, and results will be combined by the LLM.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SEARCH_ENGINES.filter(e => e !== 'hybrid').map((engine) => {
                const isChecked = (form.engines || []).includes(engine)
                const color = ENGINE_COLORS[engine] || 'slate'
                return (
                  <label
                    key={engine}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                      isChecked
                        ? `border-${color}-500/60 bg-${color}-500/10`
                        : 'border-sidebar-border/40 bg-background/30 hover:border-sidebar-border'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleEngine(engine)}
                    />
                    <span className="text-sm">{ENGINE_LABELS[engine]}</span>
                  </label>
                )
              })}
            </div>
            {(form.engines || []).length === 0 && (
              <p className="text-xs text-rose-400 mt-1">Select at least one engine</p>
            )}
          </div>

          {/* Formatting Instructions */}
          <div>
            <Label className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              Formatting Instructions
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Describe how the Large Context Model should review, analyze, and compose the final output from all search results.
            </p>
            <Textarea
              value={form.formatting_instructions || ''}
              onChange={(e) => setForm({ ...form, formatting_instructions: e.target.value })}
              placeholder="e.g., Summarize key findings in bullet points, group by theme, include data citations, highlight actionable insights..."
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit_is_recurring"
                checked={form.is_recurring || false}
                onCheckedChange={(checked) => setForm({ ...form, is_recurring: !!checked })}
              />
              <Label htmlFor="edit_is_recurring" className="text-sm">Recurring research</Label>
            </div>
            {form.is_recurring && (
              <div>
                <Label>Schedule Interval</Label>
                <Select value={form.interval || 'daily'} onValueChange={(v) => setForm({ ...form, interval: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESEARCH_INTERVALS.map((interval) => (
                      <SelectItem key={interval} value={interval}>{INTERVAL_LABELS[interval]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Customer */}
          <div>
            <Label>Customer</Label>
            <Select
              value={form.customer_id || 'none'}
              onValueChange={(v) => setForm({ ...form, customer_id: v === 'none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Customer</SelectItem>
                {customers.map((c: Customer) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !form.name?.trim() || !form.query?.trim() || (form.engines || []).length === 0}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Create Research Dialog
// =============================================================================

function CreateResearchDialog({
  open,
  onOpenChange,
  onSubmit,
  customers,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateResearchItemRequest) => Promise<void>
  customers: Customer[]
  isLoading: boolean
}) {
  const [form, setForm] = useState<CreateResearchItemRequest>({
    name: '',
    query: '',
    description: '',
    engine: 'perplexity',
    engines: ['perplexity'],
    formatting_instructions: '',
    is_recurring: false,
  })

  const toggleEngine = (engine: string) => {
    const current = form.engines || []
    if (current.includes(engine)) {
      setForm({ ...form, engines: current.filter((e) => e !== engine) })
    } else {
      setForm({ ...form, engines: [...current, engine] })
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.query.trim()) return
    const engines = form.engines || ['perplexity']
    await onSubmit({
      ...form,
      engine: engines[0] || 'perplexity',
      engines,
    })
    setForm({ name: '', query: '', description: '', engine: 'perplexity', engines: ['perplexity'], formatting_instructions: '', is_recurring: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Telescope className="h-5 w-5 text-sky-500" />
            New Research Item
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input
              placeholder="e.g., Competitor Analysis - Acme Corp"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Research Query</Label>
            <Textarea
              placeholder="What would you like to research?"
              value={form.query}
              onChange={(e) => setForm({ ...form, query: e.target.value })}
              rows={3}
            />
          </div>

          {/* Search Engines — checkbox grid */}
          <div>
            <Label className="mb-2 block">Search Engines</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select one or more engines for parallel research.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SEARCH_ENGINES.filter(e => e !== 'hybrid').map((engine) => {
                const isChecked = (form.engines || []).includes(engine)
                const color = ENGINE_COLORS[engine] || 'slate'
                return (
                  <label
                    key={engine}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                      isChecked
                        ? `border-${color}-500/60 bg-${color}-500/10`
                        : 'border-sidebar-border/40 bg-background/30 hover:border-sidebar-border'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleEngine(engine)}
                    />
                    <span className="text-sm">{ENGINE_LABELS[engine]}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Formatting Instructions */}
          <div>
            <Label className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              Formatting Instructions
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              How should the LLM compose the final output from all search results?
            </p>
            <Textarea
              value={form.formatting_instructions || ''}
              onChange={(e) => setForm({ ...form, formatting_instructions: e.target.value })}
              placeholder="e.g., Summarize key findings in bullet points, group by theme, include data citations..."
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer</Label>
              <Select value={form.customer_id || 'none'} onValueChange={(v) => setForm({ ...form, customer_id: v === 'none' ? undefined : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Customer</SelectItem>
                  {customers.map((c: Customer) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_recurring"
              checked={form.is_recurring}
              onCheckedChange={(checked) => setForm({ ...form, is_recurring: !!checked })}
            />
            <Label htmlFor="is_recurring" className="text-sm">Recurring research</Label>
          </div>
          {form.is_recurring && (
            <div>
              <Label>Interval</Label>
              <Select value={form.interval || 'daily'} onValueChange={(v) => setForm({ ...form, interval: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_INTERVALS.map((interval) => (
                    <SelectItem key={interval} value={interval}>{INTERVAL_LABELS[interval]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !form.name.trim() || !form.query.trim() || (form.engines || []).length === 0}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
