import apiClient from './client'
import { Activity, ActivityCreate } from '../types/activity'

export const activitiesApi = {
  list: async (customerId: string, params?: { limit?: number; offset?: number; activity_type?: string }): Promise<Activity[]> => {
    const response = await apiClient.get<Activity[]>('/activities', {
      params: { customer_id: customerId, ...params }
    })
    return response.data
  },

  create: async (data: ActivityCreate): Promise<Activity> => {
    const response = await apiClient.post<Activity>('/activities', data)
    return response.data
  },

  getTypes: async (): Promise<{ types: string[] }> => {
    const response = await apiClient.get<{ types: string[] }>('/activities/types')
    return response.data
  },
}
