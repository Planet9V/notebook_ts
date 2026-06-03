import apiClient from './client'
import {
  EmailSettings,
  ScheduledPost,
  ScheduledPostCreate,
  ScheduledPostUpdate,
  PublicationMetrics,
  PublicationMetricsHistoryEntry,
} from '../types/publications'

export const publicationsApi = {
  getSettings: async (): Promise<EmailSettings> => {
    const response = await apiClient.get<EmailSettings>('/publications/settings')
    return response.data
  },

  updateSettings: async (data: EmailSettings): Promise<EmailSettings> => {
    const response = await apiClient.post<EmailSettings>('/publications/settings', data)
    return response.data
  },

  testSettings: async (data: EmailSettings): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post<{ status: string; message: string }>('/publications/settings/test', data)
    return response.data
  },

  getCalendar: async (startDate?: string, endDate?: string): Promise<ScheduledPost[]> => {
    const params: Record<string, string> = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const response = await apiClient.get<ScheduledPost[]>('/publications/calendar', { params })
    return response.data
  },

  schedulePost: async (data: ScheduledPostCreate): Promise<ScheduledPost> => {
    const response = await apiClient.post<ScheduledPost>('/publications/schedule', data)
    return response.data
  },

  updatePost: async (id: string, data: ScheduledPostUpdate): Promise<ScheduledPost> => {
    const response = await apiClient.put<ScheduledPost>(`/publications/schedule/${id}`, data)
    return response.data
  },

  deletePost: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete<{ status: string; message: string }>(`/publications/schedule/${id}`)
    return response.data
  },

  getMetrics: async (): Promise<PublicationMetrics> => {
    const response = await apiClient.get<PublicationMetrics>('/publications/metrics')
    return response.data
  },

  getMetricsHistory: async (): Promise<PublicationMetricsHistoryEntry[]> => {
    const response = await apiClient.get<PublicationMetricsHistoryEntry[]>('/publications/metrics/history')
    return response.data
  },
}

