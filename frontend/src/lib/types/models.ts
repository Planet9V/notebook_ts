export interface Model {
  id: string
  name: string
  provider: string
  type: string
  credential?: string | null
  context_length?: number | null
  max_completion_tokens?: number | null
  pricing_prompt?: string | null
  pricing_completion?: string | null
  pricing_image?: string | null
  pricing_audio?: string | null
  pricing_web_search?: string | null
  pricing_internal_reasoning?: string | null
  pricing_input_cache_read?: string | null
  pricing_input_cache_write?: string | null
  modality?: string | null
  input_modalities?: string[] | null
  output_modalities?: string[] | null
  description?: string | null
  tokenizer?: string | null
  instruct_type?: string | null
  hugging_face_id?: string | null
  canonical_slug?: string | null
  knowledge_cutoff?: string | null
  expiration_date?: string | null
  supported_parameters?: string[] | null
  is_moderated?: boolean | null
  provider_context_length?: number | null
  openrouter_created_at?: number | null
  last_synced_at?: string | null
  created: string
  updated: string
}

export interface CreateModelRequest {
  name: string
  provider: string
  type: string
  credential?: string
  context_length?: number
  max_completion_tokens?: number
  pricing_prompt?: string
  pricing_completion?: string
  pricing_image?: string
  pricing_audio?: string
  pricing_web_search?: string
  pricing_internal_reasoning?: string
  pricing_input_cache_read?: string
  pricing_input_cache_write?: string
  modality?: string
  input_modalities?: string[]
  output_modalities?: string[]
  description?: string
  tokenizer?: string
  instruct_type?: string
  hugging_face_id?: string
  canonical_slug?: string
  knowledge_cutoff?: string
  expiration_date?: string
  supported_parameters?: string[]
  is_moderated?: boolean
  provider_context_length?: number
}

export interface ModelDefaults {
  default_chat_model?: string | null
  default_transformation_model?: string | null
  large_context_model?: string | null
  default_text_to_speech_model?: string | null
  default_speech_to_text_model?: string | null
  default_embedding_model?: string | null
  default_tools_model?: string | null
  default_reranker_model?: string | null
}

export interface ProviderAvailability {
  available: string[]
  unavailable: string[]
  supported_types: Record<string, string[]>
}

// Model Discovery Types
export interface DiscoveredModel {
  name: string
  provider: string
  model_type: string
  description?: string
  context_length?: number
  pricing_prompt?: string
  pricing_completion?: string
  modality?: string
  input_modalities?: string[]
  output_modalities?: string[]
  tokenizer?: string
  knowledge_cutoff?: string
  hugging_face_id?: string
}

export interface ProviderSyncResult {
  provider: string
  discovered: number
  new: number
  existing: number
}

export interface AllProvidersSyncResult {
  results: Record<string, ProviderSyncResult>
  total_discovered: number
  total_new: number
}

export interface ProviderModelCount {
  provider: string
  counts: Record<string, number>
  total: number
}

export interface AutoAssignResult {
  assigned: Record<string, string>  // slot_name -> model_id
  skipped: string[]  // slots already assigned
  missing: string[]  // slots with no available models
}

export interface ModelTestResult {
  success: boolean
  message: string
  details?: string
}

export interface SyncStatus {
  provider: string
  last_sync?: string | null
  models_synced?: number | null
  models_updated?: number | null
  models_added?: number | null
  next_sync?: string | null
}