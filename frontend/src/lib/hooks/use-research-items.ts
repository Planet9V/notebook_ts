import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { researchItemApi } from '@/lib/api/research-items'
import { CreateResearchItemRequest, UpdateResearchItemRequest } from '@/lib/types/research-item'
import { useToast } from '@/lib/hooks/use-toast'

export const RESEARCH_QUERY_KEYS = {
  all: ['research-items'] as const,
  list: (params?: Record<string, string>) => ['research-items', 'list', params] as const,
  detail: (id: string) => ['research-items', 'detail', id] as const,
  due: ['research-items', 'due'] as const,
  projects: (id: string) => ['research-items', 'projects', id] as const,
}

export function useResearchItems(
  params?: {
    customer_id?: string
    project_id?: string
    stage?: string
    status?: string
    location_id?: string
    category?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: RESEARCH_QUERY_KEYS.list(params as Record<string, string>),
    queryFn: () => researchItemApi.list(params),
    refetchInterval: (current) => {
      if (options?.enabled === false) return false
      const data = current.state.data as any[] | undefined
      if (!data || data.length === 0) {
        return false
      }
      const hasResearching = data.some((item) => item.stage === 'researching')
      return hasResearching ? 4000 : false
    },
    ...options,
  })
}

export function useResearchItem(id: string) {
  return useQuery({
    queryKey: RESEARCH_QUERY_KEYS.detail(id),
    queryFn: () => researchItemApi.get(id),
    enabled: !!id,
  })
}

export function useCreateResearchItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateResearchItemRequest) => researchItemApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Research item created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating research item',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateResearchItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResearchItemRequest }) =>
      researchItemApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Research item updated',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error updating research item',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteResearchItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => researchItemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Research item archived',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error archiving research item',
        variant: 'destructive',
      })
    },
  })
}

export function useExecuteResearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => researchItemApi.execute(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      toast({
        title: 'Research Triggered',
        description: `Querying ${data.engine}...`,
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error executing research',
        variant: 'destructive',
      })
    },
  })
}

export function useCompleteResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, summary }: { id: string; summary?: string }) =>
      researchItemApi.complete(id, summary),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDueResearchItems() {
  return useQuery({
    queryKey: RESEARCH_QUERY_KEYS.due,
    queryFn: () => researchItemApi.listDue(),
    refetchInterval: 60000, // Poll every minute
  })
}

export function useLinkResearchProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, projectId }: { itemId: string; projectId: string }) =>
      researchItemApi.linkProject(itemId, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.projects(variables.itemId) })
    },
  })
}

export function useLinkResearchCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, customerId }: { itemId: string; customerId: string }) =>
      researchItemApi.linkCustomer(itemId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
    },
  })
}

export function useResearchProjects(itemId: string) {
  return useQuery({
    queryKey: RESEARCH_QUERY_KEYS.projects(itemId),
    queryFn: () => researchItemApi.getProjects(itemId),
    enabled: !!itemId,
  })
}

export function useEnhanceResearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, directions, modelId }: { id: string; directions: string; modelId?: string | null }) =>
      researchItemApi.enhance(id, directions, modelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Research findings rewritten and enhanced',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error enhancing research findings',
        variant: 'destructive',
      })
    },
  })
}

export function useApproveResearch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => researchItemApi.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: RESEARCH_QUERY_KEYS.detail(id) })
      toast({
        title: 'Approved',
        description: 'Research approved and saved as a Notebook Note',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error approving research',
        variant: 'destructive',
      })
    },
  })
}
