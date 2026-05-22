export interface PipelineRule {
  id: string
  stage: string
  action_type: 'crawl' | 'search'
  prompt: string
  query_template: string
  model_override: string | null
  is_active: boolean
  created: string
  updated: string
}

export interface PipelineRuleCreate {
  stage: string
  action_type: 'crawl' | 'search'
  prompt: string
  query_template?: string
  model_override?: string | null
  is_active: boolean
}

export interface NotebookScanningStatus {
  scanning: boolean
}
