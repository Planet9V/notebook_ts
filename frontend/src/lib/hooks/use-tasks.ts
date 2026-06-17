import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '@/lib/api/tasks'
import { CreateTaskTableRequest, UpdateTaskTableRequest } from '@/lib/types/task-table'
import { useToast } from '@/lib/hooks/use-toast'

export const TASK_TABLE_QUERY_KEYS = {
  all: ['tasks'] as const,
  list: (params?: Record<string, string>) => ['tasks', 'list', params] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

export function useTasks(
  params?: {
    project_id?: string
    customer_id?: string
    notebook_id?: string
    assigned_to?: string
    status?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: TASK_TABLE_QUERY_KEYS.list(params as Record<string, string>),
    queryFn: () => tasksApi.list(params),
    ...options,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: TASK_TABLE_QUERY_KEYS.detail(id),
    queryFn: () => tasksApi.get(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateTaskTableRequest) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_TABLE_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Task created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating task',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskTableRequest }) =>
      tasksApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_TABLE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: TASK_TABLE_QUERY_KEYS.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error updating task',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_TABLE_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error deleting task',
        variant: 'destructive',
      })
    },
  })
}
