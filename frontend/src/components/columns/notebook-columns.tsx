'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { NotebookResponse } from '@/lib/types/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const STAGE_COLORS: Record<string, string> = {
  bulk_import: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  data_enrichment: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  lead: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  research: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  technical_discovery: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  proposal: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  won: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
}

export const notebookColumns: ColumnDef<NotebookResponse, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/notebooks/${row.original.id}`}
        className="font-bold text-slate-200 text-xs tracking-wide hover:text-cyan-400 transition-colors"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'client_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Client" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-cyan-400 font-semibold">
        {row.original.client_name || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'stage',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stage" />
    ),
    cell: ({ row }) => {
      const stage = row.original.stage || 'lead'
      const colorClass = STAGE_COLORS[stage] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {stage.replace(/_/g, ' ')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'estimated_value',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Value" />
    ),
    cell: ({ row }) => {
      const value = row.original.estimated_value
      if (!value) return <span className="text-muted-foreground/50">—</span>
      return (
        <span className="text-xs font-mono text-emerald-400 font-semibold">
          ${value.toLocaleString()}
        </span>
      )
    },
  },
  {
    accessorKey: 'source_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sources" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-mono text-slate-300">
        {row.original.source_count}
      </span>
    ),
  },
  {
    accessorKey: 'note_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-mono text-slate-300">
        {row.original.note_count}
      </span>
    ),
  },
  {
    accessorKey: 'updated',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => {
      try {
        return (
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.updated), { addSuffix: true })}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground/50">—</span>
      }
    },
  },
]
