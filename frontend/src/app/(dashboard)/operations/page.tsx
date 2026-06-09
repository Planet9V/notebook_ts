'use client'

import React, { Suspense, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useLocations } from '@/lib/hooks/use-locations'
import { useResearchItems } from '@/lib/hooks/use-research-items'
import { useProjects } from '@/lib/hooks/use-projects'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { useTranslation } from '@/lib/hooks/use-translation'

// Embedded Workspace page imports
import PipelinePage from '@/app/(dashboard)/pipeline/page'
import CustomerLedgerPage from '@/app/(dashboard)/customer-ledger/page'
import { DeliveryTree } from '@/components/delivery/DeliveryTree'
import { AttachDocumentModal } from '@/components/delivery/AttachDocumentModal'

interface RecentItem {
  id: string
  name: string
  updated: string
  badge?: string
  badgeColor?: string
}

function OperationsWorkspaceContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tab = searchParams?.get('tab') || 'dashboard'
  const activeTab = ['dashboard', 'sales', 'projects', 'customer-ledger'].includes(tab)
    ? tab
    : 'dashboard'

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', val)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Document upload modal states
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false)
  const [attachCustomerId, setAttachCustomerId] = useState('')
  const [attachLocationId, setAttachLocationId] = useState<string | null>(null)

  const { data: customers = [], isLoading: customersLoading, refetch: refetchCustomers } = useCustomers()
  const { data: allLocations = [], refetch: refetchLocations } = useLocations()
  const { data: researchItems = [], isLoading: researchLoading, refetch: refetchResearch } = useResearchItems()
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects()
  const { data: notebooks = [], isLoading: notebooksLoading, refetch: refetchNotebooks } = useNotebooks(false)

  const isLoading = customersLoading || researchLoading || projectsLoading || notebooksLoading

  const handleRefreshAll = () => {
    refetchCustomers()
    refetchResearch()
    refetchProjects()
    refetchNotebooks()
    refetchLocations()
  }

  useEffect(() => {
    document.title = 'Operations Workspace | Tetrel'
  }, [])

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

  const formatTime = (dateStr: string): string => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return '—'
    }
  }

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
                  Operations Workspace
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Unified operations control across Sales CRM, Project Delivery, and Account Customer Ledger
              </p>
            </div>

            {activeTab === 'dashboard' && (
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
            )}
          </div>

          {/* Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Operations View</p>
              <TabsList className="w-full max-w-2xl grid grid-cols-4 bg-slate-900/60 p-1 border border-white/5 rounded-xl">
                <TabsTrigger value="dashboard" className="flex items-center justify-center gap-2 py-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="sales" className="flex items-center justify-center gap-2 py-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Sales CRM</span>
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center justify-center gap-2 py-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>Project Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="customer-ledger" className="flex items-center justify-center gap-2 py-2">
                  <Users className="h-4 w-4" />
                  <span>Customer Ledger</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Dashboard Tab Panels */}
            <TabsContent value="dashboard" className="mt-0 outline-none space-y-6">
              {isLoading ? (
                <DataPageSkeleton layout="kpi-row" className="mt-2" />
              ) : (
                <>
                  {/* KPI Summary Row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl p-4 pl-5 relative overflow-hidden shadow-md">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">Pipeline Deals</p>
                          <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">{kpis.totalPipeline}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl p-4 pl-5 relative overflow-hidden shadow-md">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-violet-500" />
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg p-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">Total Customers</p>
                          <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">{kpis.totalCustomers}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl p-4 pl-5 relative overflow-hidden shadow-md">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">Pending Research</p>
                          <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">{kpis.pendingResearch}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl p-4 pl-5 relative overflow-hidden shadow-md">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">Active Projects</p>
                          <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">{kpis.activeProjects}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Summary Cards */}
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-500/0" />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-cyan-400" />
                            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">Customer Ledger</CardTitle>
                          </div>
                          <div className="text-2xl font-bold font-mono text-cyan-400">{customers.length}</div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">accounts</p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        <div className="border-t border-white/5 pt-3">
                          {recentCustomers.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/50 text-center py-4 font-mono">No items yet</p>
                          ) : (
                            recentCustomers.map((item) => (
                              <div key={item.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/30 transition-colors">
                                <span className="text-xs text-slate-300 truncate max-w-[180px]">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(item.updated)}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => handleTabChange('customer-ledger')}
                          className="flex items-center justify-center gap-1.5 w-full pt-2 text-[10px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          View All
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-sky-500/0" />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Telescope className="h-5 w-5 text-sky-400" />
                            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">Research Intelligence</CardTitle>
                          </div>
                          <div className="text-2xl font-bold font-mono text-sky-400">{researchItems.length}</div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">research items</p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        <div className="border-t border-white/5 pt-3">
                          {recentResearch.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/50 text-center py-4 font-mono">No items yet</p>
                          ) : (
                            recentResearch.map((item) => (
                              <div key={item.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/30 transition-colors">
                                <span className="text-xs text-slate-300 truncate max-w-[180px]">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(item.updated)}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <Link
                          href="/research?tab=search"
                          className="flex items-center justify-center gap-1.5 w-full pt-2 text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          Go to Research
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-500/0" />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-emerald-400" />
                            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">Project Delivery</CardTitle>
                          </div>
                          <div className="text-2xl font-bold font-mono text-emerald-400">{projects.length}</div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">projects</p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        <div className="border-t border-white/5 pt-3">
                          {recentProjects.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/50 text-center py-4 font-mono">No items yet</p>
                          ) : (
                            recentProjects.map((item) => (
                              <div key={item.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/30 transition-colors">
                                <span className="text-xs text-slate-300 truncate max-w-[180px]">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(item.updated)}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => handleTabChange('projects')}
                          className="flex items-center justify-center gap-1.5 w-full pt-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          View All
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity Feed */}
                  <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-2xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider">Recent Activity</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentActivity.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">No recent activity</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {recentActivity.map((item, i) => (
                            <div key={`${item.system}-${item.id}-${i}`} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800/30 transition-colors group">
                              <div className="flex items-center gap-3 min-w-0">
                                <Badge variant="outline" className={`text-[7px] font-mono py-0 px-1.5 uppercase tracking-wide shrink-0 border-${item.systemColor}-500/30 bg-${item.systemColor}-500/10 text-${item.systemColor}-400`}>
                                  {item.system}
                                </Badge>
                                <span className="text-xs text-slate-200 font-medium truncate">{item.name}</span>
                                {item.badge && (
                                  <Badge variant="outline" className="text-[7px] font-mono py-0 px-1 uppercase tracking-wide border-white/10 bg-slate-800/40 text-slate-400">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-4">{formatTime(item.updated)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-0 outline-none">
              <PipelinePage embedded={true} overrideTab="sales" />
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-0 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 h-[calc(100vh-280px)] min-h-[500px]">
                  <DeliveryTree
                    activeLocationId={selectedLocationId}
                    activeCustomerId={selectedCustomerId}
                    onSelectLocation={(locId) => {
                      setSelectedLocationId(locId)
                      if (locId) {
                        const locObj = allLocations.find(l => l.id === locId)
                        if (locObj && locObj.customer_id) {
                          setSelectedCustomerId(locObj.customer_id)
                        }
                      }
                    }}
                    onSelectCustomer={(custId) => {
                      setSelectedCustomerId(custId)
                      setSelectedLocationId(null)
                    }}
                    onAttachDocument={(custId, locId) => {
                      setAttachCustomerId(custId)
                      setAttachLocationId(locId)
                      setIsAttachModalOpen(true)
                    }}
                  />
                </div>
                <div className="md:col-span-3">
                  <PipelinePage
                    embedded={true}
                    overrideTab="projects"
                    locationId={selectedLocationId}
                    customerId={selectedCustomerId}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Customer Ledger Tab */}
            <TabsContent value="customer-ledger" className="mt-0 outline-none">
              <CustomerLedgerPage embedded={true} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* Attach Document Modal */}
      {attachCustomerId && (
        <AttachDocumentModal
          open={isAttachModalOpen}
          onClose={() => {
            setIsAttachModalOpen(false)
            setAttachCustomerId('')
            setAttachLocationId(null)
          }}
          customerId={attachCustomerId}
          locationId={attachLocationId}
        />
      )}
    </AppShell>
  )
}

export default function OperationsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-cyan-400 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading Operations Workspace...</p>
        </div>
      </div>
    }>
      <OperationsWorkspaceContent />
    </Suspense>
  )
}
