'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { toast } from 'sonner'

// Date fns
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'

// Icons
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Briefcase,
  Award,
  Building,
  ArrowUpRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Telescope,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  Archive,
  Zap,
  Globe,
  BookOpen,
  Loader2,
  Pencil,
  FileText,
  Eye,
  Trash,
  Save,
  Plus,
  Search,
  FolderKanban,
  Users,
  XCircle,
  Mail,
  Linkedin,
  Twitter,
} from 'lucide-react'

// Hooks
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useUsers } from '@/lib/hooks/use-users'
import {
  useResearchItems,
  useCreateResearchItem,
  useUpdateResearchItem,
  useDeleteResearchItem,
  useExecuteResearch,
  useEnhanceResearch,
  useApproveResearch,
} from '@/lib/hooks/use-research-items'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useTransformations } from '@/lib/hooks/use-transformations'
import { useProjects, useCreateProject } from '@/lib/hooks/use-projects'
import { usePublicationsCalendar } from '@/lib/hooks/use-publications'

// Types
import type { Customer } from '@/lib/types/customer'
import type { Transformation } from '@/lib/types/transformations'
import type { ResearchItem, CreateResearchItemRequest, UpdateResearchItemRequest } from '@/lib/types/research-item'
import type { Project, CreateProjectRequest } from '@/lib/types/project'
import type { ScheduledPost } from '@/lib/types/publications'

interface DeepResearchEvent {
  timestamp?: string
  stage?: string
  message?: string
}

// Columns
import { notebookColumns } from '@/components/columns/notebook-columns'
import { researchColumns } from '@/components/columns/research-columns'
import { projectColumns } from '@/components/columns/project-columns'

// Constants
import { PIPELINE_COLUMNS } from '@/lib/constants/pipelines'
import {
  RESEARCH_STAGES,
  RESEARCH_STAGE_LABELS,
  SEARCH_ENGINES,
  ENGINE_LABELS,
  ENGINE_COLORS,
  RESEARCH_INTERVALS,
  INTERVAL_LABELS,
} from '@/lib/constants/research-stages'
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/constants/project-stages'

// Subcomponents
import { DealDrawer } from './components/DealDrawer'

// Dynamically import KanbanBoard to bypass SSR and avoid hydration errors with drag-and-drop
const KanbanBoard = dynamic(() => import('./components/KanbanBoard').then(mod => mod.KanbanBoard), {
  ssr: false,
})

const RESEARCH_STAGE_ICONS: Record<string, typeof Clock> = {
  queued: Clock,
  researching: Loader2,
  analyzing: BookOpen,
  review_enhance: Eye,
  completed: CheckCircle,
  archived: Archive,
}

const PROJECT_STAGE_ICONS: Record<string, typeof Clock> = {
  planning: Clock,
  kickoff: CalendarIcon,
  in_progress: Loader2,
  review: AlertTriangle,
  delivered: CheckCircle,
  closed: XCircle,
}

export default function PipelinePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OperationsCenter />
    </Suspense>
  )
}

