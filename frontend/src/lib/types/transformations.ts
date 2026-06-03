export interface Transformation {
  id: string
  name: string
  title: string
  description: string
  prompt: string
  apply_default: boolean
  category: 'transformation' | 'gtm_research'
  search_engine?: string
  search_model_id?: string
  color_tag?: string
  target_context?: string
  created: string
  updated: string
}

export interface CreateTransformationRequest {
  name: string
  title: string
  description: string
  prompt: string
  apply_default?: boolean
  category?: string
  search_engine?: string
  search_model_id?: string
  color_tag?: string
  target_context?: string
}

export interface UpdateTransformationRequest {
  name?: string
  title?: string
  description?: string
  prompt?: string
  apply_default?: boolean
  category?: string
  search_engine?: string
  search_model_id?: string
  color_tag?: string
  target_context?: string
}

export interface ExecuteTransformationRequest {
  transformation_id: string
  input_text: string
  model_id: string
}

export interface ExecuteTransformationResponse {
  output: string
  transformation_id: string
  model_id: string
}

export interface DefaultPrompt {
  transformation_instructions: string
}