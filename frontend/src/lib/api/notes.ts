import apiClient from './client'
import { NoteResponse, CreateNoteRequest, UpdateNoteRequest, CustomerNotesRollup, NotificationResponse } from '@/lib/types/api'

export interface Tag {
  id: string
  name: string
  category_type?: string
}

export interface NodeLayout {
  id: string
  node_id: string
  x: number
  y: number
  view_type: string
}

export const notesApi = {
  list: async (params?: { notebook_id?: string }) => {
    const response = await apiClient.get<NoteResponse[]>('/notes', { params })
    return response.data
  },

  get: async (id: string) => {
    const response = await apiClient.get<NoteResponse>(`/notes/${id}`)
    return response.data
  },

  create: async (data: CreateNoteRequest) => {
    const response = await apiClient.post<NoteResponse>('/notes', data)
    return response.data
  },

  update: async (id: string, data: UpdateNoteRequest) => {
    const response = await apiClient.put<NoteResponse>(`/notes/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/notes/${id}`)
  },

  // Entity Notes — Location
  listByLocation: async (locationId: string) => {
    const response = await apiClient.get<NoteResponse[]>(`/locations/${locationId}/notes`)
    return response.data
  },

  createForLocation: async (locationId: string, data: CreateNoteRequest) => {
    const response = await apiClient.post<NoteResponse>(`/locations/${locationId}/notes`, data)
    return response.data
  },

  // Entity Notes — Customer
  listByCustomer: async (customerId: string) => {
    const response = await apiClient.get<NoteResponse[]>(`/customers/${customerId}/notes`)
    return response.data
  },

  createForCustomer: async (customerId: string, data: CreateNoteRequest) => {
    const response = await apiClient.post<NoteResponse>(`/customers/${customerId}/notes`, data)
    return response.data
  },

  // Entity Notes — Customer Rollup
  getCustomerNotesRollup: async (customerId: string) => {
    const response = await apiClient.get<CustomerNotesRollup>(`/customers/${customerId}/notes-rollup`)
    return response.data
  },

  // Detach (remove edge only)
  detachFromLocation: async (locationId: string, noteId: string) => {
    await apiClient.delete(`/locations/${locationId}/notes/${noteId}`)
  },

  detachFromCustomer: async (customerId: string, noteId: string) => {
    await apiClient.delete(`/customers/${customerId}/notes/${noteId}`)
  },

  // Entity Links (Graph Relations)
  getLinks: async (notebookId?: string) => {
    const response = await apiClient.get<Array<{
      id: string
      in: string
      out: string
      link_type: string
      created: string
    }>>('/notes/links', { params: { notebook_id: notebookId } })
    return response.data
  },

  createLink: async (sourceId: string, targetId: string, linkType = 'references') => {
    const response = await apiClient.post('/notes/links', {
      source_id: sourceId,
      target_id: targetId,
      link_type: linkType
    })
    return response.data
  },

  deleteLink: async (linkId: string) => {
    await apiClient.delete(`/notes/links/${linkId}`)
  },

  getSuggestedLinks: async (notebookId: string) => {
    const response = await apiClient.get<Array<{
      source_id: string
      target_id: string
      reason: string
      link_type: string
    }>>('/notes/suggested-links', { params: { notebook_id: notebookId } })
    return response.data
  },

  getNotifications: async (userId?: string) => {
    const response = await apiClient.get<NotificationResponse[]>('/notifications', { params: { user_id: userId } })
    return response.data
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await apiClient.put<{ success: boolean }>(`/notifications/${notificationId}/read`)
    return response.data
  },

  listTags: async () => {
    const response = await apiClient.get<Tag[]>('/tags')
    return response.data
  },

  createTag: async (data: { name: string; category_type?: string }) => {
    const response = await apiClient.post<Tag>('/tags', data)
    return response.data
  },

  deleteTag: async (tagId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/tags/${tagId}`)
    return response.data
  },

  linkTag: async (noteId: string, tagId: string) => {
    const response = await apiClient.post<{ success: boolean }>(`/notes/${noteId}/tags/${tagId}`)
    return response.data
  },

  unlinkTag: async (noteId: string, tagId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/notes/${noteId}/tags/${tagId}`)
    return response.data
  },

  getNoteTags: async (noteId: string) => {
    const response = await apiClient.get<Tag[]>(`/notes/${noteId}/tags`)
    return response.data
  },

  getNodeLayouts: async (viewType: string) => {
    const response = await apiClient.get<NodeLayout[]>(`/node-layout/${viewType}`)
    return response.data
  },

  saveNodeLayout: async (data: { node_id: string; x: number; y: number; view_type: string }) => {
    const response = await apiClient.post<NodeLayout>('/node-layout', data)
    return response.data
  },
}