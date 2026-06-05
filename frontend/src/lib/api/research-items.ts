import apiClient from './client'
import {
  ResearchItem,
  CreateResearchItemRequest,
  UpdateResearchItemRequest,
  ResearchExecuteResponse,
} from '@/lib/types/research-item'
import { LinkRequest } from '@/lib/types/project'

export const researchItemApi = {
  list: async (params?: {
    customer_id?: string
    project_id?: string
    stage?: string
    status?: string
  }): Promise<ResearchItem[]> => {
    const response = await apiClient.get<ResearchItem[]>('/research-items', { params })
    return response.data
  },

  get: async (id: string): Promise<ResearchItem> => {
    const response = await apiClient.get<ResearchItem>(`/research-items/${id}`)
    return response.data
  },

  create: async (data: CreateResearchItemRequest): Promise<ResearchItem> => {
    const response = await apiClient.post<ResearchItem>('/research-items', data)
    return response.data
  },

  update: async (id: string, data: UpdateResearchItemRequest): Promise<ResearchItem> => {
    const response = await apiClient.put<ResearchItem>(`/research-items/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/research-items/${id}`)
    return response.data
  },

  // Research execution
  execute: async (id: string): Promise<ResearchExecuteResponse> => {
    const response = await apiClient.post<ResearchExecuteResponse>(`/research-items/${id}/execute`)
    return response.data
  },

  complete: async (id: string, summary?: string): Promise<ResearchItem> => {
    const response = await apiClient.post<ResearchItem>(`/research-items/${id}/complete`, null, {
      params: { summary: summary || '' },
    })
    return response.data
  },

  // Due items
  listDue: async (): Promise<ResearchItem[]> => {
    const response = await apiClient.get<ResearchItem[]>('/research-items/due/list')
    return response.data
  },

  // Cross-linking
  linkProject: async (itemId: string, projectId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/research-items/${itemId}/link/project`, {
      target_id: projectId,
    } as LinkRequest)
    return response.data
  },

  linkCustomer: async (itemId: string, customerId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/research-items/${itemId}/link/customer`, {
      target_id: customerId,
    } as LinkRequest)
    return response.data
  },

  getProjects: async (itemId: string): Promise<Array<{
    id: string
    name: string
    stage: string
    status: string
    customer_id: string | null
  }>> => {
    const response = await apiClient.get(`/research-items/${itemId}/projects`)
    return response.data
  },

  enhance: async (id: string, directions: string, model_id?: string | null): Promise<ResearchItem> => {
    const response = await apiClient.post<ResearchItem>(`/research-items/${id}/enhance`, {
      directions,
      model_id,
    })
    return response.data
  },

  approve: async (id: string): Promise<ResearchItem> => {
    const response = await apiClient.post<ResearchItem>(`/research-items/${id}/approve`)
    return response.data
  },
}
