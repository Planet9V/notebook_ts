export const PIPELINE_TYPES = ['sales', 'research', 'publication'] as const
export type PipelineType = (typeof PIPELINE_TYPES)[number]

export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  sales: 'Sales Pipeline',
  research: 'Research Pipeline',
  publication: 'Publication Queue',
}

export interface PipelineColumnConfig {
  stages: string[]
  titles: Record<string, string>
  colors: Record<string, { colorClass: string; borderClass: string; badgeClass: string; textClass?: string }>
  emptyMsgs: Record<string, string>
}

export const PIPELINE_COLUMNS: Record<PipelineType, PipelineColumnConfig> = {
  sales: {
    stages: ['bulk_import', 'data_enrichment', 'lead', 'research', 'technical_discovery', 'proposal', 'won'],
    titles: {
      bulk_import: 'Import Staging',
      data_enrichment: 'Data Enrichment',
      lead: 'Leads Prospecting',
      research: 'Client Research',
      technical_discovery: 'Technical Discovery',
      proposal: 'Proposal Drafts',
      won: 'Contract Won',
    },
    colors: {
      bulk_import: {
        colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        borderClass: 'border-t-slate-500',
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        textClass: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
      },
      data_enrichment: {
        colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        borderClass: 'border-t-indigo-500',
        badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        textClass: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      },
      lead: {
        colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        borderClass: 'border-t-cyan-500',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        textClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      },
      research: {
        colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        borderClass: 'border-t-sky-500',
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        textClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      },
      technical_discovery: {
        colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
        borderClass: 'border-t-amber-500',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        textClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      },
      proposal: {
        colorClass: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
        borderClass: 'border-t-violet-500',
        badgeClass: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
        textClass: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
      },
      won: {
        colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        borderClass: 'border-t-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        textClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      },
    },
    emptyMsgs: {
      bulk_import: 'No imported records',
      data_enrichment: 'No records enriching',
      lead: 'No active dossiers',
      research: 'No active dossiers',
      technical_discovery: 'No active dossiers',
      proposal: 'No active dossiers',
      won: 'No active dossiers',
    },
  },
  research: {
    stages: ['queued', 'researching', 'analyzing', 'completed', 'archived'],
    titles: {
      queued: 'Queued Research',
      researching: 'Researching',
      analyzing: 'Analyzing',
      completed: 'Completed',
      archived: 'Archived',
    },
    colors: {
      queued: {
        colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        borderClass: 'border-t-slate-500',
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        textClass: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
      },
      researching: {
        colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        borderClass: 'border-t-sky-500',
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        textClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      },
      analyzing: {
        colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
        borderClass: 'border-t-amber-500',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        textClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      },
      completed: {
        colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        borderClass: 'border-t-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        textClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      },
      archived: {
        colorClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
        borderClass: 'border-t-zinc-500',
        badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        textClass: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
      },
    },
    emptyMsgs: {
      queued: 'No queued research tasks',
      researching: 'No active research',
      analyzing: 'No analysis in progress',
      completed: 'No completed tasks',
      archived: 'No archived tasks',
    },
  },
  publication: {
    stages: ['concept', 'refinement', 'publication_type', 'review', 'publish', 'track'],
    titles: {
      concept: 'Concept Outline',
      refinement: 'Draft Refinement',
      publication_type: 'Publication Type',
      review: 'Editorial Review',
      publish: 'Published Docs',
      track: 'Post Analytics',
    },
    colors: {
      concept: {
        colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        borderClass: 'border-t-slate-500',
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        textClass: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
      },
      refinement: {
        colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        borderClass: 'border-t-sky-500',
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        textClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      },
      publication_type: {
        colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        borderClass: 'border-t-orange-500',
        badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        textClass: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      },
      review: {
        colorClass: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
        borderClass: 'border-t-violet-500',
        badgeClass: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
        textClass: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
      },
      publish: {
        colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        borderClass: 'border-t-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        textClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      },
      track: {
        colorClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
        borderClass: 'border-t-teal-500',
        badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        textClass: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
      },
    },
    emptyMsgs: {
      concept: 'No concept drafts',
      refinement: 'No refined drafts',
      publication_type: 'No type templates',
      review: 'No items in review',
      publish: 'No items published',
      track: 'No tracking posts',
    },
  },
}
