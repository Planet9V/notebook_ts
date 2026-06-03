import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi } from '@/lib/api/activities'
import { ActivityCreate } from '@/lib/types/activity'

export const ACTIVITY_QUERY_KEYS = {
  all: ['activities'] as const,
  byCustomer: (customerId: string) => ['activities', customerId] as const,
}

export function useActivities(customerId?: string) {
  return useQuery({
    queryKey: customerId
      ? ACTIVITY_QUERY_KEYS.byCustomer(customerId)
      : ACTIVITY_QUERY_KEYS.all,
    queryFn: () =>
      customerId
        ? activitiesApi.list(customerId, { limit: 50 })
        : Promise.resolve([]),
    enabled: !!customerId,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ActivityCreate) => activitiesApi.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all })
      if (variables.customer_id) {
        queryClient.invalidateQueries({
          queryKey: ACTIVITY_QUERY_KEYS.byCustomer(variables.customer_id),
        })
      }
    },
  })
}
