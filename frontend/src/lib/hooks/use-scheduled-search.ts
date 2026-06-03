import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduledSearchApi, ScheduledSearchCreate, ScheduledSearchUpdate } from '@/lib/api/scheduled-search'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const SCHEDULED_SEARCH_QUERY_KEYS = {
  all: ['scheduled-searches'] as const,
  byNotebook: (notebookId: string) => ['scheduled-searches', 'notebook', notebookId] as const,
  detail: (id: string) => ['scheduled-searches', 'detail', id] as const,
}

export function useScheduledSearches(notebookId?: string) {
  return useQuery({
    queryKey: notebookId
      ? SCHEDULED_SEARCH_QUERY_KEYS.byNotebook(notebookId)
      : SCHEDULED_SEARCH_QUERY_KEYS.all,
    queryFn: () => scheduledSearchApi.list(notebookId),
  })
}

export function useScheduledSearch(id: string) {
  return useQuery({
    queryKey: SCHEDULED_SEARCH_QUERY_KEYS.detail(id),
    queryFn: () => scheduledSearchApi.get(id),
    enabled: !!id,
  })
}

export function useCreateScheduledSearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: ScheduledSearchCreate) => scheduledSearchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULED_SEARCH_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: 'Scheduled search created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating scheduled search'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateScheduledSearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduledSearchUpdate }) =>
      scheduledSearchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULED_SEARCH_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: 'Scheduled search updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating scheduled search'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteScheduledSearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => scheduledSearchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULED_SEARCH_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: 'Scheduled search deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting scheduled search'),
        variant: 'destructive',
      })
    },
  })
}

export function useTriggerScheduledSearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => scheduledSearchApi.trigger(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULED_SEARCH_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'Scheduled search triggered successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error triggering scheduled search'),
        variant: 'destructive',
      })
    },
  })
}

export function useRunDueScheduledSearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: () => scheduledSearchApi.runDue(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULED_SEARCH_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'Due scheduled searches executed successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error running due scheduled searches'),
        variant: 'destructive',
      })
    },
  })
}
