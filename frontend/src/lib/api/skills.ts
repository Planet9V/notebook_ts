import apiClient from './client'
import {
  DiscoveredSkill,
  SkillCreate,
  SkillUpdate,
  McpServer,
} from '../types/skills'

export const skillsApi = {
  list: async (): Promise<DiscoveredSkill[]> => {
    const response = await apiClient.get<DiscoveredSkill[]>('/skills')
    return response.data
  },

  create: async (data: SkillCreate): Promise<DiscoveredSkill> => {
    const response = await apiClient.post<DiscoveredSkill>('/skills', data)
    return response.data
  },

  update: async (id: string, data: SkillUpdate): Promise<DiscoveredSkill> => {
    const response = await apiClient.put<DiscoveredSkill>(`/skills/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/skills/${id}`)
    return response.data
  },

  listMcp: async (): Promise<McpServer[]> => {
    const response = await apiClient.get<McpServer[]>('/mcp')
    return response.data
  },
}
