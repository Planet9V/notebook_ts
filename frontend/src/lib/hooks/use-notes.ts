import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '@/lib/api/notes'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { CreateNoteRequest, UpdateNoteRequest } from '@/lib/types/api'

export function useNotes(notebookId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.notes(notebookId),
    queryFn: () => notesApi.list({ notebook_id: notebookId }),
    enabled: !!notebookId,
  })
}

export function useNote(id?: string, options?: { enabled?: boolean }) {
  const noteId = id ?? ''
  return useQuery({
    queryKey: QUERY_KEYS.note(noteId),
    queryFn: () => notesApi.get(noteId),
    enabled: !!noteId && (options?.enabled ?? true),
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: CreateNoteRequest) => notesApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.notes(variables.notebook_id) 
      })
      toast({
        title: t('common.success'),
        description: t('notebooks.noteCreatedSuccess'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notebooks.failedToCreateNote')),
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
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteRequest }) =>
      notesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(id) })
      toast({
        title: t('common.success'),
        description: t('notebooks.noteUpdatedSuccess'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notebooks.failedToUpdateNote')),
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
    mutationFn: (id: string) => notesApi.delete(id),
    onSuccess: () => {
      // Invalidate all notes queries (with and without notebook IDs)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast({
        title: t('common.success'),
        description: t('notebooks.noteDeletedSuccess'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('notebooks.failedToDeleteNote')),
        variant: 'destructive',
      })
    },
  })
}

export function useAllNotes() {
  return useQuery({
    queryKey: ['notes', 'all'],
    queryFn: () => notesApi.list(),
  })
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notesApi.getNotifications(userId),
    refetchInterval: 10000, // Poll every 10 seconds
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notesApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => notesApi.listTags(),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; category_type?: string }) => notesApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notesApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useLinkTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: string; tagId: string }) => notesApi.linkTag(noteId, tagId),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note_tags', noteId] })
    },
  })
}

export function useUnlinkTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: string; tagId: string }) => notesApi.unlinkTag(noteId, tagId),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note_tags', noteId] })
    },
  })
}

export function useNoteTags(noteId: string) {
  return useQuery({
    queryKey: ['note_tags', noteId],
    queryFn: () => notesApi.getNoteTags(noteId),
    enabled: !!noteId,
  })
}

export function useNodeLayouts(viewType: string) {
  return useQuery({
    queryKey: ['node_layouts', viewType],
    queryFn: () => notesApi.getNodeLayouts(viewType),
    enabled: !!viewType,
  })
}

export function useSaveNodeLayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { node_id: string; x: number; y: number; view_type: string }) => notesApi.saveNodeLayout(data),
    onSuccess: (_, { view_type }) => {
      queryClient.invalidateQueries({ queryKey: ['node_layouts', view_type] })
    },
  })
}

