import apiClient from './client'

export interface ScheduledSearch {
  id: string
  name: string
  notebook_id: string
  query: string
  engine: string
  interval: string
  is_active: boolean
  last_run: string | null
  next_run: string | null
  run_count: number
  last_error: string | null
  transformation_id: string | null
  save_as_source: boolean
  created: string
  updated: string
}

export interface ScheduledSearchCreate {
  name: string
  notebook_id: string
  query: string
  engine?: string
  interval?: string
  transformation_id?: string
  save_as_source?: boolean
}

export interface ScheduledSearchUpdate {
  name?: string
  query?: string
  engine?: string
  interval?: string
  is_active?: boolean
  transformation_id?: string
  save_as_source?: boolean
}

export const scheduledSearchApi = {
  list: async (notebookId?: string): Promise<ScheduledSearch[]> => {
    const params = notebookId ? { notebook_id: notebookId } : {}
    const response = await apiClient.get<ScheduledSearch[]>('/scheduled-searches', { params })
    return response.data
  },

  get: async (id: string): Promise<ScheduledSearch> => {
    const response = await apiClient.get<ScheduledSearch>(`/scheduled-searches/${id}`)
    return response.data
  },

  create: async (data: ScheduledSearchCreate): Promise<ScheduledSearch> => {
    const response = await apiClient.post<ScheduledSearch>('/scheduled-searches', data)
    return response.data
  },

  update: async (id: string, data: ScheduledSearchUpdate): Promise<ScheduledSearch> => {
    const response = await apiClient.put<ScheduledSearch>(`/scheduled-searches/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/scheduled-searches/${id}`)
    return response.data
  },

  trigger: async (id: string): Promise<{ message: string; result: Record<string, unknown> }> => {
    const response = await apiClient.post<{ message: string; result: Record<string, unknown> }>(`/scheduled-searches/${id}/run`)
    return response.data
  },

  runDue: async (): Promise<{ message: string; results: Record<string, unknown>[] }> => {
    const response = await apiClient.post<{ message: string; results: Record<string, unknown>[] }>('/scheduled-searches/run-due')
    return response.data
  },
}
