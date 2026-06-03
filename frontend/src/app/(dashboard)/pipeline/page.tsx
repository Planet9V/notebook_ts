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
import { RefreshCw, TrendingUp, DollarSign, Briefcase, Award } from 'lucide-react'

// Dynamically import KanbanBoard to bypass SSR and avoid hydration errors with drag-and-drop
const KanbanBoard = dynamic(() => import('./components/KanbanBoard').then(mod => mod.KanbanBoard), {
  ssr: false,
})

export default function PipelinePage() {
  const { t } = useTranslation()
  const { data: notebooks, isLoading, refetch } = useNotebooks(false)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

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
              <ViewToggle value={viewMode} onChange={setViewMode} showKanban={true} />
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

          {/* Board / Table Container */}
          <div className="relative">
            {viewMode === 'table' ? (
              <DataTable
                columns={notebookColumns}
                data={notebooks || []}
                searchPlaceholder="Search deals..."
                isLoading={isLoading}
                emptyMessage="No deals in pipeline"
              />
            ) : isLoading ? (
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, col) => (
                  <div key={col} className="border border-sidebar-border/30 rounded-lg bg-background/20 backdrop-blur-sm p-3 space-y-3">
                    <div className="h-4 w-24 rounded bg-slate-700/40 animate-pulse" />
                    {Array.from({ length: 2 + (col % 3) }).map((_, card) => (
                      <div key={card} className="border border-white/5 rounded-md bg-slate-900/40 p-3 space-y-2">
                        <div className="h-3.5 w-full rounded bg-slate-700/30 animate-pulse" style={{ animationDelay: `${col * 0.1 + card * 0.05}s` }} />
                        <div className="h-3 w-2/3 rounded bg-slate-700/20 animate-pulse" style={{ animationDelay: `${col * 0.1 + card * 0.05 + 0.1}s` }} />
                        <div className="flex gap-2 pt-1">
                          <div className="h-5 w-16 rounded-full bg-slate-700/25 animate-pulse" />
                          <div className="h-5 w-12 rounded-full bg-slate-700/20 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <KanbanBoard notebooks={notebooks || []} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
