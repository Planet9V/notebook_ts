'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/data-table/DataTable'
import { ImportWizard } from '@/components/import/ImportWizard'
import CustomerForm from '@/components/customers/CustomerForm'
import {
  Users,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Plus,
  Building,
  ChevronRight,
  Download,
  Upload,
  Trash2,

} from 'lucide-react'
import { useCustomers, useDeleteCustomer } from '@/lib/hooks/use-customers'
import { customersApi } from '@/lib/api/customers'
import { CustomerMetrics } from '@/lib/types/customer'
import { useToast } from '@/lib/hooks/use-toast'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

/* ─── Column definitions ───────────────────────────────────────────── */

const customerColumns: ColumnDef<CustomerMetrics, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Client Name',
    cell: ({ row }) => {
      const c = row.original
      const id = c.id.replace('customer:', '')
      return (
        <Link href={`/customers/${id}`} className="flex flex-col gap-0.5 hover:underline">
          <span className="font-bold text-slate-200 text-xs tracking-wide">{c.name}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[260px]" title={c.website || 'No website registered'}>
            {c.website || 'No website registered'}
          </span>
        </Link>
      )
    },
  },
  {
    accessorKey: 'customer_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.customer_type
      if (!type) return <span className="text-muted-foreground">—</span>
      const variants: Record<string, string> = {
        prospect: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
        client: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
        partner: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
        vendor: 'border-violet-500/20 bg-violet-500/5 text-violet-400',
      }
      return (
        <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0 ${variants[type] || ''}`}>
          {type}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'tier',
    header: 'Tier',
    cell: ({ row }) => {
      const tier = row.original.tier
      if (!tier) return <span className="text-muted-foreground">—</span>
      const labels: Record<string, string> = {
        enterprise: 'Enterprise',
        mid_market: 'Mid-Market',
        smb: 'SMB',
      }
      return (
        <Badge variant="outline" className="text-[8px] font-mono border-white/10 bg-slate-950/40 text-slate-300 py-0 px-1.5 uppercase">
          {labels[tier] || tier}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'industry',
    header: 'Industry / Sector',
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {c.sectors && c.sectors.length > 0 ? (
            c.sectors.slice(0, 2).map(s => (
              <Badge key={s} variant="outline" className="text-[8px] font-mono border-white/5 bg-slate-950/40 text-slate-300 py-0.5 px-1 lowercase tracking-wide">
                {s}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-950/40 text-slate-300 py-0.5 uppercase tracking-wide">
              {c.industry}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      if (!status) return <span className="text-muted-foreground">—</span>
      const variants: Record<string, string> = {
        active: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
        inactive: 'border-slate-500/20 bg-slate-500/5 text-slate-400',
        churned: 'border-red-500/20 bg-red-500/5 text-red-400',
      }
      return (
        <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0 ${variants[status] || ''}`}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'notebook_count',
    header: 'Notebooks',
    cell: ({ row }) => <span className="text-slate-300 font-semibold">{row.original.notebook_count} Active</span>,
  },
  {
    accessorKey: 'total_value',
    header: 'Pipeline Value',
    cell: ({ row }) => (
      <span className="text-slate-300 font-bold">
        ${(row.original.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: 'compliance_progress',
    header: 'Maturity',
    cell: ({ row }) => {
      const progress = row.original.compliance_progress
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-cyan-400 font-bold">{progress}%</span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const id = row.original.id.replace('customer:', '')
      return (
        <Link href={`/customers/${id}`}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-slate-700/50">
            <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-cyan-400" />
          </Button>
        </Link>
      )
    },
  },
]

/* ─── Page Component ──────────────────────────────────────────────── */

export default function CustomerLedgerPage() {
  const { data: customers = [], isLoading, refetch } = useCustomers()
  const deleteCustomerMutation = useDeleteCustomer()
  const { toast } = useToast()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [bulkDeleteSelection, setBulkDeleteSelection] = useState<CustomerMetrics[] | null>(null)

  // KPIs
  const kpis = useMemo(() => {
    if (customers.length === 0) return { totalClients: 0, pipelineValue: 0, avgCompliance: 0 }
    const totalClients = customers.length
    const pipelineValue = customers.reduce((sum, c) => sum + (c.total_value || 0), 0)
    const complianceList = customers.map(c => c.compliance_progress || 0)
    const avgCompliance = Math.round(complianceList.reduce((sum, c) => sum + c, 0) / totalClients)
    return { totalClients, pipelineValue, avgCompliance }
  }, [customers])

  // Bulk actions
  const handleBulkDelete = async (selected: CustomerMetrics[]) => {
    setBulkDeleteSelection(selected)
  }

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteSelection) return
    for (const c of bulkDeleteSelection) {
      deleteCustomerMutation.mutate(c.id)
    }
    setBulkDeleteSelection(null)
  }

  const handleExportAll = async () => {
    try {
      const blob = await customersApi.exportCustomers('csv', true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Export Complete', description: 'Customer data downloaded as CSV' })
    } catch {
      toast({ title: 'Export Failed', description: 'Could not export customer data', variant: 'destructive' })
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
                <Users className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  CRM Customer Ledger
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Track client accounts, link drafting proposals, and audit corporate cybersecurity compliance posture
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Import
              </Button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Customer
              </Button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Corporate Accounts
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.totalClients} Clients
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    B2B Active Deal Pipeline
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    ${kpis.pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Average Security Compliance
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.avgCompliance}% Rated
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DataTable */}
          <DataTable
            columns={customerColumns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Search ledger by client name..."
            isLoading={isLoading}
            loadingMessage="Hydrating Ledger..."
            emptyMessage="No accounts registered"
            emptyIcon={<Building className="h-10 w-10" />}
            enableRowSelection
            selectionActionSlot={(selected) => (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleBulkDelete(selected)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleExportAll}
                >
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
              </>
            )}
          />

        </div>
      </div>

      {/* Import Wizard Dialog */}
      <ImportWizard open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Create Customer Dialog */}
      {createDialogOpen && (
        <CustomerForm
          onClose={() => setCreateDialogOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!bulkDeleteSelection}
        onOpenChange={(open) => !open && setBulkDeleteSelection(null)}
        title="Delete Customers"
        description={`Delete ${bulkDeleteSelection?.length ?? 0} customer(s)? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleBulkDeleteConfirm}
        isLoading={deleteCustomerMutation.isPending}
        confirmVariant="destructive"
      />
    </AppShell>
  )
}
