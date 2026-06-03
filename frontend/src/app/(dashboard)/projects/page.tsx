'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects'
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
import { Progress } from '@/components/ui/progress'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { projectColumns } from '@/components/columns/project-columns'
import {
  Plus,
  Search,
  FolderKanban,
  LayoutGrid,
  Kanban,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react'
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_STAGE_COLORS,
  PROJECT_PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/constants/project-stages'
import type { Project, CreateProjectRequest } from '@/lib/types/project'
import { toast } from 'sonner'

const STAGE_ICONS: Record<string, typeof Clock> = {
  planning: Clock,
  kickoff: Calendar,
  in_progress: Loader2,
  review: AlertTriangle,
  delivered: CheckCircle,
  closed: XCircle,
}

export default function ProjectDeliveryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    document.title = 'Projects | Tetrel'
  }, [])

  const { data: projects = [], isLoading } = useProjects()
  const { data: customers = [] } = useCustomers()
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()

  // Filter
  const filteredProjects = useMemo(() => {
    let result = projects
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    if (priorityFilter !== 'all') {
      result = result.filter((p) => p.priority === priorityFilter)
    }
    return result.filter((p) => p.status !== 'cancelled')
  }, [projects, searchQuery, priorityFilter])

  // Group by stage
  const stageGroups = useMemo(() => {
    const groups: Record<string, Project[]> = {}
    for (const stage of PROJECT_STAGES) {
      groups[stage] = filteredProjects.filter((p) => p.stage === stage)
    }
    return groups
  }, [filteredProjects])

  // Stats
  const stats = useMemo(() => ({
    total: projects.filter((p) => p.status !== 'cancelled').length,
    active: projects.filter((p) => p.status === 'active').length,
    delivered: projects.filter((p) => p.stage === 'delivered' || p.stage === 'closed').length,
    highPriority: projects.filter((p) => p.priority === 'high' || p.priority === 'critical').length,
  }), [projects])

  const handleStageChange = useCallback(async (projectId: string, newStage: string) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, data: { stage: newStage } })
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
              <FolderKanban className="h-6 w-6 text-emerald-500" />
              Project Delivery
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track delivery from planning through completion
            </p>
          </div>
          <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-cyan-500' },
            { label: 'Active', value: stats.active, color: 'text-emerald-500' },
            { label: 'Delivered', value: stats.delivered, color: 'text-sky-500' },
            { label: 'High Priority', value: stats.highPriority, color: 'text-rose-500' },
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
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PROJECT_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ViewToggle value={viewMode} onChange={setViewMode} showKanban={true} />
        </div>

        {/* Kanban view */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
            {PROJECT_STAGES.filter(s => s !== 'closed').map((stage) => {
              const StageIcon = STAGE_ICONS[stage] || Clock
              const stageProjects = stageGroups[stage] || []
              return (
                <div key={stage} className="flex-shrink-0 w-72 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <StageIcon className={`h-4 w-4 text-${PROJECT_STAGE_COLORS[stage]}-500`} />
                    <span className="text-sm font-medium text-foreground">{PROJECT_STAGE_LABELS[stage]}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{stageProjects.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                    {stageProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} customers={customers} />
                    ))}
                    {stageProjects.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-sidebar-border rounded-lg">
                        No projects
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
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} customers={customers} />
            ))}
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && (
          <DataTable
            columns={projectColumns}
            data={filteredProjects}
            searchPlaceholder="Search projects..."
            isLoading={isLoading}
            emptyMessage="No projects found"
          />
        )}

        {/* Create dialog */}
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (data) => {
            try {
              await createMutation.mutateAsync(data)
              toast.success('Project created')
              setCreateOpen(false)
            } catch {
              toast.error('Failed to create project')
            }
          }}
          customers={customers}
          isLoading={createMutation.isPending}
        />
      </div>
    </AppShell>
  )
}

function ProjectCard({ project, customers }: { project: Project; customers: Customer[] }) {
  const customer = customers.find((c: Customer) => c.id === project.customer_id)
  const priorityColor = PRIORITY_COLORS[project.priority as keyof typeof PRIORITY_COLORS] || 'slate'
  const tasksDone = project.tasks?.filter((t) => t.status === 'done').length || 0
  const tasksTotal = project.tasks?.length || 0

  return (
    <div className="bg-background/40 backdrop-blur-md border border-sidebar-border rounded-lg p-3 hover:border-emerald-500/50 transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground truncate flex-1 group-hover:text-emerald-500 transition-colors" title={project.name}>
          {project.name}
        </h4>
        <Badge variant="outline" className={`text-xs border-${priorityColor}-500/50 text-${priorityColor}-500 shrink-0 ml-1`}>
          {PRIORITY_LABELS[project.priority as keyof typeof PRIORITY_LABELS] || project.priority}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mb-2">
        {customer && (
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {customer.name}
          </Badge>
        )}
        {project.project_type && (
          <Badge variant="outline" className="text-xs">{project.project_type}</Badge>
        )}
      </div>

      {/* Progress bar */}
      {tasksTotal > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Tasks</span>
            <span>{tasksDone}/{tasksTotal}</span>
          </div>
          <Progress value={(tasksDone / tasksTotal) * 100} className="h-1.5" />
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{project.start_date || 'No start date'}</span>
        </div>
        {project.assigned_to && (
          <span className="truncate max-w-[100px]" title={project.assigned_to}>{project.assigned_to}</span>
        )}
      </div>
    </div>
  )
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  customers,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateProjectRequest) => Promise<void>
  customers: Customer[]
  isLoading: boolean
}) {
  const [form, setForm] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    priority: 'medium',
    stage: 'planning',
    project_type: '',
  })

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await onSubmit(form)
    setForm({ name: '', description: '', priority: 'medium', stage: 'planning', project_type: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-emerald-500" />
            New Project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Project Name</Label>
            <Input
              placeholder="e.g., Penetration Test - Acme Corp Q4"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Project scope and objectives..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.project_type || 'general'} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="penetration_test">Penetration Test</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !form.name.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
