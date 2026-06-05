export const RESEARCH_STAGES = [
  'queued',
  'researching',
  'analyzing',
  'review_enhance',
  'completed',
  'archived',
] as const

export type ResearchStage = (typeof RESEARCH_STAGES)[number]

export const RESEARCH_STAGE_LABELS: Record<ResearchStage, string> = {
  queued: 'Queued',
  researching: 'Researching',
  analyzing: 'Analyzing',
  review_enhance: 'Review & Enhance',
  completed: 'Completed',
  archived: 'Archived',
}

export const RESEARCH_STAGE_COLORS: Record<ResearchStage, string> = {
  queued: 'slate',
  researching: 'sky',
  analyzing: 'violet',
  review_enhance: 'amber',
  completed: 'emerald',
  archived: 'zinc',
}

export const SEARCH_ENGINES = [
  'perplexity',
  'valyu',
  'tavily',
  'newsapi',
  'brave',
  'finnhub',
  'fred',
  'huggingface',
  'eia',
  'hybrid',
] as const

export type SearchEngine = (typeof SEARCH_ENGINES)[number]

export const ENGINE_LABELS: Record<SearchEngine, string> = {
  perplexity: 'Perplexity Pro',
  valyu: 'Valyu Intelligence',
  tavily: 'Tavily Search',
  newsapi: 'News API',
  brave: 'Brave Search',
  finnhub: 'Finnhub Markets',
  fred: 'FRED Economics',
  huggingface: 'Hugging Face',
  eia: 'EIA.gov Energy',
  hybrid: 'Hybrid (Multi-Engine)',
}

export const ENGINE_COLORS: Record<SearchEngine, string> = {
  perplexity: 'emerald',
  valyu: 'sky',
  tavily: 'amber',
  newsapi: 'rose',
  brave: 'orange',
  finnhub: 'cyan',
  fred: 'indigo',
  huggingface: 'yellow',
  eia: 'teal',
  hybrid: 'violet',
}

export const RESEARCH_INTERVALS = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
] as const

export type ResearchInterval = (typeof RESEARCH_INTERVALS)[number]

export const INTERVAL_LABELS: Record<ResearchInterval, string> = {
  hourly: 'Every Hour',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}
