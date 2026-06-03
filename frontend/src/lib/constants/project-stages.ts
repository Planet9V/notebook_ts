export const PROJECT_STAGES = [
  'planning',
  'kickoff',
  'in_progress',
  'review',
  'delivered',
  'closed',
] as const

export type ProjectStage = (typeof PROJECT_STAGES)[number]

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  planning: 'Planning',
  kickoff: 'Kickoff',
  in_progress: 'In Progress',
  review: 'Review',
  delivered: 'Delivered',
  closed: 'Closed',
}

export const PROJECT_STAGE_COLORS: Record<ProjectStage, string> = {
  planning: 'slate',
  kickoff: 'sky',
  in_progress: 'amber',
  review: 'violet',
  delivered: 'emerald',
  closed: 'zinc',
}

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number]

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'slate',
  medium: 'sky',
  high: 'amber',
  critical: 'rose',
}
