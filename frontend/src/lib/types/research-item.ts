export interface ResearchItem {
  id: string
  name: string
  query: string
  description: string
  customer_id: string | null
  project_id: string | null
  notebook_id: string | null
  transformation_id: string | null
  location_id?: string | null
  category?: string | null
  stage: string
  status: string
  engine: string
  engines: string[]
  formatting_instructions: string
  model_id: string | null
  interval: string | null
  is_recurring: boolean
  last_run: string | null
  next_run: string | null
  run_count: number
  last_error: string | null
  results_summary: string
  results_content?: string
  save_as_source: boolean
  tags: string[]
  created: string
  updated: string
  is_deep_research?: boolean
  deep_research_state?: string
  deep_research_events?: unknown[]
}

export interface CreateResearchItemRequest {
  name: string
  query: string
  description?: string
  customer_id?: string | null
  project_id?: string | null
  notebook_id?: string | null
  transformation_id?: string | null
  location_id?: string | null
  category?: string | null
  stage?: string
  engine?: string
  engines?: string[]
  formatting_instructions?: string
  model_id?: string | null
  interval?: string | null
  is_recurring?: boolean
  save_as_source?: boolean
  results_content?: string
  tags?: string[]
  is_deep_research?: boolean
  deep_research_state?: string
  deep_research_events?: unknown[]
}

export interface UpdateResearchItemRequest {
  name?: string
  query?: string
  description?: string
  customer_id?: string | null
  project_id?: string | null
  notebook_id?: string | null
  transformation_id?: string | null
  location_id?: string | null
  category?: string | null
  stage?: string
  status?: string
  engine?: string
  engines?: string[]
  formatting_instructions?: string
  model_id?: string | null
  interval?: string | null
  is_recurring?: boolean
  save_as_source?: boolean
  results_summary?: string
  results_content?: string
  tags?: string[]
  is_deep_research?: boolean
  deep_research_state?: string
  deep_research_events?: unknown[]
}

export interface ResearchExecuteResponse {
  id: string
  query: string
  engine: string
  engines: string[]
  formatting_instructions: string
  model_id: string | null
  transformation_id: string | null
  notebook_id: string | null
  save_as_source: boolean
  status: string
  message: string
}
