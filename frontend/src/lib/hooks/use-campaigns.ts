import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi } from '@/lib/api/campaigns'
import { CreateCampaignRequest, UpdateCampaignRequest } from '@/lib/types/campaign'
import { useToast } from '@/lib/hooks/use-toast'

export const CAMPAIGN_QUERY_KEYS = {
  all: ['campaigns'] as const,
  list: (params?: Record<string, string>) => ['campaigns', 'list', params] as const,
  detail: (id: string) => ['campaigns', 'detail', id] as const,
}

export function useCampaigns(
  params?: {
    customer_id?: string
    notebook_id?: string
    status?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.list(params as Record<string, string>),
    queryFn: () => campaignsApi.list(params),
    ...options,
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.detail(id),
    queryFn: () => campaignsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating campaign',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignRequest }) =>
      campaignsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error updating campaign',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error deleting campaign',
        variant: 'destructive',
      })
    },
  })
}
