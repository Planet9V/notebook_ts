import apiClient from './client'
import {
  AgentConfig,
  AgentConfigCreate,
  AgentConfigUpdate,
  AgentExecution,
  AgentLog,
} from '../types/agents'

export const agentsApi = {
  list: async (): Promise<AgentConfig[]> => {
    const response = await apiClient.get<AgentConfig[]>('/agents')
    return response.data
  },

  get: async (agentId: string): Promise<AgentConfig> => {
    const response = await apiClient.get<AgentConfig>(`/agents/${agentId}`)
    return response.data
  },

  create: async (data: AgentConfigCreate): Promise<AgentConfig> => {
    const response = await apiClient.post<AgentConfig>('/agents', data)
    return response.data
  },

  update: async (agentId: string, data: AgentConfigUpdate): Promise<AgentConfig> => {
    const response = await apiClient.put<AgentConfig>(`/agents/${agentId}`, data)
    return response.data
  },

  delete: async (agentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/agents/${agentId}`)
    return response.data
  },

  listExecutions: async (agentId: string): Promise<AgentExecution[]> => {
    const response = await apiClient.get<AgentExecution[]>(`/agents/${agentId}/executions`)
    return response.data
  },

  listLogs: async (executionId: string): Promise<AgentLog[]> => {
    const response = await apiClient.get<AgentLog[]>(`/agents/executions/${executionId}/logs`)
    return response.data
  },
}
