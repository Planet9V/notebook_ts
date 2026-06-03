import apiClient from './client'
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  LinkRequest,
} from '@/lib/types/project'

export const projectApi = {
  list: async (params?: {
    customer_id?: string
    stage?: string
    status?: string
  }): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects', { params })
    return response.data
  },

  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`)
    return response.data
  },

  create: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data)
    return response.data
  },

  update: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/projects/${id}`)
    return response.data
  },

  // Task management
  addTask: async (projectId: string, data: CreateTaskRequest): Promise<Project> => {
    const response = await apiClient.post<Project>(`/projects/${projectId}/tasks`, data)
    return response.data
  },

  updateTask: async (projectId: string, taskIndex: number, data: UpdateTaskRequest): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${projectId}/tasks/${taskIndex}`, data)
    return response.data
  },

  // Cross-linking
  linkResearch: async (projectId: string, researchId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/projects/${projectId}/link/research`, {
      target_id: researchId,
    } as LinkRequest)
    return response.data
  },

  getResearch: async (projectId: string): Promise<Array<{
    id: string
    name: string
    query: string
    stage: string
    engine: string
  }>> => {
    const response = await apiClient.get(`/projects/${projectId}/research`)
    return response.data
  },
}
