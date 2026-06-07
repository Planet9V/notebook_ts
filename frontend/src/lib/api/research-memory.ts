import apiClient from './client'

// Response types (co-located, following scheduled-search.ts pattern)
export interface ResearchMemoryStats {
  total_documents: number
  source_types: Record<string, number>
  oldest: string | null
  newest: string | null
  table_size: string
}

export interface ResearchMemoryDocument {
  id: string
  query: string
  title: string
  url: string | null
  content: string
  source_type: string
  score: number | null
  similarity?: number
  created_at: string
}

export interface ResearchMemorySearchResponse {
  results: ResearchMemoryDocument[]
  total: number
}

export interface ResearchMemoryBrowseResponse {
  results: ResearchMemoryDocument[]
  total: number
  page: number
}

export interface ResearchMemorySearchRequest {
  query: string
  limit?: number
  source_type?: string
}

export const researchMemoryApi = {
  stats: async (): Promise<ResearchMemoryStats> => {
    const response = await apiClient.get<ResearchMemoryStats>('/research-memory/stats')
    return response.data
  },

  search: async (params: ResearchMemorySearchRequest): Promise<ResearchMemorySearchResponse> => {
    const response = await apiClient.post<ResearchMemorySearchResponse>('/research-memory/search', params)
    return response.data
  },

  browse: async (params?: {
    page?: number
    limit?: number
    source_type?: string
  }): Promise<ResearchMemoryBrowseResponse> => {
    const response = await apiClient.get<ResearchMemoryBrowseResponse>('/research-memory/browse', { params })
    return response.data
  },
}
