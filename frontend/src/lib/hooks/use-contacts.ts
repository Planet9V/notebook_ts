import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/lib/api/contacts'
import { ContactCreate, ContactUpdate } from '@/lib/types/contact'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { CUSTOMER_QUERY_KEYS } from '@/lib/hooks/use-customers'

export const CONTACT_QUERY_KEYS = {
  all: ['contacts'] as const,
  byCustomer: (customerId: string) => ['contacts', customerId] as const,
  detail: (id: string) => ['contacts', 'detail', id] as const,
}

export function useContacts(customerId?: string) {
  return useQuery({
    queryKey: customerId
      ? CONTACT_QUERY_KEYS.byCustomer(customerId)
      : CONTACT_QUERY_KEYS.all,
    queryFn: () =>
      customerId
        ? contactsApi.listByCustomer(customerId)
        : contactsApi.list(),
  })
}

export function useContact(id: string, enabled = true) {
  return useQuery({
    queryKey: CONTACT_QUERY_KEYS.detail(id),
    queryFn: () => contactsApi.get(id),
    enabled: !!id && enabled,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: ContactCreate) => contactsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.all })
      if (data.customer_id) {
        queryClient.invalidateQueries({
          queryKey: CONTACT_QUERY_KEYS.byCustomer(data.customer_id),
        })
        queryClient.invalidateQueries({
          queryKey: CUSTOMER_QUERY_KEYS.detail(data.customer_id),
        })
      }
      toast({
        title: t('common.success') || 'Success',
        description: 'Contact created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating contact'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) =>
      contactsApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: CONTACT_QUERY_KEYS.detail(data.id),
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (data.customer_id) {
        queryClient.invalidateQueries({
          queryKey: CONTACT_QUERY_KEYS.byCustomer(data.customer_id),
        })
        queryClient.invalidateQueries({
          queryKey: CUSTOMER_QUERY_KEYS.detail(data.customer_id),
        })
      }
      toast({
        title: t('common.success') || 'Success',
        description: 'Contact updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating contact'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({
        title: t('common.success') || 'Success',
        description: 'Contact deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting contact'),
        variant: 'destructive',
      })
    },
  })
}
