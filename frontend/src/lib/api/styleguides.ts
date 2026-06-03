import apiClient from './client'
import { StyleGuide, StyleGuideCreate, StyleGuideUpdate } from '@/lib/types/styleguide'

export const styleguidesApi = {
  getAll: async () => {
    const response = await apiClient.get<StyleGuide[]>('/styleguides')
    return response.data
  },

  get: async (id: string) => {
    const response = await apiClient.get<StyleGuide>(`/styleguides/${id}`)
    return response.data
  },

  create: async (data: StyleGuideCreate) => {
    const response = await apiClient.post<StyleGuide>('/styleguides', data)
    return response.data
  },

  update: async (id: string, data: StyleGuideUpdate) => {
    const response = await apiClient.put<StyleGuide>(`/styleguides/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/styleguides/${id}`)
  },
}
