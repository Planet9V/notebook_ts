import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/lib/api/locations'
import { LocationCreate, LocationUpdate } from '@/lib/types/location'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const LOCATION_QUERY_KEYS = {
  all: ['locations'] as const,
  byCustomer: (customerId: string) => ['locations', customerId] as const,
  detail: (id: string) => ['locations', 'detail', id] as const,
}

export function useLocations(customerId?: string) {
  return useQuery({
    queryKey: customerId
      ? LOCATION_QUERY_KEYS.byCustomer(customerId)
      : LOCATION_QUERY_KEYS.all,
    queryFn: () =>
      customerId
        ? locationsApi.listByCustomer(customerId)
        : locationsApi.list(),
  })
}

export function useLocation(id: string, enabled = true) {
  return useQuery({
    queryKey: LOCATION_QUERY_KEYS.detail(id),
    queryFn: () => locationsApi.get(id),
    enabled: !!id && enabled,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: LocationCreate) => locationsApi.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.all })
      if (variables.customer_id) {
        queryClient.invalidateQueries({
          queryKey: LOCATION_QUERY_KEYS.byCustomer(variables.customer_id),
        })
      }
      toast({
        title: t('common.success') || 'Success',
        description: 'Location created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating location'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationUpdate }) =>
      locationsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: LOCATION_QUERY_KEYS.detail(variables.id),
      })
      if (data.customer_id) {
        queryClient.invalidateQueries({
          queryKey: LOCATION_QUERY_KEYS.byCustomer(data.customer_id),
        })
      }
      toast({
        title: t('common.success') || 'Success',
        description: 'Location updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating location'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => locationsApi.delete(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      toast({
        title: t('common.success') || 'Success',
        description: 'Location deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting location'),
        variant: 'destructive',
      })
    },
  })
}
