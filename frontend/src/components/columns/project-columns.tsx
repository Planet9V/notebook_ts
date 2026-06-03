'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DataTableColumnHeader } from '@/components/data-table'
import { Project } from '@/lib/types/project'
import { format } from 'date-fns'

const STAGE_COLORS: Record<string, string> = {
  planning: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  kickoff: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  in_progress: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  review: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  closed: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-400',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  low: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
}

export const projectColumns: ColumnDef<Project, unknown>[] = [
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
        {row.original.description && (
          <span className="text-[10px] text-muted-foreground truncate">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = row.original.priority
      const colorClass = PRIORITY_COLORS[priority] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {priority}
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
          {stage.replace(/_/g, ' ')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'project_type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-300 capitalize">
        {row.original.project_type?.replace(/_/g, ' ') || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'progress',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progress" />
    ),
    cell: ({ row }) => {
      const progress = row.original.progress || 0
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
            {progress}%
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'start_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Start Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.start_date
      if (!date) return <span className="text-muted-foreground/50">—</span>
      try {
        return (
          <span className="text-[10px] text-muted-foreground font-mono">
            {format(new Date(date), 'MMM d, yyyy')}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground/50">—</span>
      }
    },
  },
  {
    accessorKey: 'assigned_to',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-300">
        {row.original.assigned_to || '—'}
      </span>
    ),
  },
]
