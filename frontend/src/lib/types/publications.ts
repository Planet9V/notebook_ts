export interface EmailSettings {
  id?: string
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password?: string | null
  use_tls: boolean
  oauth_provider: string | null
  oauth_token_ref: string | null
  created?: string
  updated?: string
}

export interface ScheduledPost {
  id: string
  channel: 'linkedin' | 'twitter' | 'email'
  title: string
  content: string
  media_urls: string[]
  scheduled_time: string
  status: 'draft' | 'queued' | 'published' | 'failed'
  error_message?: string | null
  views: number
  clicks: number
  interactions: number
  created: string
  updated: string
}

export interface ScheduledPostCreate {
  channel: 'linkedin' | 'twitter' | 'email'
  title: string
  content: string
  media_urls?: string[]
  scheduled_time: string
  status?: 'draft' | 'queued' | 'published' | 'failed'
}

export interface ScheduledPostUpdate {
  channel?: 'linkedin' | 'twitter' | 'email'
  title?: string
  content?: string
  media_urls?: string[]
  scheduled_time?: string
  status?: 'draft' | 'queued' | 'published' | 'failed'
}

export interface PublicationMetrics {
  total_views: number
  total_clicks: number
  total_interactions: number
  ctr: number
  by_channel: {
    [channel: string]: {
      views: number
      clicks: number
      interactions: number
    }
  }
}

export interface PublicationMetricsHistoryEntry {
  id: string
  scheduled_post: string
  channel: string
  views: number
  clicks: number
  interactions: number
  timestamp: string
}
