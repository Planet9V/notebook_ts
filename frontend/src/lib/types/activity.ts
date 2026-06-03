export interface Activity {
  id: string
  customer_id: string
  activity_type: string
  description: string
  metadata: Record<string, unknown>
  actor: string
  created: string
  updated: string
}

export interface ActivityCreate {
  customer_id: string
  activity_type: string
  description: string
  metadata?: Record<string, unknown>
  actor?: string
}
