import apiClient from './client'
import { TaskTable, CreateTaskTableRequest, UpdateTaskTableRequest } from '@/lib/types/task-table'

export const tasksApi = {
  list: async (params?: {
    project_id?: string
    customer_id?: string
    notebook_id?: string
    assigned_to?: string
    status?: string
  }): Promise<TaskTable[]> => {
    const response = await apiClient.get<TaskTable[]>('/tasks', { params })
    return response.data
  },

  get: async (id: string): Promise<TaskTable> => {
    const response = await apiClient.get<TaskTable>(`/tasks/${id}`)
    return response.data
  },

  create: async (data: CreateTaskTableRequest): Promise<TaskTable> => {
    const response = await apiClient.post<TaskTable>('/tasks', data)
    return response.data
  },

  update: async (id: string, data: UpdateTaskTableRequest): Promise<TaskTable> => {
    const response = await apiClient.put<TaskTable>(`/tasks/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/${id}`)
    return response.data
  },
  
  listSpecLinks: async (taskId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/tasks/${taskId}/spec-links`)
    return response.data
  },

  createSpecLink: async (taskId: string, specId: string): Promise<any> => {
    const response = await apiClient.post<any>('/tasks/spec-links', { task_id: taskId, spec_id: specId })
    return response.data
  },

  deleteSpecLink: async (linkId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/spec-links/${linkId}`)
    return response.data
  },
}
