import apiClient from './client'
import { Contact, ContactCreate, ContactUpdate } from '../types/contact'

export const contactsApi = {
  list: async (params?: { customer_id?: string; status?: string }): Promise<Contact[]> => {
    const response = await apiClient.get<Contact[]>('/contacts', { params })
    return response.data
  },

  get: async (id: string): Promise<Contact> => {
    const response = await apiClient.get<Contact>(`/contacts/${id}`)
    return response.data
  },

  create: async (data: ContactCreate): Promise<Contact> => {
    const response = await apiClient.post<Contact>('/contacts', data)
    return response.data
  },

  update: async (id: string, data: ContactUpdate): Promise<Contact> => {
    const response = await apiClient.put<Contact>(`/contacts/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/contacts/${id}`)
    return response.data
  },

  listByCustomer: async (customerId: string): Promise<Contact[]> => {
    const response = await apiClient.get<Contact[]>(`/customers/${customerId}/contacts`)
    return response.data
  },
}
