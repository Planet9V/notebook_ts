import apiClient from './client'
import { Location, LocationCreate, LocationUpdate } from '../types/location'

export const locationsApi = {
  list: async (params?: { customer_id?: string }): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>('/locations', { params })
    return response.data
  },

  get: async (id: string): Promise<Location> => {
    const response = await apiClient.get<Location>(`/locations/${id}`)
    return response.data
  },

  create: async (data: LocationCreate): Promise<Location> => {
    const response = await apiClient.post<Location>('/locations', data)
    return response.data
  },

  update: async (id: string, data: LocationUpdate): Promise<Location> => {
    const response = await apiClient.put<Location>(`/locations/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/locations/${id}`)
    return response.data
  },

  listByCustomer: async (customerId: string): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>(`/customers/${customerId}/locations`)
    return response.data
  },
}
