'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { styleguidesApi } from '@/lib/api/styleguides'
import { StyleGuideCreate, StyleGuideUpdate } from '@/lib/types/styleguide'
import { toast } from 'sonner'

const QUERY_KEY = ['styleguides']

export function useStyleguides() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: styleguidesApi.getAll,
  })
}

export function useStyleguide(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => styleguidesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateStyleguide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StyleGuideCreate) => styleguidesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Style guide created')
    },
    onError: (err: Error) => {
      toast.error('Failed to create style guide', { description: err.message })
    },
  })
}

export function useUpdateStyleguide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StyleGuideUpdate }) =>
      styleguidesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Style guide updated')
    },
    onError: (err: Error) => {
      toast.error('Failed to update style guide', { description: err.message })
    },
  })
}

export function useDeleteStyleguide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => styleguidesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Style guide deleted')
    },
    onError: (err: Error) => {
      toast.error('Failed to delete style guide', { description: err.message })
    },
  })
}