function OperationsCenter() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const rawTab = searchParams?.get('tab')
  const activeTab = (rawTab === 'sales' || rawTab === 'research' || rawTab === 'projects' || rawTab === 'publication')
    ? rawTab
    : 'sales'

  // Decoupled conditional queries
  const isSalesOrPublication = activeTab === 'sales' || activeTab === 'publication'
  
  const { data: notebooks, isLoading: isLoadingNotebooks, refetch: refetchNotebooks } = useNotebooks(
    false,
    { enabled: isSalesOrPublication }
  )
  const { data: scheduledPosts = [], refetch: refetchScheduledPosts } = usePublicationsCalendar(
    undefined,
    undefined,
    { enabled: activeTab === 'publication' }
  )
  const { data: users } = useUsers()

  const { data: researchItems = [], isLoading: isLoadingResearch, refetch: refetchResearch } = useResearchItems(
    undefined,
    { enabled: activeTab === 'research' }
  )
  const { data: customers = [] } = useCustomers({ enabled: activeTab === 'research' || activeTab === 'projects' })
  const { data: transformations = [] } = useTransformations({ enabled: activeTab === 'research' })

  const { data: projects = [], isLoading: isLoadingProjects, refetch: refetchProjects } = useProjects(
    undefined,
    { enabled: activeTab === 'projects' }
  )

  // Document Title update
  useEffect(() => {
    const tabNames: Record<string, string> = {
      sales: 'Sales CRM',
      research: 'Research Hub',
      projects: 'Project Delivery',
      publication: 'Publication Queue',
    }
    const name = tabNames[activeTab] || 'Operations Center'
    document.title = `${name} | Tetrel`
  }, [activeTab])

  // Tab change handler
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  // -------------------------------------------------------------
  // Sales / Publication State and Logic
  // -------------------------------------------------------------
  const [salesOrPubViewMode, setSalesOrPubViewMode] = useState<ViewMode>('kanban')
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date())

  const activePipelineType = activeTab === 'publication' ? 'publication' : 'sales'

  const handleDealClick = (id: string) => {
    setActiveNotebookId(id)
    setDrawerOpen(true)
  }

  const filteredNotebooks = useMemo(() => {
    if (!notebooks) return []
    return notebooks.filter((nb) => {
      const type = nb.pipeline_type || 'sales'
      return type === activePipelineType
    })
  }, [notebooks, activePipelineType])

  const currentMetrics = useMemo(() => {
    const list = filteredNotebooks
    const total = list.length
    if (activePipelineType === 'publication') {
      const active = list.filter(nb => nb.stage === 'review' || nb.stage === 'refinement').length
      const published = list.filter(nb => nb.stage === 'publish').length
      const publicationRate = total > 0 ? Math.round((published / total) * 100) : 0
      return [
        { label: t('pipeline.totalPublications', 'Total Publications'), value: total.toString(), icon: Briefcase, iconColor: 'text-amber-500', bgIcon: 'bg-amber-500/10 border-amber-500/20' },
        { label: t('pipeline.inReview', 'In Review / Editing'), value: active.toString(), icon: TrendingUp, iconColor: 'text-cyan-500', bgIcon: 'bg-cyan-500/10 border-cyan-500/20' },
        { label: t('pipeline.publishedDocs', 'Published Docs'), value: published.toString(), icon: Award, iconColor: 'text-emerald-500', bgIcon: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: t('pipeline.publicationRate', 'Publication Rate'), value: `${publicationRate}%`, icon: Award, iconColor: 'text-violet-500', bgIcon: 'bg-violet-500/10 border-violet-500/20' },
      ]
    }
    // Sales pipeline metrics
    const totalValue = list.reduce((sum, nb) => sum + (nb.estimated_value || 0), 0)
    const activeDeals = list.filter(nb => nb.stage !== 'won').length
    const wonList = list.filter(nb => nb.stage === 'won')
    const wonValue = wonList.reduce((sum, nb) => sum + (nb.estimated_value || 0), 0)
    const winRate = total > 0 ? Math.round((wonList.length / total) * 100) : 0
    return [
      { label: t('pipeline.totalPipeline', 'Total Pipeline'), value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, iconColor: 'text-amber-500', bgIcon: 'bg-amber-500/10 border-amber-500/20' },
      { label: t('pipeline.activeDeals', 'Active Deals'), value: activeDeals.toString(), icon: Briefcase, iconColor: 'text-cyan-500', bgIcon: 'bg-cyan-500/10 border-cyan-500/20' },
      { label: t('pipeline.wonValue', 'Closed Won Value'), value: `$${wonValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, iconColor: 'text-emerald-500', bgIcon: 'bg-emerald-500/10 border-emerald-500/20' },
      { label: t('pipeline.winRate', 'Conversion Rate'), value: `${winRate}%`, icon: Award, iconColor: 'text-violet-500', bgIcon: 'bg-violet-500/10 border-violet-500/20' },
    ]
  }, [filteredNotebooks, activePipelineType, t])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const getDealsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayNotebooks = filteredNotebooks.filter(nb => !nb.archived && nb.close_date === dayStr).map(nb => ({ ...nb, itemType: 'notebook' as const }))
    
    if (activeTab === 'publication') {
      const dayPosts = (scheduledPosts || []).filter((post: ScheduledPost) => {
        if (!post.scheduled_time) return false
        return post.scheduled_time.startsWith(dayStr)
      }).map(post => ({ ...post, itemType: 'post' as const }))
      
      return [...dayNotebooks, ...dayPosts]
    }
    
    return dayNotebooks
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToday = () => setCurrentMonth(new Date())

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.slice(0, 2).toUpperCase()
  }

  // -------------------------------------------------------------
  // Research Hub State and Logic
  // -------------------------------------------------------------
  const [researchViewMode, setResearchViewMode] = useState<ViewMode>('kanban')
  const [researchSearchQuery, setResearchSearchQuery] = useState('')
  const [researchEngineFilter, setResearchEngineFilter] = useState('all')
  const [createResearchOpen, setCreateResearchOpen] = useState(false)
  const [editResearchItem, setEditResearchItem] = useState<ResearchItem | null>(null)

  const createResearchMutation = useCreateResearchItem()
  const updateResearchMutation = useUpdateResearchItem()
  const executeResearchMutation = useExecuteResearch()
  const approveResearchMutation = useApproveResearch()
  const deleteResearchMutation = useDeleteResearchItem()

  const filteredResearchItems = useMemo(() => {
    let result = researchItems
    if (researchSearchQuery.trim()) {
      const q = researchSearchQuery.toLowerCase()
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.query.toLowerCase().includes(q)
      )
    }
    if (researchEngineFilter !== 'all') {
      result = result.filter((i) =>
        i.engines?.includes(researchEngineFilter) || i.engine === researchEngineFilter
      )
    }
    return result
  }, [researchItems, researchSearchQuery, researchEngineFilter])

  const researchStageGroups = useMemo(() => {
    const groups: Record<string, ResearchItem[]> = {}
    for (const stage of RESEARCH_STAGES) {
      groups[stage] = filteredResearchItems.filter((i) => i.stage === stage && i.status !== 'cancelled')
    }
    return groups
  }, [filteredResearchItems])

  const researchStats = useMemo(() => ({
    total: researchItems.length,
    active: researchItems.filter((i) => i.status === 'active').length,
    recurring: researchItems.filter((i) => i.is_recurring).length,
    completed: researchItems.filter((i) => i.stage === 'completed').length,
  }), [researchItems])

  const handleResearchStageChange = useCallback(async (itemId: string, newStage: string) => {
    try {
      await updateResearchMutation.mutateAsync({ id: itemId, data: { stage: newStage } })
      toast.success('Stage updated')
    } catch {
      toast.error('Failed to update stage')
    }
  }, [updateResearchMutation])

  const handleResearchDelete = useCallback(async (itemId: string) => {
    if (confirm('Are you sure you want to delete this research item?')) {
      try {
        await deleteResearchMutation.mutateAsync(itemId)
        toast.success('Research item deleted')
      } catch {
        toast.error('Failed to delete research item')
      }
    }
  }, [deleteResearchMutation])

  // -------------------------------------------------------------
  // Project Delivery State and Logic
  // -------------------------------------------------------------
  const [projectsViewMode, setProjectsViewMode] = useState<ViewMode>('kanban')
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [projectPriorityFilter, setProjectPriorityFilter] = useState('all')
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  const createProjectMutation = useCreateProject()

  const filteredProjects = useMemo(() => {
    let result = projects
    if (projectSearchQuery.trim()) {
      const q = projectSearchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    if (projectPriorityFilter !== 'all') {
      result = result.filter((p) => p.priority === projectPriorityFilter)
    }
    return result.filter((p) => p.status !== 'cancelled')
  }, [projects, projectSearchQuery, projectPriorityFilter])

  const projectStageGroups = useMemo(() => {
    const groups: Record<string, Project[]> = {}
    for (const stage of PROJECT_STAGES) {
      groups[stage] = filteredProjects.filter((p) => p.stage === stage)
    }
    return groups
  }, [filteredProjects])

  const projectStats = useMemo(() => ({
    total: projects.filter((p) => p.status !== 'cancelled').length,
    active: projects.filter((p) => p.status === 'active').length,
    delivered: projects.filter((p) => p.stage === 'delivered' || p.stage === 'closed').length,
    highPriority: projects.filter((p) => p.priority === 'high' || p.priority === 'critical').length,
  }), [projects])



  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Unified Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-sidebar-border/40 pb-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                {activeTab === 'sales' && 'Sales CRM'}
                {activeTab === 'research' && 'Research Hub'}
                {activeTab === 'projects' && 'Project Delivery'}
                {activeTab === 'publication' && 'Publication Queue'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'sales' && 'Sales CRM — Prospect intelligence tracking, visual deal flow, and client alignment'}
                {activeTab === 'research' && 'Research Hub — AI-powered research across Perplexity, Tavily, Valyu and more'}
                {activeTab === 'projects' && 'Project Delivery — Track delivery from planning through completion'}
                {activeTab === 'publication' && 'Publication Queue — Coordinate editorial refinement, peer reviews, drafts, and release tracking'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Workspace Select Switcher */}
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-[200px] bg-background/55 backdrop-blur-md border-sidebar-border hover:bg-background/80 transition-colors">
                  <SelectValue placeholder="Select Workspace" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-lg border-sidebar-border">
                  <SelectItem value="sales">Sales CRM</SelectItem>
                  <SelectItem value="research">Research Hub</SelectItem>
                  <SelectItem value="projects">Project Delivery</SelectItem>
                  <SelectItem value="publication">Publication Queue</SelectItem>
                </SelectContent>
              </Select>

              {/* View toggle based on active tab */}
              <ViewToggle
                value={
                  activeTab === 'sales' || activeTab === 'publication'
                    ? salesOrPubViewMode
                    : activeTab === 'research'
                    ? researchViewMode
                    : projectsViewMode
                }
                onChange={(mode) => {
                  if (activeTab === 'sales' || activeTab === 'publication') {
                    setSalesOrPubViewMode(mode)
                  } else if (activeTab === 'research') {
                    setResearchViewMode(mode)
                  } else if (activeTab === 'projects') {
                    setProjectsViewMode(mode)
                  }
                }}
                showKanban={true}
                showList={activeTab === 'sales' || activeTab === 'publication'}
                showCalendar={activeTab === 'sales' || activeTab === 'publication'}
              />

              {/* Action buttons based on active tab */}
              {activeTab === 'research' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCreateResearchOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Research
                </Button>
              )}

              {activeTab === 'projects' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCreateProjectOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              )}

              {/* Refresh button based on active tab */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'sales' || activeTab === 'publication') {
                    refetchNotebooks()
                    if (activeTab === 'publication') {
                      refetchScheduledPosts()
                    }
                  } else if (activeTab === 'research') {
                    refetchResearch()
                  } else if (activeTab === 'projects') {
                    refetchProjects()
                  }
                }}
                className="border-sidebar-border hover:bg-sidebar-accent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sales CRM or Publication Queue Stats */}
            {isSalesOrPublication && currentMetrics.map((m, idx) => {
              const Icon = m.icon
              return (
                <Card key={idx} className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-lg p-2 ${m.iconColor} ${m.bgIcon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {m.label}
                      </p>
                      <p className="text-xl font-semibold mt-1 font-mono tracking-tight text-foreground">
                        {m.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Research Hub Stats */}
            {activeTab === 'research' && [
              { label: 'Total Tasks', value: researchStats.total, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: Telescope },
              { label: 'Active Tasks', value: researchStats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: TrendingUp },
              { label: 'Recurring', value: researchStats.recurring, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20', icon: RefreshCw },
              { label: 'Completed', value: researchStats.completed, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', icon: CheckCircle },
            ].map((s, idx) => {
              const Icon = s.icon
              return (
                <Card key={idx} className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-lg p-2 ${s.color} ${s.bg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Project Delivery Stats */}
            {activeTab === 'projects' && [
              { label: 'Total Projects', value: projectStats.total, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: FolderKanban },
              { label: 'Active Projects', value: projectStats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: TrendingUp },
              { label: 'Delivered', value: projectStats.delivered, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', icon: CheckCircle },
              { label: 'High Priority', value: projectStats.highPriority, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20', icon: AlertTriangle },
            ].map((s, idx) => {
              const Icon = s.icon
              return (
                <Card key={idx} className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-lg p-2 ${s.color} ${s.bg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Main Content Workspace */}
          <div className="relative">
            {/* Sales / Publication Workspaces */}
            {isSalesOrPublication && (
              isLoadingNotebooks ? (
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, col) => (
                    <div key={col} className="border border-sidebar-border/30 rounded-lg bg-background/20 backdrop-blur-sm p-3 space-y-3">
                      <div className="h-4 w-24 rounded bg-slate-700/40 animate-pulse" />
                      {Array.from({ length: 2 + (col % 3) }).map((_, card) => (
                        <div key={card} className="border border-white/5 rounded-md bg-slate-900/40 p-3 space-y-2">
                          <div className="h-3.5 w-full rounded bg-slate-700/30 animate-pulse" />
                          <div className="h-3 w-2/3 rounded bg-slate-700/20 animate-pulse" />
                          <div className="flex gap-2 pt-1">
                            <div className="h-5 w-16 rounded-full bg-slate-700/25 animate-pulse" />
                            <div className="h-5 w-12 rounded-full bg-slate-700/20 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : salesOrPubViewMode === 'table' ? (
                <DataTable
                  columns={notebookColumns}
                  data={filteredNotebooks}
                  searchPlaceholder="Search items..."
                  isLoading={isLoadingNotebooks}
                  emptyMessage="No items in pipeline"
                />
              ) : salesOrPubViewMode === 'list' ? (
                <div className="space-y-2">
                  {filteredNotebooks.map((nb) => {
                    const stage = nb.stage || PIPELINE_COLUMNS[activePipelineType].stages[0]
                    const colorInfo = PIPELINE_COLUMNS[activePipelineType].colors[stage]
                    const colorClass = colorInfo?.colorClass || 'border-white/10 bg-slate-800/40 text-slate-400'
                    const assignedUser = users?.find(u => u.id === nb.assigned_to)
                    
                    return (
                      <div
                        key={nb.id}
                        onClick={() => handleDealClick(nb.id)}
                        className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-sidebar-border bg-background/35 backdrop-blur-sm hover:bg-sidebar-accent/35 cursor-pointer transition-all duration-200 gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="rounded-lg p-2 bg-sidebar-accent/50 text-muted-foreground border border-sidebar-border/50 shrink-0">
                            <Building className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-foreground tracking-tight hover:text-primary transition-colors truncate">
                                {nb.name}
                              </h4>
                              <Badge variant="outline" className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide shrink-0 ${colorClass}`}>
                                {stage.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {nb.client_name || 'No client account linked'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
                          {/* Value */}
                          <div className="flex flex-col text-left font-mono min-w-[100px]">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Value</span>
                            <span className="text-xs font-bold text-emerald-400 mt-0.5">
                              ${nb.estimated_value?.toLocaleString() || '0'}
                            </span>
                          </div>

                          {/* Close Date */}
                          <div className="flex flex-col text-left font-mono min-w-[120px]">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Close Date</span>
                            {nb.close_date ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                {nb.close_date}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/45 mt-0.5">—</span>
                            )}
                          </div>

                          {/* Owner / Assignee */}
                          <div className="flex flex-col items-start min-w-[110px]">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Owner</span>
                            {assignedUser ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div
                                  className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/25 text-violet-300 border border-violet-500/40 text-[9px] font-bold uppercase shrink-0"
                                  title={`Assigned to ${assignedUser.username}`}
                                >
                                  {getInitials(assignedUser.username)}
                                </div>
                                <span className="text-xs text-slate-300 font-medium truncate max-w-[80px]" title={assignedUser.username}>
                                  {assignedUser.username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/45 mt-0.5 font-mono">Unassigned</span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 pl-2">
                            {nb.customer_id && (
                              <Link
                                href={`/customers/${nb.customer_id.replace(/^customer:/, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                passHref
                              >
                                <Button type="button" variant="outline" size="sm" className="h-8 border-sidebar-border hover:bg-sidebar-accent text-xs font-semibold gap-1">
                                  Account
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
                            <Link
                              href={`/notebooks/${nb.id}`}
                              onClick={(e) => e.stopPropagation()}
                              passHref
                            >
                              <Button type="button" size="sm" className="h-8 bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground text-xs font-semibold gap-1 border border-sidebar-border/30">
                                Workspace
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredNotebooks.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-sidebar-border rounded-xl">
                      <p className="text-sm text-muted-foreground">No records in pipeline</p>
                    </div>
                  )}
                </div>
              ) : salesOrPubViewMode === 'calendar' ? (
                <div className="space-y-4">
                  {/* Calendar Toolbar */}
                  <div className="flex items-center justify-between bg-background/35 border border-sidebar-border rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 border-sidebar-border" onClick={prevMonth} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold text-sm tracking-tight text-foreground px-2 font-mono">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8 border-sidebar-border" onClick={nextMonth} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 border-sidebar-border font-medium text-xs" onClick={goToday}>
                      Today
                    </Button>
                  </div>

                  {/* Calendar Grid Container */}
                  <div className="border border-sidebar-border rounded-xl overflow-hidden bg-background/20 backdrop-blur-sm shadow-inner">
                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 border-b border-sidebar-border bg-sidebar-accent/25 text-center py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    {/* Grid Days */}
                    <div className="grid grid-cols-7 divide-x divide-y divide-sidebar-border/40 min-h-[500px]">
                      {calendarDays.map((day, idx) => {
                        const dayDeals = getDealsForDay(day)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isToday = isSameDay(day, new Date())
                        
                        return (
                          <div
                            key={idx}
                            className={`min-h-[100px] p-2 space-y-1.5 flex flex-col relative transition-colors duration-150 ${
                              isCurrentMonth ? 'bg-background/10' : 'bg-background/5 text-muted-foreground/35'
                            } ${isToday ? 'bg-primary/5 border border-primary/20' : ''}`}
                          >
                            {/* Day number */}
                            <span
                              className={`text-xs font-mono font-bold leading-none ${
                                isToday
                                  ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm'
                                  : isCurrentMonth
                                  ? 'text-foreground/80'
                                  : 'text-muted-foreground/30'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>

                            {/* Deal List */}
                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] pr-0.5 scrollbar-thin">
                              {dayDeals.map((item) => {
                                if (item.itemType === 'notebook') {
                                  const nb = item
                                  const stage = nb.stage || PIPELINE_COLUMNS[activePipelineType].stages[0]
                                  const colorInfo = PIPELINE_COLUMNS[activePipelineType].colors[stage]
                                  const colorClass = colorInfo?.colorClass || 'text-slate-400 bg-slate-800/40 border-slate-500/20'
                                  
                                  return (
                                    <div
                                      key={nb.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDealClick(nb.id)
                                      }}
                                      className={`px-1.5 py-1 rounded text-[10px] font-medium border cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all flex flex-col gap-0.5 truncate ${colorClass}`}
                                      title={`${nb.name} (${nb.client_name || 'No client'})`}
                                    >
                                      <span className="font-semibold truncate leading-tight">{nb.name}</span>
                                      {nb.estimated_value ? (
                                        <span className="text-[8px] font-mono font-bold text-emerald-400/90 tracking-tight leading-none mt-0.5">
                                          ${nb.estimated_value.toLocaleString()}
                                        </span>
                                      ) : null}
                                    </div>
                                  )
                                } else {
                                  const post = item as unknown as ScheduledPost
                                  const Icon = post.channel === 'email' ? Mail : post.channel === 'linkedin' ? Linkedin : Twitter
                                  
                                  const statusColors = {
                                    published: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-950/60',
                                    failed: 'text-red-400 bg-red-950/40 border-red-500/20 hover:bg-red-950/60',
                                    queued: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20 hover:bg-cyan-950/60',
                                    draft: 'text-amber-400 bg-amber-950/40 border-amber-500/20 hover:bg-amber-950/60'
                                  }
                                  
                                  const colorClass = statusColors[post.status] || 'text-slate-400 bg-slate-800/40 border-slate-500/20 hover:bg-slate-800/60'
                                  
                                  return (
                                    <div
                                      key={post.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        router.push('/publications')
                                      }}
                                      className={`px-1.5 py-1 rounded text-[10px] font-medium border cursor-pointer transition-all flex items-center gap-1 truncate ${colorClass}`}
                                      title={`[${post.channel.toUpperCase()}] ${post.title} (${post.status})`}
                                    >
                                      <Icon className="h-3 w-3 shrink-0" />
                                      <span className="font-semibold truncate leading-tight">{post.title}</span>
                                    </div>
                                  )
                                }
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <KanbanBoard notebooks={filteredNotebooks} onCardClick={handleDealClick} pipelineType={activePipelineType} />
              )
            )}

            {/* Research Hub Workspace */}
            {activeTab === 'research' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search research items..."
                      value={researchSearchQuery}
                      onChange={(e) => setResearchSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={researchEngineFilter} onValueChange={setResearchEngineFilter}>
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
                </div>

                {isLoadingResearch ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : researchViewMode === 'kanban' ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
                    {RESEARCH_STAGES.filter(s => s !== 'archived').map((stage) => {
                      const StageIcon = RESEARCH_STAGE_ICONS[stage] || Clock
                      const stageItems = researchStageGroups[stage] || []
                      return (
                        <div key={stage} className="flex-shrink-0 w-72 flex flex-col">
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <StageIcon className={`h-4 w-4 ${
                              stage === 'queued' ? 'text-slate-500' :
                              stage === 'researching' ? 'text-sky-500' :
                              stage === 'analyzing' ? 'text-violet-500' :
                              stage === 'review_enhance' ? 'text-amber-500' :
                              stage === 'completed' ? 'text-emerald-500' :
                              stage === 'archived' ? 'text-zinc-500' : 'text-slate-500'
                            }`} />
                            <span className="text-sm font-medium text-foreground">{RESEARCH_STAGE_LABELS[stage]}</span>
                            <Badge variant="outline" className="text-xs ml-auto">{stageItems.length}</Badge>
                          </div>
                          <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                            {stageItems.map((item) => (
                              <ResearchCard
                                key={item.id}
                                item={item}
                                onExecute={() => executeResearchMutation.mutate(item.id)}
                                onEdit={() => setEditResearchItem(item)}
                                onStageChange={handleResearchStageChange}
                                onApprove={() => approveResearchMutation.mutate(item.id)}
                                onDelete={() => handleResearchDelete(item.id)}
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
                ) : researchViewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredResearchItems.filter(i => i.status !== 'cancelled').map((item) => (
                      <ResearchCard
                        key={item.id}
                        item={item}
                        onExecute={() => executeResearchMutation.mutate(item.id)}
                        onEdit={() => setEditResearchItem(item)}
                        onStageChange={handleResearchStageChange}
                        onApprove={() => approveResearchMutation.mutate(item.id)}
                        onDelete={() => handleResearchDelete(item.id)}
                        customers={customers}
                      />
                    ))}
                  </div>
                ) : (
                  <DataTable
                    columns={researchColumns}
                    data={filteredResearchItems}
                    searchPlaceholder="Search research items..."
                    isLoading={isLoadingResearch}
                    emptyMessage="No research items"
                  />
                )}
              </div>
            )}

            {/* Project Delivery Workspace */}
            {activeTab === 'projects' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={projectPriorityFilter} onValueChange={setProjectPriorityFilter}>
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
                </div>

                {isLoadingProjects ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : projectsViewMode === 'kanban' ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
                    {PROJECT_STAGES.filter(s => s !== 'closed').map((stage) => {
                      const StageIcon = PROJECT_STAGE_ICONS[stage] || Clock
                      const stageProjects = projectStageGroups[stage] || []
                      return (
                        <div key={stage} className="flex-shrink-0 w-72 flex flex-col">
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <StageIcon className={`h-4 w-4 ${
                              stage === 'planning' ? 'text-slate-500' :
                              stage === 'kickoff' ? 'text-sky-500' :
                              stage === 'in_progress' ? 'text-amber-500' :
                              stage === 'review' ? 'text-violet-500' :
                              stage === 'delivered' ? 'text-emerald-500' :
                              stage === 'closed' ? 'text-zinc-500' : 'text-slate-500'
                            }`} />
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
                ) : projectsViewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} customers={customers} />
                    ))}
                  </div>
                ) : (
                  <DataTable
                    columns={projectColumns}
                    data={filteredProjects}
                    searchPlaceholder="Search projects..."
                    isLoading={isLoadingProjects}
                    emptyMessage="No projects found"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Deal Details & RAG Chat Drawer */}
      <DealDrawer
        notebookId={activeNotebookId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Create Research Dialog */}
      <CreateResearchDialog
        open={createResearchOpen}
        onOpenChange={setCreateResearchOpen}
        onSubmit={async (data) => {
          try {
            await createResearchMutation.mutateAsync(data)
            toast.success('Research item created')
            setCreateResearchOpen(false)
          } catch {
            toast.error('Failed to create research item')
          }
        }}
        customers={customers}
        transformations={transformations}
        isLoading={createResearchMutation.isPending}
      />

      {/* Edit & Review Research Dialog */}
      {editResearchItem && (
        <EditResearchDialog
          open={!!editResearchItem}
          onOpenChange={(open) => { if (!open) setEditResearchItem(null) }}
          item={researchItems.find((i) => i.id === editResearchItem.id) || editResearchItem}
          onSubmit={async (data) => {
            try {
              await updateResearchMutation.mutateAsync({ id: editResearchItem.id, data })
              toast.success('Research item updated')
              setEditResearchItem(null)
            } catch {
              toast.error('Failed to update research item')
            }
          }}
          customers={customers}
          transformations={transformations}
          isLoading={updateResearchMutation.isPending}
        />
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSubmit={async (data) => {
          try {
            await createProjectMutation.mutateAsync(data)
            toast.success('Project created')
            setCreateProjectOpen(false)
          } catch {
            toast.error('Failed to create project')
          }
        }}
        customers={customers}
        isLoading={createProjectMutation.isPending}
      />
    </AppShell>
  )
}

// -------------------------------------------------------------
// Sub-components: Research Hub
// -------------------------------------------------------------
function parseReferences(text: string) {
  const references: Array<{ label: string; url: string }> = []
  if (!text) return references
  
  // Format: [Source 1]: http://example.com
  const refDefRegex = /\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/gi
  let match
  const seenUrls = new Set<string>()
  
  while ((match = refDefRegex.exec(text)) !== null) {
    const label = match[0].match(/\[([^\]]+)\]/)?.[1] || match[1].trim()
    const url = match[2].trim()
    if (!seenUrls.has(url)) {
      seenUrls.add(url)
      references.push({ label, url })
    }
  }

  // Format: [Source 1](http://example.com)
  const inlineRefRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi
  while ((match = inlineRefRegex.exec(text)) !== null) {
    const label = match[1].trim()
    const url = match[2].trim()
    if ((label.toLowerCase().includes('source') || /^\d+$/.test(label)) && !seenUrls.has(url)) {
      seenUrls.add(url)
      references.push({ label, url })
    }
  }

  return references
}

function ResearchCard({
  item,
  onExecute,
  onEdit,
  onApprove,
  onDelete,
  customers,
}: {
  item: ResearchItem
  onExecute: () => void
  onEdit: () => void
  onStageChange: (id: string, stage: string) => void
  onApprove: () => void
  onDelete: () => void
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
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.query}</p>

      {item.is_deep_research && item.stage === 'researching' && (
        <div className="mb-2 p-2 bg-sky-500/10 rounded border border-sky-500/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">Deep Researching</span>
            <span className="text-[10px] text-muted-foreground font-medium capitalize">
              Step: {item.deep_research_state?.toLowerCase() || 'clarifying'}...
            </span>
          </div>
          <div className="flex gap-1">
            {['clarifying', 'planning', 'gathering', 'synthesizing', 'reporting'].map((step, idx) => {
              const steps = ['clarifying', 'planning', 'gathering', 'synthesizing', 'reporting']
              const activeStep = item.deep_research_state?.toLowerCase() || 'clarifying'
              const currentIdx = steps.indexOf(activeStep)
              
              let bgClass = 'bg-sidebar-border'
              if (idx === currentIdx) {
                bgClass = 'bg-sky-500 animate-pulse'
              } else if (idx < currentIdx) {
                bgClass = 'bg-sky-600/70'
              }
              
              return (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${bgClass}`}
                  title={step.charAt(0).toUpperCase() + step.slice(1)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Engine badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {item.is_deep_research && (
          <Badge variant="outline" className="text-[10px] py-0 border-sky-500/50 text-sky-400 bg-sky-500/5 font-semibold flex items-center gap-0.5">
            <Telescope className="h-2.5 w-2.5" />
            Deep Research
          </Badge>
        )}
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

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/75 mb-2">
        <Clock className="h-3 w-3 text-muted-foreground/50" />
        <span>Last run: {item.last_run ? new Date(item.last_run).toLocaleString() : 'Never'}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>{item.run_count} runs</span>
        </div>
        {item.stage === 'review_enhance' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-amber-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onApprove()
            }}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approve
          </Button>
        )}
        {item.stage !== 'completed' && item.stage !== 'review_enhance' && item.stage !== 'archived' && (
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

interface EditResearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ResearchItem
  onSubmit: (data: UpdateResearchItemRequest) => Promise<void>
  customers: Customer[]
  transformations: Transformation[]
  isLoading: boolean
}

function EditResearchDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  customers,
  transformations = [],
  isLoading,
}: EditResearchDialogProps) {
  const enhanceMutation = useEnhanceResearch()
  const approveMutation = useApproveResearch()
  const updateMutation = useUpdateResearchItem()
  const [enhanceDirections, setEnhanceDirections] = useState('')
  const [editableContent, setEditableContent] = useState(item.results_content || '')

  useEffect(() => {
    setEditableContent(item.results_content || '')
  }, [item.results_content])

  const [form, setForm] = useState<UpdateResearchItemRequest>({
    name: item.name,
    query: item.query,
    description: item.description || '',
    engines: item.engines?.length ? [...item.engines] : (item.engine ? [item.engine] : ['perplexity']),
    formatting_instructions: item.formatting_instructions || '',
    is_recurring: item.is_recurring,
    interval: item.interval,
    customer_id: item.customer_id,
    transformation_id: item.transformation_id,
    is_deep_research: item.is_deep_research || false,
  })

  const references = useMemo(() => parseReferences(editableContent), [editableContent])

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

  const handleEnhance = async () => {
    if (!enhanceDirections.trim()) return
    await enhanceMutation.mutateAsync({ id: item.id, directions: enhanceDirections })
    setEnhanceDirections('')
  }

  const handleApprove = async () => {
    if (editableContent !== (item.results_content || '')) {
      try {
        await updateMutation.mutateAsync({
          id: item.id,
          data: { results_content: editableContent }
        })
      } catch {
        toast.error('Failed to save edits before approval')
        return
      }
    }
    await approveMutation.mutateAsync(item.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-sky-500" />
            Edit & Review Research
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={item.stage === 'review_enhance' ? 'review' : 'config'} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-sidebar-border/30">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="review" disabled={!item.results_content && item.stage !== 'review_enhance' && !item.is_deep_research}>
              Review & Enhance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-5 py-2">
            <div>
              <Label>Title</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Research item name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this research task"
                rows={2}
              />
            </div>

            <div>
              <Label>Research Prompt</Label>
              <Textarea
                value={form.query || ''}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                placeholder="What would you like to research?"
                rows={3}
              />
            </div>

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

            <div>
              <Label>Transformation Template</Label>
              <Select
                value={form.transformation_id || 'none'}
                onValueChange={(val) => setForm({ ...form, transformation_id: val === 'none' ? null : val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a transformation (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Transformation (Direct Research)</SelectItem>
                  {transformations.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Applies the prompt formatting instructions of the selected transformation intelligently to structure your research findings.
              </p>
            </div>

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

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="edit_is_deep_research"
                  checked={form.is_deep_research || false}
                  onCheckedChange={(checked) => setForm({ ...form, is_deep_research: !!checked })}
                />
                <Label htmlFor="edit_is_deep_research" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Telescope className="h-4 w-4 text-sky-500" />
                  Enable Deep Research
                </Label>
              </div>
              {form.is_deep_research && (
                <div className="mt-2 p-3 bg-sky-500/5 rounded-lg border border-sky-500/20 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-sky-400 flex items-center gap-1">
                    <span>Deep Research Stages</span>
                  </p>
                  <ol className="space-y-1.5 list-none pl-0">
                    <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">1. Clarifying:</span> <span>The AI queries the LLM to refine and restate goals.</span></li>
                    <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">2. Planning:</span> <span>The AI breaks down the query into a structured research plan.</span></li>
                    <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">3. Gathering:</span> <span>Parallel queries are executed across Perplexity, Tavily, and other search engines, with findings merged and URLs deduplicated.</span></li>
                    <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">4. Synthesizing:</span> <span>Multiple documents are cross-referenced and synthesized.</span></li>
                    <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">5. Reporting:</span> <span>A formatted markdown report is generated with inline citations.</span></li>
                  </ol>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-4 border-t border-sidebar-border/30">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !form.name?.trim() || !form.query?.trim() || (form.engines || []).length === 0}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Save Config
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="review" className="space-y-4 py-2">
              {item.is_deep_research && (
                <div className="mb-4 p-3 bg-sky-500/5 rounded-lg border border-sky-500/20">
                  <h5 className="text-xs font-semibold text-sky-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Telescope className="h-3.5 w-3.5" />
                    Deep Research Status: {item.deep_research_state || 'clarifying'}
                  </h5>
                  <div className="grid grid-cols-5 gap-2 relative mb-4">
                    {['clarifying', 'planning', 'gathering', 'synthesizing', 'reporting'].map((step, idx) => {
                      const steps = ['clarifying', 'planning', 'gathering', 'synthesizing', 'reporting']
                      const activeStep = item.deep_research_state?.toLowerCase() || 'clarifying'
                      const currentIdx = steps.indexOf(activeStep)
                      
                      let textClass = 'text-muted-foreground'
                      let borderClass = 'border-sidebar-border bg-sidebar-border/10'
                      let lineClass = 'bg-sidebar-border'
                      
                      if (idx === currentIdx) {
                        textClass = 'text-sky-400 font-semibold'
                        borderClass = 'border-sky-500 bg-sky-500/10 shadow-[0_0_8px_rgba(14,165,233,0.3)] animate-pulse'
                        lineClass = 'bg-sky-500'
                      } else if (idx < currentIdx) {
                        textClass = 'text-sky-500/80 font-medium'
                        borderClass = 'border-sky-600/60 bg-sky-600/5'
                        lineClass = 'bg-sky-600/70'
                      }

                      return (
                        <div key={step} className="flex flex-col items-center relative text-center">
                          {idx < 4 && (
                            <div className={`absolute top-3.5 left-[50%] right-[-50%] h-[2px] z-0 ${lineClass}`} />
                          )}
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold z-10 ${borderClass}`}>
                            {idx + 1}
                          </div>
                          <span className={`text-[10px] mt-1.5 capitalize z-10 ${textClass}`}>{step}</span>
                        </div>
                      )
                    })}
                  </div>

                  {item.deep_research_events && (item.deep_research_events as DeepResearchEvent[]).length > 0 && (
                    <div className="mt-3 space-y-1.5 bg-background/50 p-2.5 rounded border border-sidebar-border/50 max-h-36 overflow-y-auto text-[11px] font-mono w-full overflow-x-hidden">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">Execution Event Logs:</p>
                      {(item.deep_research_events as DeepResearchEvent[]).map((evt, eidx) => (
                        <div key={eidx} className="flex items-start gap-2 text-muted-foreground break-words w-full">
                          <span className="text-sky-500 shrink-0">[{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}]</span>
                          <span className="text-foreground/90 font-medium shrink-0">[{evt.stage}]:</span>
                          <span className="text-muted-foreground flex-1 min-w-0 break-words whitespace-pre-wrap">{evt.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {item.results_content ? (
                <div className="w-full">
                  <MarkdownEditor
                    value={editableContent}
                    onChange={(val) => setEditableContent(val || '')}
                    height={400}
                    preview="live"
                    className="border border-sidebar-border/60 rounded-md overflow-hidden bg-background/50"
                  />
                </div>
              ) : (
                <div className="border border-sidebar-border/60 bg-sidebar-border/10 rounded-lg p-4 prose prose-invert prose-xs max-w-none dark:prose-invert">
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    {item.stage === 'researching' ? 'Research is currently executing...' : 'No research findings generated yet.'}
                  </p>
                </div>
              )}

            {references.length > 0 && (
              <div className="p-3 bg-sidebar-border/10 rounded-md border border-sidebar-border/60">
                <h5 className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Sources & Citations ({references.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {references.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-sidebar-border/20 rounded border border-sidebar-border/30 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-xs"
                    >
                      <Badge variant="secondary" className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 font-mono">
                        {ref.label}
                      </Badge>
                      <span className="truncate text-muted-foreground hover:text-foreground">{ref.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Improvement Directions (AI Rewrite)
              </Label>
              <Textarea
                placeholder="e.g. Focus more on segment revenue breakdown, add more bullet points for locations, make formatting very formal..."
                value={enhanceDirections}
                onChange={(e) => setEnhanceDirections(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnhance}
                disabled={enhanceMutation.isPending || !enhanceDirections.trim() || !item.results_content}
                className="text-amber-500 hover:text-amber-400"
              >
                {enhanceMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                )}
                Enhance Findings
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await updateMutation.mutateAsync({
                      id: item.id,
                      data: { results_content: editableContent }
                    })
                    toast.success('Edits saved successfully')
                  } catch {
                    toast.error('Failed to save edits')
                  }
                }}
                disabled={updateMutation.isPending || editableContent === (item.results_content || '')}
                className="text-sky-500 border-sky-500/30 hover:bg-sky-500/10 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Edits
              </Button>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                {item.stage === 'review_enhance' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || !item.results_content}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Approve & Complete
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface CreateResearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateResearchItemRequest) => Promise<void>
  customers: Customer[]
  transformations: Transformation[]
  isLoading: boolean
}

function CreateResearchDialog({
  open,
  onOpenChange,
  onSubmit,
  customers,
  transformations = [],
  isLoading,
}: CreateResearchDialogProps) {
  const [form, setForm] = useState<CreateResearchItemRequest>({
    name: '',
    query: '',
    description: '',
    engine: 'perplexity',
    engines: ['perplexity'],
    formatting_instructions: '',
    is_recurring: false,
    transformation_id: null,
    is_deep_research: false,
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
    setForm({ name: '', query: '', description: '', engine: 'perplexity', engines: ['perplexity'], formatting_instructions: '', is_recurring: false, transformation_id: null, is_deep_research: false })
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

          <div>
            <Label>Transformation Template</Label>
            <Select
              value={form.transformation_id || 'none'}
              onValueChange={(val) => setForm({ ...form, transformation_id: val === 'none' ? null : val })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a transformation (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Transformation (Direct Research)</SelectItem>
                {transformations.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Applies the prompt formatting instructions of the selected transformation intelligently to structure your research findings.
            </p>
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

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="is_deep_research"
              checked={form.is_deep_research || false}
              onCheckedChange={(checked) => setForm({ ...form, is_deep_research: !!checked })}
            />
            <Label htmlFor="is_deep_research" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
              <Telescope className="h-4 w-4 text-sky-500" />
              Enable Deep Research
            </Label>
          </div>
          {form.is_deep_research && (
            <div className="mt-2 p-3 bg-sky-500/5 rounded-lg border border-sky-500/20 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-sky-400 flex items-center gap-1">
                <span>Deep Research Stages</span>
              </p>
              <ol className="space-y-1.5 list-none pl-0">
                <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">1. Clarifying:</span> <span>The AI queries the LLM to refine and restate goals.</span></li>
                <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">2. Planning:</span> <span>The AI breaks down the query into a structured research plan.</span></li>
                <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">3. Gathering:</span> <span>Parallel queries are executed across Perplexity, Tavily, and other search engines, with findings merged and URLs deduplicated.</span></li>
                <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">4. Synthesizing:</span> <span>Multiple documents are cross-referenced and synthesized.</span></li>
                <li className="flex gap-1.5"><span className="text-sky-400 font-medium shrink-0">5. Reporting:</span> <span>A formatted markdown report is generated with inline citations.</span></li>
              </ol>
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

// -------------------------------------------------------------
// Sub-components: Project Delivery
// -------------------------------------------------------------
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

      {tasksTotal > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Tasks</span>
            <span>{tasksDone}/{tasksTotal}</span>
          </div>
          <Progress value={(tasksDone / tasksTotal) * 100} className="h-1.5" />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          <span>{project.start_date || 'No start date'}</span>
        </div>
        {project.assigned_to && (
          <span className="truncate max-w-[100px]" title={project.assigned_to}>{project.assigned_to}</span>
        )}
      </div>
    </div>
  )
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateProjectRequest) => Promise<void>
  customers: Customer[]
  isLoading: boolean
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  customers,
  isLoading,
}: CreateProjectDialogProps) {
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
