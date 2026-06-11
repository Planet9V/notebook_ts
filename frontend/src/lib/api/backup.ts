import apiClient from './client'

export interface BackupRecord {
  id: string
  filename: string
  file_path: string
  size: number
  backup_type: 'manual' | 'scheduled'
  created_at: string
}

export interface BackupSchedule {
  id: string
  name: string
  cron_expression: string
  enabled: boolean
  last_run_at: string | null
  created_at: string
}

export interface BackupScheduleCreate {
  name: string
  cron_expression: string
  enabled?: boolean
}

export interface BackupScheduleUpdate {
  name?: string
  cron_expression?: string
  enabled?: boolean
}

export const backupApi = {
  list: async (): Promise<BackupRecord[]> => {
    const response = await apiClient.get<BackupRecord[]>('/backup/list')
    return response.data
  },

  create: async (): Promise<{ message: string; backup: BackupRecord }> => {
    const response = await apiClient.post<{ message: string; backup: BackupRecord }>('/backup/create')
    return response.data
  },

  download: async (filename: string): Promise<void> => {
    const response = await apiClient.get(`/backup/download/${filename}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/backup/${id}`)
    return response.data
  },

  restore: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/backup/restore/${id}`)
    return response.data
  },

  uploadRestore: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<{ message: string }>('/backup/upload-restore', formData)
    return response.data
  },

  listSchedules: async (): Promise<BackupSchedule[]> => {
    const response = await apiClient.get<BackupSchedule[]>('/backup/schedules')
    return response.data
  },

  createSchedule: async (data: BackupScheduleCreate): Promise<BackupSchedule> => {
    const response = await apiClient.post<BackupSchedule>('/backup/schedules', data)
    return response.data
  },

  updateSchedule: async (id: string, data: BackupScheduleUpdate): Promise<BackupSchedule> => {
    const response = await apiClient.put<BackupSchedule>(`/backup/schedules/${id}`, data)
    return response.data
  },

  deleteSchedule: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/backup/schedules/${id}`)
    return response.data
  },
}
