'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useProjects } from '@/lib/hooks/use-projects'
import { useResearchItems } from '@/lib/hooks/use-research-items'
import type { Customer } from '@/lib/types/customer'
import type { Project } from '@/lib/types/project'
import type { ResearchItem } from '@/lib/types/research-item'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { DataTable } from '@/components/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { customerColumns } from '@/components/columns/customer-columns'
import {
  Plus,
  Search,
  Users,
  TrendingUp,
  FolderKanban,
  Telescope,
  Building,
  Globe,
  Mail,
  Phone,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'

export default function CustomerLedgerPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const router = useRouter()
  useEffect(() => {
    if (!embedded) {
      router.replace('/operations?tab=customer-ledger')
    }
  }, [embedded, router])

  useEffect(() => {
    document.title = 'Customer Ledger | Tetrel'
  }, [])

  const { data: customers = [], isLoading: customersLoading } = useCustomers()
  const { data: projects = [] } = useProjects()
  const { data: researchItems = [] } = useResearchItems()

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase()
    return customers.filter(
      (c: Customer) =>
        c.name?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.customer_type?.toLowerCase().includes(q)
    )
  }, [customers, searchQuery])

  // Filter by tab
  const displayCustomers = useMemo(() => {
    if (activeTab === 'all') return filteredCustomers
    return filteredCustomers.filter((c: Customer) => c.customer_type === activeTab)
  }, [filteredCustomers, activeTab])

  // Compute linked counts
  const customerStats = useMemo(() => {
    const map: Record<string, { projects: number; research: number }> = {}
    for (const c of customers) {
      const cid = c.id
      map[cid] = {
        projects: projects.filter((p: Project) => p.customer_id === cid).length,
        research: researchItems.filter((r: ResearchItem) => r.customer_id === cid).length,
      }
    }
    return map
  }, [customers, projects, researchItems])

  // Summary stats
  const stats = useMemo(() => ({
    total: customers.length,
    prospects: customers.filter((c: Customer) => c.customer_type === 'prospect').length,
    clients: customers.filter((c: Customer) => c.customer_type === 'client').length,
    partners: customers.filter((c: Customer) => c.customer_type === 'partner').length,
    activeProjects: projects.filter((p: Project) => p.status === 'active').length,
    activeResearch: researchItems.filter((r: ResearchItem) => r.status === 'active').length,
  }), [customers, projects, researchItems])

  const content = (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer Information Files (CIF) — Master record for every account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total CIFs</span>
            <span className="text-2xl font-bold">{stats.total}</span>
          </CardContent>
        </Card>
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold text-sky-400">Clients</span>
            <span className="text-2xl font-bold text-sky-400">{stats.clients}</span>
          </CardContent>
        </Card>
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold text-yellow-400">Prospects</span>
            <span className="text-2xl font-bold text-yellow-400">{stats.prospects}</span>
          </CardContent>
        </Card>
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold text-teal-400">Partners</span>
            <span className="text-2xl font-bold text-teal-400">{stats.partners}</span>
          </CardContent>
        </Card>
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold text-violet-400">Active Projs</span>
            <span className="text-2xl font-bold text-violet-400">{stats.activeProjects}</span>
          </CardContent>
        </Card>
        <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold text-rose-400">Active Res</span>
            <span className="text-2xl font-bold text-rose-400">{stats.activeResearch}</span>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar / Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="bg-sidebar-accent/10 border border-sidebar-border/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-sidebar-accent/30">All Accounts</TabsTrigger>
            <TabsTrigger value="client" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400">Clients</TabsTrigger>
            <TabsTrigger value="prospect" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">Prospects</TabsTrigger>
            <TabsTrigger value="partner" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400">Partners</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ledger..."
                className="pl-8 bg-sidebar-accent/5 border-sidebar-border/30 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0 outline-none">
          {customersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-[180px] bg-sidebar-accent/5 border-sidebar-border/30 animate-pulse" />
              ))}
            </div>
          ) : displayCustomers.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center bg-sidebar-accent/5 border-sidebar-border/30">
              <Users className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-semibold">No customers found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                No customer information files match your current filters.
              </p>
            </Card>
          ) : viewMode === 'table' ? (
            <Card className="bg-sidebar-accent/5 border-sidebar-border/30">
              <DataTable columns={customerColumns} data={displayCustomers} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayCustomers.map((customer: Customer) => (
                <Link key={customer.id} href={`/customers/${customer.id}`}>
                  <div className="group flex flex-col gap-4 p-5 rounded-xl border border-sidebar-border/30 bg-sidebar-accent/5 hover:bg-sidebar-accent/15 hover:border-sidebar-border/60 transition-all duration-300 cursor-pointer h-full justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-sky-400 shrink-0" />
                          <span className="font-bold text-foreground group-hover:text-sky-400 transition-colors line-clamp-1">
                            {customer.name}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            customer.customer_type === 'client'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : customer.customer_type === 'prospect'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          }
                        >
                          {customer.customer_type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {customer.industry && (
                          <Badge variant="outline" className="border-sidebar-border/40 text-xs">
                            {customer.industry}
                          </Badge>
                        )}
                        {customer.country && (
                          <Badge variant="outline" className="border-sidebar-border/40 text-xs flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {customer.country}
                          </Badge>
                        )}
                      </div>

                      {customer.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Linked items */}
                    <div className="flex items-center gap-3 pt-2 border-t border-sidebar-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderKanban className="h-3 w-3 text-sky-500" />
                        <span>{customerStats[customer.id]?.projects || 0} projects</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Telescope className="h-3 w-3 text-rose-500" />
                        <span>{customerStats[customer.id]?.research || 0} research</span>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  if (!embedded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background/50">
        <Users className="h-8 w-8 animate-pulse text-cyan-400" />
      </div>
    )
  }

  return content
}
