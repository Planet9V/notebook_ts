"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useCreateScheduledSearch, useUpdateScheduledSearch } from "@/lib/hooks/use-scheduled-search"
import type { ScheduledSearch, ScheduledSearchCreate, ScheduledSearchUpdate } from "@/lib/api/scheduled-search"

const ENGINES = [
  { value: "valyu", label: "Valyu" },
  { value: "tavily", label: "Tavily" },
  { value: "perplexity", label: "Perplexity" },
  { value: "newsapi", label: "NewsAPI" },
  { value: "google_scholar", label: "Google Scholar" },
  { value: "brave", label: "Brave Search" },
  { value: "hybrid", label: "Hybrid (Multi-source)" },
]

const INTERVALS = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
]

interface FormData {
  name: string
  query: string
  engine: string
  interval: string
  save_as_source: boolean
}

interface ScheduledSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notebookId: string
  /** If provided, the dialog is in edit mode */
  editingSearch?: ScheduledSearch | null
}

export function ScheduledSearchDialog({
  open,
  onOpenChange,
  notebookId,
  editingSearch,
}: ScheduledSearchDialogProps) {
  const createMutation = useCreateScheduledSearch()
  const updateMutation = useUpdateScheduledSearch()
  const isEditing = !!editingSearch

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      query: "",
      engine: "valyu",
      interval: "daily",
      save_as_source: true,
    },
  })

  // Reset form when dialog opens or editingSearch changes
  useEffect(() => {
    if (open) {
      if (editingSearch) {
        reset({
          name: editingSearch.name,
          query: editingSearch.query,
          engine: editingSearch.engine,
          interval: editingSearch.interval,
          save_as_source: editingSearch.save_as_source,
        })
      } else {
        reset({
          name: "",
          query: "",
          engine: "valyu",
          interval: "daily",
          save_as_source: true,
        })
      }
    }
  }, [open, editingSearch, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && editingSearch) {
        const updateData: ScheduledSearchUpdate = {
          name: data.name,
          query: data.query,
          engine: data.engine,
          interval: data.interval,
          save_as_source: data.save_as_source,
        }
        await updateMutation.mutateAsync({ id: editingSearch.id, data: updateData })
      } else {
        const createData: ScheduledSearchCreate = {
          name: data.name,
          notebook_id: notebookId,
          query: data.query,
          engine: data.engine,
          interval: data.interval,
          save_as_source: data.save_as_source,
        }
        await createMutation.mutateAsync(createData)
      }
      onOpenChange(false)
    } catch {
      // Error is handled by the mutation hooks with toasts
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Scheduled Search" : "Schedule a Recurring Search"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the search configuration. Changes take effect on the next run."
              : "Set up an automated search that runs on a schedule and adds results to this notebook."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-search-name">Name *</Label>
            <Input
              id="scheduled-search-name"
              {...register("name", { required: "Name is required" })}
              placeholder="e.g., Daily threat intel briefing"
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Query */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-search-query">Search Query *</Label>
            <Textarea
              id="scheduled-search-query"
              {...register("query", { required: "Search query is required" })}
              placeholder="e.g., latest cybersecurity vulnerabilities and zero-day exploits"
              rows={3}
            />
            {errors.query && (
              <p className="text-sm text-destructive">{errors.query.message}</p>
            )}
          </div>

          {/* Engine + Interval row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search Engine</Label>
              <Controller
                control={control}
                name="engine"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGINES.map((engine) => (
                        <SelectItem key={engine.value} value={engine.value}>
                          {engine.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Controller
                control={control}
                name="interval"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Save as source toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Save results as sources</Label>
              <p className="text-xs text-muted-foreground">
                Automatically add search results as new sources in this notebook
              </p>
            </div>
            <Controller
              control={control}
              name="save_as_source"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
