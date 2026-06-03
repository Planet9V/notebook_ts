'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { Customer } from '@/lib/types/customer'

const TYPE_COLORS: Record<string, string> = {
  prospect: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  client: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  partner: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  vendor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
}

const TIER_COLORS: Record<string, string> = {
  enterprise: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  mid_market: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  smb: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
}

export const customerColumns: ColumnDef<Customer, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-bold text-slate-200 text-xs tracking-wide">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: 'customer_type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.customer_type
      const colorClass = TYPE_COLORS[type] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {type}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'industry',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Industry" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-300 truncate max-w-[180px] block">
        {row.original.industry || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'tier',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tier" />
    ),
    cell: ({ row }) => {
      const tier = row.original.tier
      if (!tier) return <span className="text-muted-foreground/50">—</span>
      const colorClass = TIER_COLORS[tier] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {tier.replace(/_/g, ' ')}
        </Badge>
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
        <a
          href={`mailto:${email}`}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors truncate max-w-[200px] block"
        >
          {email}
        </a>
      )
    },
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
  },
]
