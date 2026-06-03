"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import {
  Play,
  Pause,
  MoreVertical,
  Pencil,
  Trash2,
  Zap,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useScheduledSearches,
  useDeleteScheduledSearch,
  useTriggerScheduledSearch,
  useUpdateScheduledSearch,
} from "@/lib/hooks/use-scheduled-search"
import type { ScheduledSearch } from "@/lib/api/scheduled-search"

const ENGINE_LABELS: Record<string, string> = {
  valyu: "Valyu",
  tavily: "Tavily",
  perplexity: "Perplexity",
  newsapi: "NewsAPI",
  google_scholar: "Google Scholar",
  brave: "Brave",
  hybrid: "Hybrid",
}

const INTERVAL_LABELS: Record<string, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

interface ScheduledSearchListProps {
  notebookId: string
  onEdit: (search: ScheduledSearch) => void
}

export function ScheduledSearchList({ notebookId, onEdit }: ScheduledSearchListProps) {
  const { data: searches, isLoading } = useScheduledSearches(notebookId)
  const deleteMutation = useDeleteScheduledSearch()
  const triggerMutation = useTriggerScheduledSearch()
  const updateMutation = useUpdateScheduledSearch()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null)

  const handleToggleActive = async (search: ScheduledSearch) => {
    await updateMutation.mutateAsync({
      id: search.id,
      data: { is_active: !search.is_active },
    })
  }

  const handleTrigger = async (id: string) => {
    await triggerMutation.mutateAsync(id)
  }

  const handleDeleteClick = (id: string) => {
    setSearchToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!searchToDelete) return
    await deleteMutation.mutateAsync(searchToDelete)
    setDeleteDialogOpen(false)
    setSearchToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!searches || searches.length === 0) {
    return null // Don't render anything if no schedules exist
  }

  return (
    <>
      <div className="space-y-2">
        {searches.map((search) => (
          <ScheduledSearchCard
            key={search.id}
            search={search}
            onEdit={() => onEdit(search)}
            onDelete={() => handleDeleteClick(search.id)}
            onTrigger={() => handleTrigger(search.id)}
            onToggleActive={() => handleToggleActive(search)}
            isTriggerPending={triggerMutation.isPending}
            isTogglePending={updateMutation.isPending}
          />
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Scheduled Search"
        description="This will permanently delete this scheduled search. Future runs will not execute."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </>
  )
}

interface ScheduledSearchCardProps {
  search: ScheduledSearch
  onEdit: () => void
  onDelete: () => void
  onTrigger: () => void
  onToggleActive: () => void
  isTriggerPending: boolean
  isTogglePending: boolean
}

function ScheduledSearchCard({
  search,
  onEdit,
  onDelete,
  onTrigger,
  onToggleActive,
  isTriggerPending,
  isTogglePending,
}: ScheduledSearchCardProps) {
  return (
    <div
      className={cn(
        "group rounded-lg border p-3 transition-colors",
        search.is_active
          ? "bg-card hover:bg-accent/50"
          : "bg-muted/30 opacity-60 hover:opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{search.name}</span>
            <Badge variant={search.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {search.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{search.query}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {INTERVAL_LABELS[search.interval] || search.interval}
            </span>
            <span>{ENGINE_LABELS[search.engine] || search.engine}</span>
            {search.run_count > 0 && (
              <span>{search.run_count} run{search.run_count !== 1 ? "s" : ""}</span>
            )}
            {search.last_run && (
              <span>
                Last: {formatDistanceToNow(new Date(search.last_run), { addSuffix: true })}
              </span>
            )}
          </div>
          {search.last_error && (
            <div className="flex items-center gap-1 text-[11px] text-destructive mt-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{search.last_error}</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onTrigger} disabled={isTriggerPending}>
              <Zap className="h-4 w-4 mr-2" />
              Run Now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleActive} disabled={isTogglePending}>
              {search.is_active ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
