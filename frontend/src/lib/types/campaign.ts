export interface Campaign {
  id: string
  name: string
  description?: string
  theme?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  start_date?: string
  end_date?: string
  target_audience?: string
  channels: string[]
  customer_id?: string
  notebook_id?: string
  created: string
  updated: string
}

export interface CreateCampaignRequest {
  name: string
  description?: string
  theme?: string
  status?: string
  start_date?: string
  end_date?: string
  target_audience?: string
  channels?: string[]
  customer_id?: string
  notebook_id?: string
}

export interface UpdateCampaignRequest {
  name?: string
  description?: string
  theme?: string
  status?: string
  start_date?: string
  end_date?: string
  target_audience?: string
  channels?: string[]
  customer_id?: string
  notebook_id?: string
}
