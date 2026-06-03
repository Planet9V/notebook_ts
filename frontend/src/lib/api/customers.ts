import apiClient from './client'
import { CustomerMetrics, CustomerCreate, CustomerUpdate } from '../types/customer'
import { ImportPreviewResponse, ImportExecuteRequest, ImportResultResponse } from '../types/import'

export const customersApi = {
  list: async (): Promise<CustomerMetrics[]> => {
    const response = await apiClient.get<CustomerMetrics[]>('/customers')
    return response.data
  },

  get: async (id: string): Promise<CustomerMetrics> => {
    const response = await apiClient.get<CustomerMetrics>(`/customers/${id}`)
    return response.data
  },

  create: async (data: CustomerCreate): Promise<CustomerMetrics> => {
    const response = await apiClient.post<CustomerMetrics>('/customers', data)
    return response.data
  },

  update: async (id: string, data: CustomerUpdate): Promise<CustomerMetrics> => {
    const response = await apiClient.put<CustomerMetrics>(`/customers/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/customers/${id}`)
    return response.data
  },

  moveStage: async (id: string, stage: string): Promise<CustomerMetrics> => {
    const response = await apiClient.put<CustomerMetrics>(`/customers/${id}/stage`, { stage })
    return response.data
  },

  // ── Import / Export ──────────────────────────────────────────────────

  importPreview: async (file: File): Promise<ImportPreviewResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportPreviewResponse>(
      '/customers/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  importExecute: async (file: File, request: ImportExecuteRequest): Promise<ImportResultResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('import_config', JSON.stringify(request))
    const response = await apiClient.post<ImportResultResponse>(
      '/customers/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  exportCustomers: async (format: 'csv' | 'xlsx' = 'csv', includeContacts = false): Promise<Blob> => {
    const response = await apiClient.get('/customers/export', {
      params: { format, include_contacts: includeContacts },
      responseType: 'blob',
    })
    return response.data
  },

  exportContacts: async (format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> => {
    const response = await apiClient.get('/contacts/export', {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },
}

