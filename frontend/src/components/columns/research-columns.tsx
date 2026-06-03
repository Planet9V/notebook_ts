'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { ResearchItem } from '@/lib/types/research-item'
import { formatDistanceToNow } from 'date-fns'
import { Check, X, RefreshCw } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  queued: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  researching: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  analyzing: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  archived: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
}

const ENGINE_COLORS: Record<string, string> = {
  perplexity: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  tavily: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  valyu: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  exa: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  serper: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  brave: 'border-red-500/30 bg-red-500/10 text-red-400',
  you: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
}

export const researchColumns: ColumnDef<ResearchItem, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 max-w-[250px]">
        <span className="font-bold text-slate-200 text-xs tracking-wide truncate">
          {row.original.name}
        </span>
        {row.original.query && (
          <span className="text-[10px] text-muted-foreground truncate">
            {row.original.query}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'engine',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Engine" />
    ),
    cell: ({ row }) => {
      const engine = row.original.engine
      const colorClass = ENGINE_COLORS[engine] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {engine}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'stage',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stage" />
    ),
    cell: ({ row }) => {
      const stage = row.original.stage
      const colorClass = STAGE_COLORS[stage] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {stage}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'is_recurring',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recurring" />
    ),
    cell: ({ row }) => (
      row.original.is_recurring
        ? <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
        : <X className="h-3.5 w-3.5 text-muted-foreground/30" />
    ),
  },
  {
    accessorKey: 'run_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Runs" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-mono text-slate-300">
        {row.original.run_count}
      </span>
    ),
  },
  {
    accessorKey: 'last_run',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Run" />
    ),
    cell: ({ row }) => {
      const lastRun = row.original.last_run
      if (!lastRun) return <span className="text-muted-foreground/50">—</span>
      try {
        return (
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(lastRun), { addSuffix: true })}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground/50">—</span>
      }
    },
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
