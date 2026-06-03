'use client'

import { useState, useEffect, useMemo } from 'react'
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

export default function CustomerLedgerPage() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

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

  return (
    <AppShell>
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

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Accounts', value: stats.total, icon: Users, color: 'text-cyan-500' },
            { label: 'Prospects', value: stats.prospects, icon: TrendingUp, color: 'text-amber-500' },
            { label: 'Clients', value: stats.clients, icon: Building, color: 'text-emerald-500' },
            { label: 'Partners', value: stats.partners, icon: Globe, color: 'text-violet-500' },
            { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: 'text-sky-500' },
            { label: 'Active Research', value: stats.activeResearch, icon: Telescope, color: 'text-rose-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-background/40 backdrop-blur-md border border-sidebar-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-semibold text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {/* Type tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="prospect">Prospects ({stats.prospects})</TabsTrigger>
            <TabsTrigger value="client">Clients ({stats.clients})</TabsTrigger>
            <TabsTrigger value="partner">Partners ({stats.partners})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {customersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-background/40 border border-sidebar-border rounded-lg p-4 h-40 animate-pulse" />
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <DataTable
                columns={customerColumns}
                data={displayCustomers}
                searchPlaceholder="Search customers..."
                isLoading={customersLoading}
                emptyMessage="No customers found"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayCustomers.map((customer: Customer) => (
                  <Link key={customer.id} href={`/customers/${customer.id?.split(':')[1] || customer.id}`}>
                    <div className="bg-background/40 backdrop-blur-md border border-sidebar-border rounded-lg p-4 hover:border-cyan-500/50 transition-all cursor-pointer group">
                      {/* Customer header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-cyan-500 transition-colors">
                            {customer.name}
                          </h3>
                          {customer.industry && (
                            <p className="text-xs text-muted-foreground mt-0.5">{customer.industry}</p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            customer.customer_type === 'client'
                              ? 'border-emerald-500/50 text-emerald-500'
                              : customer.customer_type === 'partner'
                              ? 'border-violet-500/50 text-violet-500'
                              : 'border-amber-500/50 text-amber-500'
                          }`}
                        >
                          {customer.customer_type || 'prospect'}
                        </Badge>
                      </div>

                      {/* Contact info */}
                      <div className="space-y-1 mb-3">
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
    </AppShell>
  )
}
