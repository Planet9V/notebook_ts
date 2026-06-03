export interface ImportPreviewResponse {
  file_name: string
  total_rows: number
  columns: string[]
  sample_rows: string[][]
  suggested_mapping: Record<string, string>
  available_customer_fields: string[]
  available_contact_fields: string[]
}

export interface ImportOptions {
  create_notebooks: boolean
  notebook_stage: string
  default_customer_type: string
  default_tier: string
  default_lead_source: string
  duplicate_strategy: 'skip' | 'update' | 'create'
  tags: string[]
}

export interface ImportExecuteRequest {
  file_name: string
  column_mapping: Record<string, string>
  options: ImportOptions
}

export interface ImportErrorDetail {
  row: number
  field: string | null
  error: string
  data: Record<string, string> | null
}

export interface ImportWarningDetail {
  row: number
  field: string | null
  warning: string
  data: Record<string, string> | null
}

export interface ImportResultResponse {
  batch_id: string
  total_rows: number
  customers_created: number
  customers_updated: number
  customers_skipped: number
  contacts_created: number
  notebooks_created: number
  errors: ImportErrorDetail[]
  warnings: ImportWarningDetail[]
}
