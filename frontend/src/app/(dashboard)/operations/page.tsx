'use client'

import React, { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  Telescope,
  FolderKanban,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useResearchItems } from '@/lib/hooks/use-research-items'
import { useProjects } from '@/lib/hooks/use-projects'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'

interface RecentItem {
  id: string
  name: string
  updated: string
  badge?: string
  badgeColor?: string
}

export default function OperationsHubPage() {
  const { data: customers = [], isLoading: customersLoading, refetch: refetchCustomers } = useCustomers()
  const { data: researchItems = [], isLoading: researchLoading, refetch: refetchResearch } = useResearchItems()
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects()
  const { data: notebooks = [], isLoading: notebooksLoading, refetch: refetchNotebooks } = useNotebooks(false)

  const isLoading = customersLoading || researchLoading || projectsLoading || notebooksLoading

  const handleRefreshAll = () => {
    refetchCustomers()
    refetchResearch()
    refetchProjects()
    refetchNotebooks()
  }

  // Compute recent items for each system
  const recentCustomers: RecentItem[] = useMemo(() => {
    return [...customers]
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        name: c.name,
        updated: c.updated,
        badge: c.customer_type,
        badgeColor: c.customer_type === 'client' ? 'emerald' : c.customer_type === 'prospect' ? 'cyan' : 'violet',
      }))
  }, [customers])

  const recentResearch: RecentItem[] = useMemo(() => {
    return [...researchItems]
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        name: r.name,
        updated: r.updated,
        badge: r.engine,
        badgeColor: 'sky',
      }))
  }, [researchItems])

  const recentProjects: RecentItem[] = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        updated: p.updated,
        badge: p.priority,
        badgeColor: p.priority === 'critical' ? 'red' : p.priority === 'high' ? 'orange' : 'slate',
      }))
  }, [projects])

  // KPI calculations
  const kpis = useMemo(() => ({
    totalPipeline: notebooks.length,
    activeProjects: projects.filter((p) => p.stage !== 'closed').length,
    pendingResearch: researchItems.filter((r) => r.stage === 'queued' || r.stage === 'researching').length,
    totalCustomers: customers.length,
  }), [notebooks, projects, researchItems, customers])

  // Unified recent activity
  const recentActivity = useMemo(() => {
    const all: (RecentItem & { system: string; systemColor: string })[] = [
      ...recentCustomers.map((item) => ({ ...item, system: 'Customer Ledger', systemColor: 'cyan' })),
      ...recentResearch.map((item) => ({ ...item, system: 'Research Intel', systemColor: 'sky' })),
      ...recentProjects.map((item) => ({ ...item, system: 'Project Delivery', systemColor: 'emerald' })),
    ]
    return all
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 8)
  }, [recentCustomers, recentResearch, recentProjects])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  Operations Hub
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Unified view across Customer Ledger, Research Intelligence, and Project Delivery
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>

          {isLoading ? (
            <DataPageSkeleton layout="kpi-row" className="mt-2" />
          ) : (
          <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Pipeline Deals" value={kpis.totalPipeline} color="cyan" />
            <KpiCard icon={<Users className="h-5 w-5" />} label="Total Customers" value={kpis.totalCustomers} color="violet" />
            <KpiCard icon={<Activity className="h-5 w-5" />} label="Pending Research" value={kpis.pendingResearch} color="sky" />
            <KpiCard icon={<FolderKanban className="h-5 w-5" />} label="Active Projects" value={kpis.activeProjects} color="emerald" />
          </div>

          {/* System Summary Cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SystemCard
              title="Customer Ledger"
              icon={<Users className="h-5 w-5" />}
              count={customers.length}
              countLabel="customers"
              recentItems={recentCustomers}
              href="/customer-ledger"
              accentColor="cyan"
              isLoading={customersLoading}
            />
            <SystemCard
              title="Research Intelligence"
              icon={<Telescope className="h-5 w-5" />}
              count={researchItems.length}
              countLabel="research items"
              recentItems={recentResearch}
              href="/research"
              accentColor="sky"
              isLoading={researchLoading}
            />
            <SystemCard
              title="Project Delivery"
              icon={<FolderKanban className="h-5 w-5" />}
              count={projects.length}
              countLabel="projects"
              recentItems={recentProjects}
              href="/projects"
              accentColor="emerald"
              isLoading={projectsLoading}
            />
          </div>

          {/* Recent Activity Feed */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">
                  Recent Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((item, i) => (
                    <div
                      key={`${item.system}-${item.id}-${i}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[7px] font-mono py-0 px-1.5 uppercase tracking-wide shrink-0 border-${item.systemColor}-500/30 bg-${item.systemColor}-500/10 text-${item.systemColor}-400`}
                        >
                          {item.system}
                        </Badge>
                        <span className="text-xs text-slate-200 font-medium truncate">
                          {item.name}
                        </span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-[7px] font-mono py-0 px-1 uppercase tracking-wide border-white/10 bg-slate-800/40 text-slate-400"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-4">
                        {formatTime(item.updated)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// --- Sub-components ---

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
      <div className={`absolute top-0 left-0 bottom-0 w-1 bg-${color}-500`} />
      <CardContent className="flex items-center gap-4 p-4 pl-5">
        <div className={`rounded-lg p-2.5 bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function SystemCard({
  title,
  icon,
  count,
  countLabel,
  recentItems,
  href,
  accentColor,
  isLoading,
}: {
  title: string
  icon: React.ReactNode
  count: number
  countLabel: string
  recentItems: RecentItem[]
  href: string
  accentColor: string
  isLoading: boolean
}) {
  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-${accentColor}-500 to-${accentColor}-500/0`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`text-${accentColor}-400`}>{icon}</div>
            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">
              {title}
            </CardTitle>
          </div>
          <div className={`text-2xl font-bold font-mono text-${accentColor}-400`}>
            {isLoading ? '—' : count}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          {countLabel}
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        <div className="border-t border-white/5 pt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : recentItems.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 text-center py-4 font-mono">
              No items yet
            </p>
          ) : (
            recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/30 transition-colors"
              >
                <span className="text-xs text-slate-300 truncate max-w-[180px]">
                  {item.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {formatTime(item.updated)}
                </span>
              </div>
            ))
          )}
        </div>
        <Link
          href={href}
          className={`flex items-center justify-center gap-1.5 w-full pt-2 text-[10px] font-mono uppercase tracking-wider text-${accentColor}-400 hover:text-${accentColor}-300 transition-colors`}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  )
}

function formatTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return '—'
  }
}
