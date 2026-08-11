'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import { PodcastEpisode } from '@/lib/types/podcasts'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCcw, Square, Trash2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  running: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  processing: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  failed: 'border-red-500/30 bg-red-500/10 text-red-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  submitted: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
}

export function getPodcastColumns(
  onDelete?: (episodeId: string) => Promise<void> | void,
  onRetry?: (episodeId: string) => Promise<void> | void
): ColumnDef<PodcastEpisode, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Episode" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 max-w-[280px]">
          <span className="font-bold text-slate-200 text-xs tracking-wide truncate">
            {row.original.name}
          </span>
          {row.original.episode_profile?.name && (
            <span className="text-[10px] text-muted-foreground truncate">
              Profile: {row.original.episode_profile.name}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'job_status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.job_status || 'unknown'
        const colorClass = STATUS_COLORS[status] || STATUS_COLORS.unknown
        return (
          <Badge
            variant="outline"
            className={`text-[8px] font-mono py-0.5 px-1.5 uppercase tracking-wide ${colorClass}`}
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'speaker_profile',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Speaker" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-slate-300 truncate max-w-[150px] block">
          {row.original.speaker_profile?.name || '—'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'audio_url',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Audio" />
      ),
      cell: ({ row }) => {
        const hasAudio = row.original.audio_url || row.original.audio_file
        return hasAudio ? (
          <Badge
            variant="outline"
            className="text-[8px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400 py-0.5 px-1.5"
          >
            Available
          </Badge>
        ) : (
          <span className="text-muted-foreground/50 text-[10px]">—</span>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'created',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const created = row.original.created
        if (!created) return <span className="text-muted-foreground/50">—</span>
        try {
          return (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(created), { addSuffix: true })}
            </span>
          )
        } catch {
          return <span className="text-muted-foreground/50">—</span>
        }
      },
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actions" />
      ),
      cell: ({ row }) => {
        const status = (row.original.job_status || '').toLowerCase()
        const isRunning = status === 'running' || status === 'processing' || status === 'pending' || status === 'submitted'
        const isFailed = status === 'failed' || status === 'error'

        return (
          <div className="flex items-center gap-1.5">
            {isRunning && onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => onDelete(row.original.id)}
                title="Stop / Cancel generation"
              >
                <Square className="h-3 w-3 mr-1 fill-amber-400" />
                Stop
              </Button>
            )}
            {isFailed && onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                onClick={() => onRetry(row.original.id)}
                title="Retry failed generation"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onDelete(row.original.id)}
                title="Delete episode"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
  ]
}

export const podcastColumns = getPodcastColumns()

