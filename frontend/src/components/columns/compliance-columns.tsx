'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

// Compliance framework shape (from the hardcoded CSET_FRAMEWORKS in the compliance page)
export interface ComplianceFramework {
  id: string
  name: string
  category: string
  sector: string
  description: string
  question_count: number
  maturity_level?: string
}

const SECTOR_COLORS: Record<string, string> = {
  'Energy': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  'Water': 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  'Transportation': 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  'Healthcare': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  'Financial': 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  'Government': 'border-red-500/30 bg-red-500/10 text-red-400',
  'Manufacturing': 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  'IT': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  'Defense': 'border-slate-500/30 bg-slate-500/10 text-slate-400',
}

export const complianceColumns: ColumnDef<ComplianceFramework, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Framework" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 max-w-[280px]">
        <span className="font-bold text-slate-200 text-xs tracking-wide">
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
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-300 capitalize">
        {row.original.category || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'sector',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sector" />
    ),
    cell: ({ row }) => {
      const sector = row.original.sector
      // Try to match by first word of sector
      const firstWord = sector?.split(' ')[0] || ''
      const colorClass = SECTOR_COLORS[firstWord] || 'border-white/10 bg-slate-800/40 text-slate-400'
      return (
        <Badge
          variant="outline"
          className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
        >
          {sector}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'question_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Questions" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-mono text-slate-300">
        {row.original.question_count}
      </span>
    ),
  },
]
