import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '@/lib/api/notes'
import { toast } from 'sonner'

export function useEntityLinks(notebookId?: string) {
  return useQuery({
    queryKey: ['entity-links', notebookId],
    queryFn: () => notesApi.getLinks(notebookId),
    staleTime: 5000,
  })
}

export function useCreateEntityLink(notebookId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceId, targetId, linkType }: { sourceId: string; targetId: string; linkType?: string }) =>
      notesApi.createLink(sourceId, targetId, linkType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-links', notebookId] })
      toast.success('Relation link created')
    },
    onError: () => {
      toast.error('Failed to create relation link')
    },
  })
}

export function useDeleteEntityLink(notebookId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (linkId: string) => notesApi.deleteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-links', notebookId] })
      toast.success('Relation link deleted')
    },
    onError: () => {
      toast.error('Failed to delete relation link')
    },
  })
}

export function useSuggestedLinks(notebookId: string, enabled = true) {
  return useQuery({
    queryKey: ['suggested-links', notebookId],
    queryFn: () => notesApi.getSuggestedLinks(notebookId),
    enabled: !!notebookId && enabled,
    staleTime: 10000,
  })
}

