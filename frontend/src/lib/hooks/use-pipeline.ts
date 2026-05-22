import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineApi } from '@/lib/api/pipeline'
import { PipelineRuleCreate } from '@/lib/types/pipeline'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const PIPELINE_QUERY_KEYS = {
  rules: ['pipeline', 'rules'] as const,
  status: (notebookId: string) => ['pipeline', 'status', notebookId] as const,
}

export function usePipelineRules() {
  return useQuery({
    queryKey: PIPELINE_QUERY_KEYS.rules,
    queryFn: () => pipelineApi.listRules(),
  })
}

export function useCreatePipelineRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: PipelineRuleCreate) => pipelineApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEYS.rules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Automation rule created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating rule'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdatePipelineRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PipelineRuleCreate }) =>
      pipelineApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEYS.rules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Automation rule updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating rule'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeletePipelineRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => pipelineApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEYS.rules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Automation rule deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting rule'),
        variant: 'destructive',
      })
    },
  })
}

export function useNotebookScanningStatus(notebookId: string, enabled = true) {
  return useQuery({
    queryKey: PIPELINE_QUERY_KEYS.status(notebookId),
    queryFn: () => pipelineApi.getScanningStatus(notebookId),
    enabled: !!notebookId && enabled,
    refetchInterval: (query) => {
      // Poll every 3 seconds if active scanning is true
      if (query.state.data?.scanning) {
        return 3000
      }
      return false
    },
  })
}
