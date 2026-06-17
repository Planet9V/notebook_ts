import apiClient from './client'
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '@/lib/types/campaign'

export const campaignsApi = {
  list: async (params?: {
    customer_id?: string
    notebook_id?: string
    status?: string
  }): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>('/campaigns', { params })
    return response.data
  },

  get: async (id: string): Promise<Campaign> => {
    const response = await apiClient.get<Campaign>(`/campaigns/${id}`)
    return response.data
  },

  create: async (data: CreateCampaignRequest): Promise<Campaign> => {
    const response = await apiClient.post<Campaign>('/campaigns', data)
    return response.data
  },

  update: async (id: string, data: UpdateCampaignRequest): Promise<Campaign> => {
    const response = await apiClient.put<Campaign>(`/campaigns/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/campaigns/${id}`)
    return response.data
  },
}
