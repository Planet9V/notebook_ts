export const PIPELINE_STAGES = [
  'bulk_import',
  'data_enrichment',
  'lead',
  'research',
  'technical_discovery',
  'proposal',
  'won',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const STAGE_LABELS: Record<PipelineStage, string> = {
  bulk_import: 'Bulk Import',
  data_enrichment: 'Data Enrichment',
  lead: 'Lead',
  research: 'Research',
  technical_discovery: 'Technical Discovery',
  proposal: 'Proposal',
  won: 'Won',
}

export const STAGE_COMPLIANCE: Record<PipelineStage, number> = {
  bulk_import: 0.0,
  data_enrichment: 5.0,
  lead: 15.0,
  research: 45.0,
  technical_discovery: 60.0,
  proposal: 75.0,
  won: 100.0,
}
