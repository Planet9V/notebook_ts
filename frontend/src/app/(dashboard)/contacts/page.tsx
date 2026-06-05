'use client'

import React, { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Contact2,
  RefreshCw,
  Plus,
  Users,
  Building,
  LinkIcon,
  Unlink,
  Pencil,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { DataTable, DataTableColumnHeader, DataTableRowActions } from '@/components/data-table'
import { ContactForm } from '@/components/contacts/ContactForm'
import { useContacts, useDeleteContact } from '@/lib/hooks/use-contacts'
import { Contact } from '@/lib/types/contact'

export default function ContactDirectoryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { data: contacts = [], isLoading, refetch } = useContacts()
  const deleteContact = useDeleteContact()

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  // Filter by status
  const filteredContacts = useMemo(() => {
    if (statusFilter === 'all') return contacts
    return contacts.filter((c) => c.status === statusFilter)
  }, [contacts, statusFilter])

  // KPI calculations
  const kpis = useMemo(() => {
    const total = contacts.length
    const active = contacts.filter((c) => c.status === 'active').length
    const withCustomers = contacts.filter((c) => c.customer_id).length
    const unlinked = contacts.filter((c) => !c.customer_id).length
    return { total, active, withCustomers, unlinked }
  }, [contacts])

  // Copy email handler
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  // Open edit form
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormOpen(true)
  }

  // Delete contact
  const handleDelete = (id: string) => {
    deleteContact.mutate(id)
  }

  // Close form
  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingContact(undefined)
  }

  // Column definitions
  const columns: ColumnDef<Contact, unknown>[] = [
    {
      accessorKey: 'full_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-slate-200 text-xs tracking-wide">
            {row.original.full_name}
          </span>
          {row.original.title && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={row.original.title}>
              {row.original.title}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-slate-300 truncate max-w-[180px] block" title={row.original.title || '—'}>
          {row.original.title || '—'}
        </span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: 'customer_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const name = row.original.customer_name
        return name ? (
          <span className="text-xs text-cyan-400 font-semibold">{name}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 italic">
            Unlinked
          </span>
        )
      },
    },
    {
      accessorKey: 'location_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location / Facility" />
      ),
      cell: ({ row }) => {
        const name = row.original.location_name
        return name ? (
          <span className="text-xs text-slate-300 font-medium">{name}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 italic">
            Unlinked
          </span>
        )
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.original.email
        if (!email) return <span className="text-muted-foreground/50">—</span>
        return (
          <div className="flex items-center gap-1.5 group/email">
            <span className="text-xs text-slate-300 truncate max-w-[180px]" title={email}>
              {email}
            </span>
            <button
              onClick={() => handleCopyEmail(email)}
              className="opacity-0 group-hover/email:opacity-100 transition-opacity"
              title="Copy email"
            >
              {copiedEmail === email ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground hover:text-cyan-400" />
              )}
            </button>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-slate-300">
          {row.original.phone || row.original.mobile || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge
            variant="outline"
            className={
              status === 'active'
                ? 'text-[8px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400 py-0.5 px-1.5 uppercase tracking-wide'
                : 'text-[8px] font-mono border-white/10 bg-slate-800/40 text-slate-400 py-0.5 px-1.5 uppercase tracking-wide'
            }
          >
            {status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === value
      },
    },
    {
      accessorKey: 'source',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => {
        const source = row.original.source
        if (!source) return <span className="text-muted-foreground/50">—</span>
        return (
          <Badge
            variant="outline"
            className="text-[8px] font-mono border-white/5 bg-slate-950/40 text-slate-300 py-0.5 px-1.5 lowercase tracking-wide"
          >
            {source}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            {
              label: 'Edit',
              onClick: () => handleEdit(row.original),
              icon: <Pencil className="h-3.5 w-3.5" />,
            },
            {
              label: 'Delete',
              onClick: () => handleDelete(row.original.id),
              icon: <Trash2 className="h-3.5 w-3.5" />,
              variant: 'destructive',
            },
          ]}
        />
      ),
    },
  ]

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Contact2 className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  Contact Directory
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Manage stakeholder contacts, link to customer accounts, and track engagement touchpoints
              </p>
            </div>

            <div className="flex items-center gap-3">
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
                onClick={() => {
                  setEditingContact(undefined)
                  setFormOpen(true)
                }}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Total Contacts
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Contact2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Active Contacts
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.active}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    With Customers
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.withCustomers}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-500" />
              <CardContent className="flex items-center gap-4 p-4 pl-5">
                <div className="rounded-lg p-2.5 bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  <Unlink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Unlinked
                  </p>
                  <p className="text-2xl font-bold mt-1 font-mono tracking-tight text-slate-100">
                    {kpis.unlinked}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DataTable with contacts */}
          <DataTable
            columns={columns}
            data={filteredContacts}
            searchPlaceholder="Search contacts by name, email, or company..."
            isLoading={isLoading}
            loadingMessage="Loading contacts..."
            emptyMessage="No contacts registered"
            emptyIcon={<Contact2 className="h-10 w-10" />}
            filterSlot={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[120px] border-white/10 bg-slate-950/60 text-[10px] font-mono uppercase">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all" className="text-xs font-mono">
                    All Status
                  </SelectItem>
                  <SelectItem value="active" className="text-xs font-mono">
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className="text-xs font-mono">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            }
            actionSlot={
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {filteredContacts.length} contacts
              </span>
            }
          />

        </div>
      </div>

      {/* Contact Form Dialog */}
      {formOpen && (
        <ContactForm
          contact={editingContact}
          onClose={handleCloseForm}
        />
      )}
    </AppShell>
  )
}
