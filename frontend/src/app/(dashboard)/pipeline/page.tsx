'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTranslation } from '@/lib/hooks/use-translation'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { notebookColumns } from '@/components/columns/notebook-columns'
import { useUsers } from '@/lib/hooks/use-users'
import { DealDrawer } from './components/DealDrawer'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
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
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PIPELINE_COLUMNS, PipelineType } from '@/lib/constants/pipelines'

// Dynamically import KanbanBoard to bypass SSR and avoid hydration errors with drag-and-drop
const KanbanBoard = dynamic(() => import('./components/KanbanBoard').then(mod => mod.KanbanBoard), {
  ssr: false,
})

export default function PipelinePage() {
  const { t } = useTranslation()
  const { data: notebooks, isLoading, refetch } = useNotebooks(false)
  const { data: users } = useUsers()

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.slice(0, 2).toUpperCase()
  }

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [activePipelineType, setActivePipelineType] = useState<PipelineType>('sales')

  // Hoisted state for deal drawer
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date())

  const handleDealClick = (id: string) => {
    setActiveNotebookId(id)
    setDrawerOpen(true)
  }

  // Filter notebooks by active pipeline type
  const filteredNotebooks = useMemo(() => {
    if (!notebooks) return []
    return notebooks.filter((nb) => {
      const type = nb.pipeline_type || 'sales'
      return type === activePipelineType
    })
  }, [notebooks, activePipelineType])

  // Calculate dynamic metrics based on active pipeline type
  const currentMetrics = useMemo(() => {
    const list = filteredNotebooks
    const total = list.length
    if (activePipelineType === 'research') {
      const active = list.filter(nb => nb.stage === 'researching' || nb.stage === 'analyzing').length
      const completed = list.filter(nb => nb.stage === 'completed').length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      return [
        { label: t('pipeline.totalResearch', 'Total Research Tasks'), value: total.toString(), icon: Briefcase, iconColor: 'text-amber-500', bgIcon: 'bg-amber-500/10 border-amber-500/20' },
        { label: t('pipeline.activeResearch', 'Active Research'), value: active.toString(), icon: TrendingUp, iconColor: 'text-cyan-500', bgIcon: 'bg-cyan-500/10 border-cyan-500/20' },
        { label: t('pipeline.completedResearch', 'Completed Tasks'), value: completed.toString(), icon: Award, iconColor: 'text-emerald-500', bgIcon: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: t('pipeline.completionRate', 'Completion Rate'), value: `${completionRate}%`, icon: Award, iconColor: 'text-violet-500', bgIcon: 'bg-violet-500/10 border-violet-500/20' },
      ]
    }
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
  // Calendar helpers
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const getDealsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return filteredNotebooks.filter(nb => !nb.archived && nb.close_date === dayStr)
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToday = () => setCurrentMonth(new Date())

  const pipelineInfo = useMemo(() => {
    switch (activePipelineType) {
      case 'research':
        return {
          title: t('pipeline.research.title', 'Research Pipeline'),
          subtitle: t('pipeline.research.subtitle', 'Track literature, data analyses, domain papers, and academic pipelines'),
        }
      case 'publication':
        return {
          title: t('pipeline.publication.title', 'Publication Queue'),
          subtitle: t('pipeline.publication.subtitle', 'Coordinate editorial refinement, peer reviews, drafts, and release tracking'),
        }
      default:
        return {
          title: t('pipeline.sales.title', 'Sales Pipeline'),
          subtitle: t('pipeline.sales.subtitle', 'Prospect intelligence tracking, visual deal flow, and client alignment'),
        }
    }
  }, [activePipelineType, t])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {pipelineInfo.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pipelineInfo.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={activePipelineType} onValueChange={(v) => setActivePipelineType(v as PipelineType)}>
                <SelectTrigger className="w-[200px] bg-background/55 backdrop-blur-md border-sidebar-border hover:bg-background/80 transition-colors">
                  <SelectValue placeholder="Select Pipeline" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-lg border-sidebar-border">
                  <SelectItem value="sales">Sales Pipeline</SelectItem>
                  <SelectItem value="research">Research Pipeline</SelectItem>
                  <SelectItem value="publication">Publication Queue</SelectItem>
                </SelectContent>
              </Select>
              <ViewToggle value={viewMode} onChange={setViewMode} showKanban={true} showList={true} showCalendar={true} />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="border-sidebar-border hover:bg-sidebar-accent">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currentMetrics.map((m, idx) => {
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
          </div>

          <div className="relative">
            {isLoading ? (
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

            ) : viewMode === 'table' ? (
              <DataTable
                columns={notebookColumns}
                data={filteredNotebooks}
                searchPlaceholder="Search items..."
                isLoading={isLoading}
                emptyMessage="No items in pipeline"
              />
            ) : viewMode === 'list' ? (
              /* Custom List View */
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
            ) : viewMode === 'calendar' ? (
              /* Custom Monthly Calendar View */
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
                            {dayDeals.map((nb) => {
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
    </AppShell>
  )
}
