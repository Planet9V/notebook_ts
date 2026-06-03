import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi } from '@/lib/api/projects'
import { CreateProjectRequest, UpdateProjectRequest, CreateTaskRequest, UpdateTaskRequest } from '@/lib/types/project'
import { useToast } from '@/lib/hooks/use-toast'

export const PROJECT_QUERY_KEYS = {
  all: ['projects'] as const,
  list: (params?: Record<string, string>) => ['projects', 'list', params] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  research: (id: string) => ['projects', 'research', id] as const,
}

export function useProjects(params?: {
  customer_id?: string
  stage?: string
  status?: string
}) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.list(params as Record<string, string>),
    queryFn: () => projectApi.list(params),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.detail(id),
    queryFn: () => projectApi.get(id),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Project created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating project',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error updating project',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
      toast({
        title: 'Success',
        description: 'Project archived',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error archiving project',
        variant: 'destructive',
      })
    },
  })
}

export function useAddTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateTaskRequest }) =>
      projectApi.addTask(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(variables.projectId) })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      taskIndex,
      data,
    }: {
      projectId: string
      taskIndex: number
      data: UpdateTaskRequest
    }) => projectApi.updateTask(projectId, taskIndex, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(variables.projectId) })
    },
  })
}

export function useLinkProjectResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, researchId }: { projectId: string; researchId: string }) =>
      projectApi.linkResearch(projectId, researchId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.research(variables.projectId) })
    },
  })
}

export function useProjectResearch(projectId: string) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.research(projectId),
    queryFn: () => projectApi.getResearch(projectId),
    enabled: !!projectId,
  })
}
