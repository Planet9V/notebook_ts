import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api/agents'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { AgentConfigCreate, AgentConfigUpdate } from '@/lib/types/agents'

export const AGENT_QUERY_KEYS = {
  agents: ['agents'] as const,
  agent: (id: string) => ['agents', id] as const,
  executions: (agentId: string) => ['agents', agentId, 'executions'] as const,
  logs: (executionId: string) => ['agents', 'executions', executionId, 'logs'] as const,
}

export function useAgents() {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.agents,
    queryFn: () => agentsApi.list(),
  })
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.agent(id),
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: AgentConfigCreate) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.agents })
      toast({
        title: t('common.success'),
        description: t('agents.saveSuccess', 'Agent saved successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateAgent(agentId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: AgentConfigUpdate) => agentsApi.update(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.agents })
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.agent(agentId) })
      toast({
        title: t('common.success'),
        description: t('agents.saveSuccess', 'Agent saved successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.agents })
      toast({
        title: t('common.success'),
        description: t('agents.deleteSuccess', 'Agent deleted successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useAgentExecutions(agentId: string) {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.executions(agentId),
    queryFn: () => agentsApi.listExecutions(agentId),
    enabled: !!agentId,
  })
}

export function useAgentLogs(executionId: string) {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.logs(executionId),
    queryFn: () => agentsApi.listLogs(executionId),
    enabled: !!executionId,
  })
}
