import apiClient from './client'
import { PipelineRule, PipelineRuleCreate, NotebookScanningStatus } from '../types/pipeline'

export const pipelineApi = {
  listRules: async (): Promise<PipelineRule[]> => {
    const response = await apiClient.get<PipelineRule[]>('/pipeline/rules')
    return response.data
  },

  createRule: async (data: PipelineRuleCreate): Promise<PipelineRule> => {
    const response = await apiClient.post<PipelineRule>('/pipeline/rules', data)
    return response.data
  },

  updateRule: async (id: string, data: PipelineRuleCreate): Promise<PipelineRule> => {
    const response = await apiClient.put<PipelineRule>(`/pipeline/rules/${id}`, data)
    return response.data
  },

  deleteRule: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/pipeline/rules/${id}`)
    return response.data
  },

  getScanningStatus: async (notebookId: string): Promise<NotebookScanningStatus> => {
    const response = await apiClient.get<NotebookScanningStatus>(`/pipeline/status/${notebookId}`)
    return response.data
  },
}
