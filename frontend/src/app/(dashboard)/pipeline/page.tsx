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

// Dynamically import KanbanBoard to bypass SSR and avoid hydration errors with drag-and-drop
const KanbanBoard = dynamic(() => import('./components/KanbanBoard').then(mod => mod.KanbanBoard), {
  ssr: false,
})

const STAGE_COLORS: Record<string, string> = {
  bulk_import: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  data_enrichment: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  lead: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  research: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  technical_discovery: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  proposal: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  won: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
}

const STAGE_TEXT_COLORS: Record<string, string> = {
  bulk_import: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  data_enrichment: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  lead: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  research: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  technical_discovery: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  proposal: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  won: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
}

export default function PipelinePage() {
  const { t } = useTranslation()
  const { data: notebooks, isLoading, refetch } = useNotebooks(false)
  const { data: users } = useUsers()
  
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  
  // Hoisted state for deal drawer
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date())

  const handleDealClick = (id: string) => {
    setActiveNotebookId(id)
    setDrawerOpen(true)
  }

  // Calculate pipeline-wide KPI analytics
  const metrics = useMemo(() => {
    if (!notebooks) return { totalValue: 0, activeDeals: 0, wonValue: 0, winRate: 0 }

    const activeList = notebooks.filter(nb => !nb.archived)
    const totalValue = activeList.reduce((sum, nb) => sum + (nb.estimated_value || 0), 0)
    const activeDeals = activeList.filter(nb => (nb.stage || 'lead') !== 'won').length
    const wonList = activeList.filter(nb => nb.stage === 'won')
    const wonCount = wonList.length
    const wonValue = wonList.reduce((sum, nb) => sum + (nb.estimated_value || 0), 0)
    
    const totalDeals = activeList.length
    const winRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0

    return { totalValue, activeDeals, wonValue, winRate }
  }, [notebooks])

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.slice(0, 2).toUpperCase()
  }

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const getDealsForDay = (day: Date) => {
    if (!notebooks) return []
    const dayStr = format(day, 'yyyy-MM-dd')
    return notebooks.filter(nb => !nb.archived && nb.close_date === dayStr)
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToday = () => setCurrentMonth(new Date())

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('pipeline.title', 'B2B Sales Pipeline')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('pipeline.subtitle', 'Prospect intelligence tracking, visual deal flow, and client alignment')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ViewToggle value={viewMode} onChange={setViewMode} showKanban={true} showList={true} showCalendar={true} />
              <Button variant="outline" size="sm" onClick={() => refetch()} className="border-sidebar-border hover:bg-sidebar-accent">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('pipeline.totalPipeline', 'Total Pipeline')}
                  </p>
                  <p className="text-xl font-semibold mt-1 font-mono tracking-tight text-foreground">
                    ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('pipeline.activeDeals', 'Active Deals')}
                  </p>
                  <p className="text-xl font-semibold mt-1 font-mono tracking-tight text-foreground">
                    {metrics.activeDeals}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('pipeline.wonValue', 'Closed Won Value')}
                  </p>
                  <p className="text-xl font-semibold mt-1 font-mono tracking-tight text-foreground">
                    ${metrics.wonValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/40 backdrop-blur-md border-sidebar-border shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg p-2 bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('pipeline.winRate', 'Conversion Rate')}
                  </p>
                  <p className="text-xl font-semibold mt-1 font-mono tracking-tight text-foreground">
                    {metrics.winRate}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Board / Table / List / Calendar Container */}
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
                data={notebooks || []}
                searchPlaceholder="Search deals..."
                isLoading={isLoading}
                emptyMessage="No deals in pipeline"
              />
            ) : viewMode === 'list' ? (
              /* Custom List View */
              <div className="space-y-2">
                {notebooks?.filter(nb => !nb.archived).map((nb) => {
                  const stage = nb.stage || 'lead'
                  const colorClass = STAGE_COLORS[stage] || 'border-white/10 bg-slate-800/40 text-slate-400'
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
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Value</span>
                          <span className="text-xs font-bold text-emerald-400 mt-0.5">
                            ${nb.estimated_value?.toLocaleString() || '0'}
                          </span>
                        </div>

                        {/* Close Date */}
                        <div className="flex flex-col text-left font-mono min-w-[120px]">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Close Date</span>
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
                {(!notebooks || notebooks.filter(nb => !nb.archived).length === 0) && (
                  <div className="text-center py-12 border border-dashed border-sidebar-border rounded-xl">
                    <p className="text-sm text-muted-foreground">No deals in pipeline</p>
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
                              const stage = nb.stage || 'lead'
                              const textClass = STAGE_TEXT_COLORS[stage] || 'text-slate-400 bg-slate-800/40 border-slate-500/20'
                              
                              return (
                                <div
                                  key={nb.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDealClick(nb.id)
                                  }}
                                  className={`px-1.5 py-1 rounded text-[10px] font-medium border cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all flex flex-col gap-0.5 truncate ${textClass}`}
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
              <KanbanBoard notebooks={notebooks || []} onCardClick={handleDealClick} />
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
