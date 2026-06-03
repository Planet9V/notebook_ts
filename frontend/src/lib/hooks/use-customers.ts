import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/lib/api/customers'
import { CustomerCreate, CustomerUpdate } from '@/lib/types/customer'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const CUSTOMER_QUERY_KEYS = {
  all: ['customers'] as const,
  detail: (id: string) => ['customers', id] as const,
}

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.all,
    queryFn: () => customersApi.list(),
  })
}

export function useCustomer(id: string, enabled = true) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: !!id && enabled,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: CustomerCreate) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: 'Customer created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating customer'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerUpdate }) =>
      customersApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(variables.id) })
      toast({
        title: t('common.success') || 'Success',
        description: 'Customer updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating customer'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all })
      toast({
        title: t('common.success') || 'Success',
        description: 'Customer deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting customer'),
        variant: 'destructive',
      })
    },
  })
}

export function useMoveCustomerStage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      customersApi.moveStage(id, stage),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(variables.id) })
      toast({
        title: t('common.success') || 'Success',
        description: 'Customer stage updated',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error moving customer stage'),
        variant: 'destructive',
      })
    },
  })
}
