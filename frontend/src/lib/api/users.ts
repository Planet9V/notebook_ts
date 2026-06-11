import apiClient from './client'
import { User } from '../types/api'

export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/auth/users')
    return response.data
  },
  create: async (data: Omit<User, 'id'>): Promise<User> => {
    const response = await apiClient.post<User>('/auth/users', data)
    return response.data
  },
  update: async (id: string, data: Partial<Omit<User, 'id' | 'username'>>): Promise<User> => {
    const response = await apiClient.put<User>(`/auth/users/${id}`, data)
    return response.data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/auth/users/${id}`)
    return response.data
  }
}
