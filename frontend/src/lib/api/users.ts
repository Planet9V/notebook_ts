import apiClient from './client'
import { User } from '../types/api'

export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/auth/users')
    return response.data
  },
}
