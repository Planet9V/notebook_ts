import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '@/lib/api/notes'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { CreateNoteRequest, UpdateNoteRequest } from '@/lib/types/api'

export function useLocationNotes(locationId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.locationNotes(locationId || ''),
    queryFn: () => notesApi.listByLocation(locationId!),
    enabled: !!locationId,
  })
}

export function useCustomerNotes(customerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customerNotes(customerId || ''),
    queryFn: () => notesApi.listByCustomer(customerId!),
    enabled: !!customerId,
  })
}

export function useCustomerNotesRollup(customerId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customerNotesRollup(customerId || ''),
    queryFn: () => notesApi.getCustomerNotesRollup(customerId!),
    enabled: !!customerId,
  })
}

export function useCreateLocationNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: CreateNoteRequest; customerId?: string }) =>
      notesApi.createForLocation(locationId, data),
    onSuccess: (_, { locationId, customerId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.locationNotes(locationId) })
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      } else {
        queryClient.invalidateQueries({ queryKey: ['customer-notes-rollup'] })
      }
      toast({
        title: t('common.success'),
        description: t('notes.addedToFacility'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.createFailed')),
        variant: 'destructive',
      })
    },
  })
}

export function useCreateCustomerNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: CreateNoteRequest }) =>
      notesApi.createForCustomer(customerId, data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotes(customerId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      toast({
        title: t('common.success'),
        description: t('notes.addedToOrganization'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.createFailed')),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: UpdateNoteRequest; customerId?: string; locationId?: string }) =>
      notesApi.update(noteId, data),
    onSuccess: (_, { customerId, locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.locationNotes(locationId) })
      }
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotes(customerId) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      }
      toast({
        title: t('common.success'),
        description: t('notes.updated'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.updateFailed')),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ noteId }: { noteId: string; customerId?: string; locationId?: string }) =>
      notesApi.delete(noteId),
    onSuccess: (_, { customerId, locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.locationNotes(locationId) })
      }
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotes(customerId) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      }
      toast({
        title: t('common.success'),
        description: t('notes.deleted'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.deleteFailed')),
        variant: 'destructive',
      })
    },
  })
}

export function useDetachLocationNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ locationId, noteId }: { locationId: string; noteId: string; customerId?: string }) =>
      notesApi.detachFromLocation(locationId, noteId),
    onSuccess: (_, { locationId, customerId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.locationNotes(locationId) })
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      }
      toast({
        title: t('common.success'),
        description: t('notes.detached'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.detachFailed')),
        variant: 'destructive',
      })
    },
  })
}

export function useDetachCustomerNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ customerId, noteId }: { customerId: string; noteId: string }) =>
      notesApi.detachFromCustomer(customerId, noteId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotes(customerId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerNotesRollup(customerId) })
      toast({
        title: t('common.success'),
        description: t('notes.detached'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notes.detachFailed')),
        variant: 'destructive',
      })
    },
  })
}
